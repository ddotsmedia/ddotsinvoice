import { Inject, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { and, count, desc, eq, lte, type SQL } from 'drizzle-orm';
import { bankAccounts, bankReconciliations, bankTransactions, Db, Tx, withTenant } from '@ddotsinvoice/db';
import * as M from '@ddotsinvoice/money';
import { AccessTokenPayload } from '@ddotsinvoice/shared';
import { DB } from '../../infra/drizzle.module';
import { requireCompany, requireTenant } from '../../common/tenant';
import { openFyFor } from '../../modules/accounting/accounting.util';
import { BankTxType, signOf } from '../bank-transactions/bank-tx.core';
import { CreateReconciliationDto, ReconciliationQueryDto } from './rec.dto';

@Injectable()
export class ReconciliationsService {
  constructor(@Inject(DB) private readonly db: Db) {}

  private scope(actor: AccessTokenPayload) {
    return { tenantId: requireTenant(actor.tenantId), companyId: requireCompany(actor.companyId) };
  }

  private async find(tx: Tx, companyId: string, id: string) {
    const [r] = await tx.select().from(bankReconciliations).where(and(eq(bankReconciliations.id, id), eq(bankReconciliations.companyId, companyId))).limit(1);
    if (!r) throw new NotFoundException('Reconciliation not found');
    return r;
  }

  // Transactions up to the statement date for the account
  private txsUpTo(tx: Tx, companyId: string, bankAccountId: string, date: string) {
    return tx
      .select()
      .from(bankTransactions)
      .where(and(eq(bankTransactions.companyId, companyId), eq(bankTransactions.bankAccountId, bankAccountId), lte(bankTransactions.date, date)));
  }

  list(actor: AccessTokenPayload, q: ReconciliationQueryDto) {
    const { tenantId, companyId } = this.scope(actor);
    const conds: SQL[] = [eq(bankReconciliations.companyId, companyId)];
    if (q.bankAccountId) conds.push(eq(bankReconciliations.bankAccountId, q.bankAccountId));
    const where = and(...conds);
    return withTenant(this.db, tenantId, async (tx) => {
      const items = await tx.select().from(bankReconciliations).where(where).orderBy(desc(bankReconciliations.statementDate)).limit(q.limit).offset((q.page - 1) * q.limit);
      const [{ total }] = await tx.select({ total: count() }).from(bankReconciliations).where(where);
      return { items, total, page: q.page, limit: q.limit };
    });
  }

  findOne(actor: AccessTokenPayload, id: string) {
    const { tenantId, companyId } = this.scope(actor);
    return withTenant(this.db, tenantId, (tx) => this.find(tx, companyId, id));
  }

  create(actor: AccessTokenPayload, dto: CreateReconciliationDto) {
    const { tenantId, companyId } = this.scope(actor);
    return withTenant(this.db, tenantId, async (tx) => {
      const [bank] = await tx.select({ id: bankAccounts.id }).from(bankAccounts).where(and(eq(bankAccounts.id, dto.bankAccountId), eq(bankAccounts.companyId, companyId))).limit(1);
      if (!bank) throw new NotFoundException('Bank account not found');
      const fy = await openFyFor(tx, companyId, dto.statementDate);
      const [row] = await tx
        .insert(bankReconciliations)
        .values({
          tenantId, companyId, bankAccountId: dto.bankAccountId, fiscalYearId: fy.id, statementDate: dto.statementDate,
          openingBalance: M.toDb(M.money(dto.openingBalance)), closingBalance: M.toDb(M.money(dto.closingBalance)),
        })
        .returning();
      return row;
    });
  }

  close(actor: AccessTokenPayload, id: string) {
    const { tenantId, companyId } = this.scope(actor);
    return withTenant(this.db, tenantId, async (tx) => {
      const rec = await this.find(tx, companyId, id);
      if (rec.status !== 'open') throw new UnprocessableEntityException('Reconciliation is already closed');
      const pending = (await this.txsUpTo(tx, companyId, rec.bankAccountId, rec.statementDate)).filter((t) => !t.isReconciled);
      if (pending.length) throw new UnprocessableEntityException(`${pending.length} unreconciled transaction(s) up to statement date`);
      const [row] = await tx
        .update(bankReconciliations)
        .set({ status: 'closed', closedAt: new Date(), closedBy: actor.sub, updatedAt: new Date() })
        .where(eq(bankReconciliations.id, id))
        .returning();
      return row;
    });
  }

  summary(actor: AccessTokenPayload, id: string) {
    const { tenantId, companyId } = this.scope(actor);
    return withTenant(this.db, tenantId, async (tx) => {
      const rec = await this.find(tx, companyId, id);
      const rows = await this.txsUpTo(tx, companyId, rec.bankAccountId, rec.statementDate);
      let net = M.money(0);
      for (const r of rows) net = M.add(net, M.mul(M.money(r.amount), M.money(signOf(r.type as BankTxType))));
      const book = M.add(M.money(rec.openingBalance), net);
      const difference = M.sub(M.money(rec.closingBalance), book);
      return {
        openingBalance: rec.openingBalance,
        closingBalance: rec.closingBalance,
        bookBalance: M.toDb(book),
        reconciledCount: rows.filter((r) => r.isReconciled).length,
        unreconciledCount: rows.filter((r) => !r.isReconciled).length,
        difference: M.toDb(difference),
      };
    });
  }
}
