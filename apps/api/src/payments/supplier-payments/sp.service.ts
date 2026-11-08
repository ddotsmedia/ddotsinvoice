import { Inject, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { and, count, desc, eq, type SQL } from 'drizzle-orm';
import {
  accounts, bankAccounts, bankTransactions, Db, supplierInvoices, supplierPaymentAllocations, supplierPayments, suppliers, Tx, withTenant,
} from '@ddotsinvoice/db';
import * as M from '@ddotsinvoice/money';
import { AccessTokenPayload } from '@ddotsinvoice/shared';
import { DB } from '../../infra/drizzle.module';
import { requireCompany, requireTenant } from '../../common/tenant';
import { nextNumber, openFyFor } from '../../modules/accounting/accounting.util';
import { postJournal, reverseJournal } from '../../modules/accounting/journal-posting';
import { ensureAccount } from '../../purchasing/purchasing.util';
import { insertBankTx } from '../bank-transactions/bank-tx.core';
import { CreateSupplierPaymentDto, SupplierPaymentQueryDto } from './sp.dto';

const OPEN = ['posted', 'partially_paid'] as const;

@Injectable()
export class SupplierPaymentsService {
  constructor(@Inject(DB) private readonly db: Db) {}

  private scope(actor: AccessTokenPayload) {
    return { tenantId: requireTenant(actor.tenantId), companyId: requireCompany(actor.companyId) };
  }

  private async find(tx: Tx, companyId: string, id: string) {
    const [p] = await tx.select().from(supplierPayments).where(and(eq(supplierPayments.id, id), eq(supplierPayments.companyId, companyId))).limit(1);
    if (!p) throw new NotFoundException('Payment not found');
    return p;
  }

  private allocations(tx: Tx, paymentId: string) {
    return tx.select().from(supplierPaymentAllocations).where(eq(supplierPaymentAllocations.paymentId, paymentId));
  }

  private async load(tx: Tx, companyId: string, id: string) {
    const p = await this.find(tx, companyId, id);
    const allocs = await tx
      .select({
        id: supplierPaymentAllocations.id,
        supplierInvoiceId: supplierPaymentAllocations.supplierInvoiceId,
        allocatedAmount: supplierPaymentAllocations.allocatedAmount,
        invoiceNumber: supplierInvoices.number,
        invoiceTotal: supplierInvoices.total,
      })
      .from(supplierPaymentAllocations)
      .innerJoin(supplierInvoices, eq(supplierInvoices.id, supplierPaymentAllocations.supplierInvoiceId))
      .where(eq(supplierPaymentAllocations.paymentId, id));
    return { ...p, allocations: allocs };
  }

  private async invoiceFor(tx: Tx, companyId: string, id: string) {
    const [inv] = await tx.select().from(supplierInvoices).where(and(eq(supplierInvoices.id, id), eq(supplierInvoices.companyId, companyId))).limit(1);
    if (!inv) throw new NotFoundException('Supplier invoice not found');
    return inv;
  }

  private async code(tx: Tx, companyId: string, code: string): Promise<string> {
    const [a] = await tx.select({ id: accounts.id }).from(accounts).where(and(eq(accounts.companyId, companyId), eq(accounts.code, code))).limit(1);
    if (!a) throw new UnprocessableEntityException(`Account ${code} is missing`);
    return a.id;
  }

  async list(actor: AccessTokenPayload, q: SupplierPaymentQueryDto) {
    const { tenantId, companyId } = this.scope(actor);
    const conds: SQL[] = [eq(supplierPayments.companyId, companyId)];
    if (q.status) conds.push(eq(supplierPayments.status, q.status as 'draft' | 'posted' | 'reconciled' | 'voided'));
    const where = and(...conds);
    return withTenant(this.db, tenantId, async (tx) => {
      const items = await tx.select().from(supplierPayments).where(where).orderBy(desc(supplierPayments.date)).limit(q.limit).offset((q.page - 1) * q.limit);
      const [{ total }] = await tx.select({ total: count() }).from(supplierPayments).where(where);
      return { items, total, page: q.page, limit: q.limit };
    });
  }

  findOne(actor: AccessTokenPayload, id: string) {
    const { tenantId, companyId } = this.scope(actor);
    return withTenant(this.db, tenantId, (tx) => this.load(tx, companyId, id));
  }

  create(actor: AccessTokenPayload, dto: CreateSupplierPaymentDto) {
    const { tenantId, companyId } = this.scope(actor);
    return withTenant(this.db, tenantId, async (tx) => {
      const [sup] = await tx.select().from(suppliers).where(and(eq(suppliers.id, dto.supplierId), eq(suppliers.companyId, companyId))).limit(1);
      if (!sup) throw new NotFoundException('Supplier not found');
      if (dto.bankAccountId) {
        const [b] = await tx.select({ id: bankAccounts.id }).from(bankAccounts).where(and(eq(bankAccounts.id, dto.bankAccountId), eq(bankAccounts.companyId, companyId))).limit(1);
        if (!b) throw new NotFoundException('Bank account not found');
      }
      const amount = M.money(dto.amount);
      const allocs = dto.allocations ?? [];
      let allocated = M.money(0);
      for (const a of allocs) {
        const inv = await this.invoiceFor(tx, companyId, a.supplierInvoiceId);
        if (inv.supplierId !== dto.supplierId) throw new UnprocessableEntityException('Invoice belongs to another supplier');
        if (!(OPEN as readonly string[]).includes(inv.status)) throw new UnprocessableEntityException(`Invoice ${inv.number} is not open`);
        const amt = M.money(a.allocatedAmount);
        if (amt.greaterThan(M.money(inv.balanceDue))) throw new UnprocessableEntityException(`Allocation exceeds balance of ${inv.number}`);
        allocated = M.add(allocated, amt);
      }
      if (allocated.greaterThan(amount)) throw new UnprocessableEntityException('Allocations exceed payment amount');

      await openFyFor(tx, companyId, dto.date);
      const number = await nextNumber(tx, companyId, 'PAY', dto.date.slice(0, 4));
      const [p] = await tx
        .insert(supplierPayments)
        .values({
          tenantId,
          companyId,
          branchId: dto.branchId,
          supplierId: dto.supplierId,
          fiscalYearId: dto.fiscalYearId,
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
        await tx.insert(supplierPaymentAllocations).values(
          allocs.map((a) => ({ paymentId: p.id, supplierInvoiceId: a.supplierInvoiceId, tenantId, companyId, allocatedAmount: M.toDb(M.money(a.allocatedAmount)) })),
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

      let supplierId: string | null = null;
      for (const a of allocs) {
        const inv = await this.invoiceFor(tx, companyId, a.supplierInvoiceId);
        const amt = M.money(a.allocatedAmount);
        if (amt.greaterThan(M.money(inv.balanceDue))) throw new UnprocessableEntityException(`Allocation exceeds balance of ${inv.number}`);
        const paid = M.add(M.money(inv.paidAmount ?? '0'), amt);
        const bal = M.sub(M.money(inv.total), paid);
        await tx
          .update(supplierInvoices)
          .set({ paidAmount: M.toDb(paid), balanceDue: M.toDb(bal), status: bal.isZero() ? 'fully_paid' : 'partially_paid', updatedAt: new Date() })
          .where(eq(supplierInvoices.id, inv.id));
        supplierId = supplierId ?? inv.supplierId;
      }

      const [sup] = await tx.select().from(suppliers).where(eq(suppliers.id, supplierId!)).limit(1);
      const ap = sup?.defaultApAccountId ?? (await this.code(tx, companyId, '2100'));
      const base = M.mul(M.money(p.amount), M.money(p.exchangeRate ?? '1'));
      let bankGl: string;
      if (p.bankAccountId) {
        const [b] = await tx.select({ gl: bankAccounts.glAccountId }).from(bankAccounts).where(eq(bankAccounts.id, p.bankAccountId)).limit(1);
        bankGl = b.gl;
      } else {
        bankGl = await ensureAccount(tx, tenantId, companyId, '1010', 'Cash', 'asset');
      }
      const jeId = await postJournal(tx, {
        tenantId,
        companyId,
        branchId: p.branchId,
        date: p.date,
        description: `Payment ${p.number}`,
        userId: actor.sub,
        lines: [
          { accountId: ap, debit: M.toDb(base), credit: '0' },
          { accountId: bankGl, debit: '0', credit: M.toDb(base) },
        ],
      });
      await tx.update(supplierPayments).set({ status: 'posted', journalEntryId: jeId, updatedAt: new Date() }).where(eq(supplierPayments.id, id));
      if (p.bankAccountId) {
        await insertBankTx(tx, {
          tenantId, companyId, bankAccountId: p.bankAccountId, fiscalYearId: p.fiscalYearId, date: p.date, type: 'withdrawal',
          amount: M.money(p.amount), description: `Payment ${p.number}`, relatedPaymentId: p.id, relatedPaymentType: 'supplier', userId: actor.sub,
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
        const inv = await this.invoiceFor(tx, companyId, a.supplierInvoiceId);
        const paid0 = M.sub(M.money(inv.paidAmount ?? '0'), M.money(a.allocatedAmount));
        const paid = paid0.lessThan(0) ? M.money(0) : paid0;
        const bal = M.sub(M.money(inv.total), paid);
        await tx
          .update(supplierInvoices)
          .set({ paidAmount: M.toDb(paid), balanceDue: M.toDb(bal), status: paid.isZero() ? 'posted' : 'partially_paid', updatedAt: new Date() })
          .where(eq(supplierInvoices.id, inv.id));
      }
      await reverseJournal(tx, p.journalEntryId, tenantId, companyId, actor.sub);
      await tx.delete(bankTransactions).where(and(eq(bankTransactions.relatedPaymentId, id), eq(bankTransactions.relatedPaymentType, 'supplier')));
      await tx.update(supplierPayments).set({ status: 'voided', updatedAt: new Date() }).where(eq(supplierPayments.id, id));
      return this.load(tx, companyId, id);
    });
  }
}
