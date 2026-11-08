import { Inject, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { and, count, desc, eq, type SQL } from 'drizzle-orm';
import {
  accounts, bankAccounts, bankTransactions, customerPaymentAllocations, customerPayments, customers, Db, invoices, Tx, withTenant,
} from '@ddotsinvoice/db';
import * as M from '@ddotsinvoice/money';
import { AccessTokenPayload } from '@ddotsinvoice/shared';
import { DB } from '../../infra/drizzle.module';
import { requireCompany, requireTenant } from '../../common/tenant';
import { nextNumber, openFyFor } from '../../modules/accounting/accounting.util';
import { postJournal, reverseJournal } from '../../modules/accounting/journal-posting';
import { ensureAccount } from '../../purchasing/purchasing.util';
import { insertBankTx } from '../bank-transactions/bank-tx.core';
import { CreateCustomerPaymentDto, CustomerPaymentQueryDto } from './cp.dto';

const OPEN = ['posted', 'partially_paid', 'overdue'] as const;

@Injectable()
export class CustomerPaymentsService {
  constructor(@Inject(DB) private readonly db: Db) {}

  private scope(actor: AccessTokenPayload) {
    return { tenantId: requireTenant(actor.tenantId), companyId: requireCompany(actor.companyId) };
  }

  private async find(tx: Tx, companyId: string, id: string) {
    const [p] = await tx.select().from(customerPayments).where(and(eq(customerPayments.id, id), eq(customerPayments.companyId, companyId))).limit(1);
    if (!p) throw new NotFoundException('Payment not found');
    return p;
  }

  private async allocations(tx: Tx, paymentId: string) {
    return tx.select().from(customerPaymentAllocations).where(eq(customerPaymentAllocations.paymentId, paymentId));
  }

  private async load(tx: Tx, companyId: string, id: string) {
    const p = await this.find(tx, companyId, id);
    const allocs = await tx
      .select({ id: customerPaymentAllocations.id, invoiceId: customerPaymentAllocations.invoiceId, allocatedAmount: customerPaymentAllocations.allocatedAmount, invoiceNumber: invoices.number, invoiceTotal: invoices.total })
      .from(customerPaymentAllocations)
      .innerJoin(invoices, eq(invoices.id, customerPaymentAllocations.invoiceId))
      .where(eq(customerPaymentAllocations.paymentId, id));
    return { ...p, allocations: allocs };
  }

  private async invoiceFor(tx: Tx, companyId: string, id: string) {
    const [inv] = await tx.select().from(invoices).where(and(eq(invoices.id, id), eq(invoices.companyId, companyId), eq(invoices.type, 'invoice'))).limit(1);
    if (!inv) throw new NotFoundException('Invoice not found');
    return inv;
  }

  async list(actor: AccessTokenPayload, q: CustomerPaymentQueryDto) {
    const { tenantId, companyId } = this.scope(actor);
    const conds: SQL[] = [eq(customerPayments.companyId, companyId)];
    if (q.status) conds.push(eq(customerPayments.status, q.status as 'draft' | 'posted' | 'reconciled' | 'voided'));
    const where = and(...conds);
    return withTenant(this.db, tenantId, async (tx) => {
      const items = await tx.select().from(customerPayments).where(where).orderBy(desc(customerPayments.date)).limit(q.limit).offset((q.page - 1) * q.limit);
      const [{ total }] = await tx.select({ total: count() }).from(customerPayments).where(where);
      return { items, total, page: q.page, limit: q.limit };
    });
  }

  findOne(actor: AccessTokenPayload, id: string) {
    const { tenantId, companyId } = this.scope(actor);
    return withTenant(this.db, tenantId, (tx) => this.load(tx, companyId, id));
  }

  create(actor: AccessTokenPayload, dto: CreateCustomerPaymentDto) {
    const { tenantId, companyId } = this.scope(actor);
    return withTenant(this.db, tenantId, async (tx) => {
      const [cust] = await tx.select().from(customers).where(and(eq(customers.id, dto.customerId), eq(customers.companyId, companyId))).limit(1);
      if (!cust) throw new NotFoundException('Customer not found');
      if (dto.bankAccountId) {
        const [b] = await tx.select({ id: bankAccounts.id }).from(bankAccounts).where(and(eq(bankAccounts.id, dto.bankAccountId), eq(bankAccounts.companyId, companyId))).limit(1);
        if (!b) throw new NotFoundException('Bank account not found');
      }
      const amount = M.money(dto.amount);
      const allocs = dto.allocations ?? [];
      let allocated = M.money(0);
      for (const a of allocs) {
        const inv = await this.invoiceFor(tx, companyId, a.invoiceId);
        if (inv.customerId !== dto.customerId) throw new UnprocessableEntityException('Invoice belongs to another customer');
        if (!(OPEN as readonly string[]).includes(inv.status)) throw new UnprocessableEntityException(`Invoice ${inv.number} is not open`);
        const amt = M.money(a.allocatedAmount);
        if (amt.greaterThan(M.money(inv.balanceDue))) throw new UnprocessableEntityException(`Allocation exceeds balance of ${inv.number}`);
        allocated = M.add(allocated, amt);
      }
      if (allocated.greaterThan(amount)) throw new UnprocessableEntityException('Allocations exceed payment amount');

      const fy = await openFyFor(tx, companyId, dto.date);
      const number = await nextNumber(tx, companyId, 'RCPT', dto.date.slice(0, 4));
      const [p] = await tx
        .insert(customerPayments)
        .values({
          tenantId,
          companyId,
          branchId: dto.branchId,
          customerId: dto.customerId,
          fiscalYearId: fy.id,
          number,
          date: dto.date,
          amount: M.toDb(amount),
          currencyCode: dto.currencyCode ?? 'AED',
          exchangeRate: dto.exchangeRate ?? '1',
          paymentMethod: dto.paymentMethod,
          bankAccountId: dto.bankAccountId,
          reference: dto.reference,
          notes: dto.notes,
          createdBy: actor.sub,
        })
        .returning();
      if (allocs.length) {
        await tx.insert(customerPaymentAllocations).values(
          allocs.map((a) => ({ paymentId: p.id, invoiceId: a.invoiceId, tenantId, companyId, allocatedAmount: M.toDb(M.money(a.allocatedAmount)) })),
        );
      }
      return this.load(tx, companyId, p.id);
    });
  }

  post(actor: AccessTokenPayload, id: string) {
    const { tenantId, companyId } = this.scope(actor);
    return withTenant(this.db, tenantId, async (tx) => {
      const p = await this.find(tx, companyId, id);
      if (p.status !== 'draft') throw new UnprocessableEntityException('Only draft payments can be posted');
      const allocs = await this.allocations(tx, id);
      if (!allocs.length) throw new UnprocessableEntityException('Payment has no allocations');

      let customerAr: string | null = null;
      for (const a of allocs) {
        const inv = await this.invoiceFor(tx, companyId, a.invoiceId);
        const amt = M.money(a.allocatedAmount);
        if (amt.greaterThan(M.money(inv.balanceDue))) throw new UnprocessableEntityException(`Allocation exceeds balance of ${inv.number}`);
        const paid = M.add(M.money(inv.paidAmount), amt);
        const bal = M.sub(M.money(inv.total), paid);
        await tx
          .update(invoices)
          .set({ paidAmount: M.toDb(paid), balanceDue: M.toDb(bal), status: bal.isZero() ? 'paid' : 'partially_paid', updatedAt: new Date() })
          .where(eq(invoices.id, inv.id));
        customerAr = customerAr ?? inv.customerId;
      }

      const [cust] = await tx.select().from(customers).where(eq(customers.id, customerAr!)).limit(1);
      const ar = cust?.accountId ?? (await this.code(tx, companyId, '1200'));
      const base = M.mul(M.money(p.amount), M.money(p.exchangeRate ?? '1'));
      const cash = p.bankAccountId
        ? (await tx.select({ gl: bankAccounts.glAccountId }).from(bankAccounts).where(eq(bankAccounts.id, p.bankAccountId)).limit(1))[0].gl
        : await ensureAccount(tx, tenantId, companyId, '1010', 'Cash', 'asset');
      const jeId = await postJournal(tx, {
        tenantId,
        companyId,
        branchId: p.branchId,
        date: p.date,
        description: `Receipt ${p.number}`,
        userId: actor.sub,
        lines: [
          { accountId: cash, debit: M.toDb(base), credit: '0' },
          { accountId: ar, debit: '0', credit: M.toDb(base) },
        ],
      });
      await tx.update(customerPayments).set({ status: 'posted', journalEntryId: jeId, updatedAt: new Date() }).where(eq(customerPayments.id, id));
      if (p.bankAccountId) {
        await insertBankTx(tx, {
          tenantId, companyId, bankAccountId: p.bankAccountId, fiscalYearId: p.fiscalYearId, date: p.date, type: 'deposit',
          amount: M.money(p.amount), description: `Receipt ${p.number}`, relatedPaymentId: p.id, relatedPaymentType: 'customer', userId: actor.sub,
        });
      }
      return this.load(tx, companyId, id);
    });
  }

  void(actor: AccessTokenPayload, id: string) {
    const { tenantId, companyId } = this.scope(actor);
    return withTenant(this.db, tenantId, async (tx) => {
      const p = await this.find(tx, companyId, id);
      if (p.status === 'reconciled') throw new UnprocessableEntityException('Reconciled payments cannot be voided');
      if (p.status !== 'posted' || !p.journalEntryId) throw new UnprocessableEntityException('Only posted payments can be voided');
      for (const a of await this.allocations(tx, id)) {
        const inv = await this.invoiceFor(tx, companyId, a.invoiceId);
        const paid = M.sub(M.money(inv.paidAmount), M.money(a.allocatedAmount));
        const safePaid = paid.lessThan(0) ? M.money(0) : paid;
        const bal = M.sub(M.money(inv.total), safePaid);
        await tx
          .update(invoices)
          .set({ paidAmount: M.toDb(safePaid), balanceDue: M.toDb(bal), status: safePaid.isZero() ? 'posted' : 'partially_paid', updatedAt: new Date() })
          .where(eq(invoices.id, inv.id));
      }
      await reverseJournal(tx, p.journalEntryId, tenantId, companyId, actor.sub);
      await tx.delete(bankTransactions).where(and(eq(bankTransactions.relatedPaymentId, id), eq(bankTransactions.relatedPaymentType, 'customer')));
      await tx.update(customerPayments).set({ status: 'voided', updatedAt: new Date() }).where(eq(customerPayments.id, id));
      return this.load(tx, companyId, id);
    });
  }

  private async code(tx: Tx, companyId: string, code: string): Promise<string> {
    const [a] = await tx.select({ id: accounts.id }).from(accounts).where(and(eq(accounts.companyId, companyId), eq(accounts.code, code))).limit(1);
    if (!a) throw new UnprocessableEntityException(`Account ${code} is missing`);
    return a.id;
  }
}
