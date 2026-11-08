import { ConflictException, Inject, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { and, asc, count, eq, gte, lte } from 'drizzle-orm';
import { accounts, bankAccounts, bankTransactions, Db, Tx, withTenant } from '@ddotsinvoice/db';
import * as M from '@ddotsinvoice/money';
import { AccessTokenPayload } from '@ddotsinvoice/shared';
import { DB } from '../../infra/drizzle.module';
import { requireCompany, requireTenant } from '../../common/tenant';
import { signOf, BankTxType } from '../bank-transactions/bank-tx.core';
import { BankAccountQueryDto, CreateBankAccountDto, StatementQueryDto, UpdateBankAccountDto } from './bank-accounts.dto';

@Injectable()
export class BankAccountsService {
  constructor(@Inject(DB) private readonly db: Db) {}

  private scope(actor: AccessTokenPayload) {
    return { tenantId: requireTenant(actor.tenantId), companyId: requireCompany(actor.companyId) };
  }

  private async find(tx: Tx, companyId: string, id: string) {
    const [b] = await tx.select().from(bankAccounts).where(and(eq(bankAccounts.id, id), eq(bankAccounts.companyId, companyId))).limit(1);
    if (!b) throw new NotFoundException('Bank account not found');
    return b;
  }

  private async assertGl(tx: Tx, companyId: string, id: string) {
    const [a] = await tx.select({ id: accounts.id, isHeader: accounts.isHeader }).from(accounts).where(and(eq(accounts.id, id), eq(accounts.companyId, companyId))).limit(1);
    if (!a) throw new NotFoundException('GL account not found');
    if (a.isHeader) throw new UnprocessableEntityException('GL account must be postable');
  }

  list(actor: AccessTokenPayload, q: BankAccountQueryDto) {
    const { tenantId, companyId } = this.scope(actor);
    const where = eq(bankAccounts.companyId, companyId);
    return withTenant(this.db, tenantId, async (tx) => {
      const items = await tx.select().from(bankAccounts).where(where).orderBy(asc(bankAccounts.code)).limit(q.limit).offset((q.page - 1) * q.limit);
      const [{ total }] = await tx.select({ total: count() }).from(bankAccounts).where(where);
      return { items, total, page: q.page, limit: q.limit };
    });
  }

  findOne(actor: AccessTokenPayload, id: string) {
    const { tenantId, companyId } = this.scope(actor);
    return withTenant(this.db, tenantId, (tx) => this.find(tx, companyId, id));
  }

  create(actor: AccessTokenPayload, dto: CreateBankAccountDto) {
    const { tenantId, companyId } = this.scope(actor);
    return withTenant(this.db, tenantId, async (tx) => {
      await this.assertGl(tx, companyId, dto.glAccountId);
      const [dup] = await tx.select({ id: bankAccounts.id }).from(bankAccounts).where(and(eq(bankAccounts.companyId, companyId), eq(bankAccounts.code, dto.code))).limit(1);
      if (dup) throw new ConflictException('Bank account code already exists');
      const [row] = await tx.insert(bankAccounts).values({ ...dto, tenantId, companyId }).returning();
      return row;
    });
  }

  update(actor: AccessTokenPayload, id: string, dto: UpdateBankAccountDto) {
    const { tenantId, companyId } = this.scope(actor);
    return withTenant(this.db, tenantId, async (tx) => {
      await this.find(tx, companyId, id);
      if (dto.glAccountId) await this.assertGl(tx, companyId, dto.glAccountId);
      const [row] = await tx.update(bankAccounts).set({ ...dto, updatedAt: new Date() }).where(eq(bankAccounts.id, id)).returning();
      return row;
    });
  }

  // Running balance over bank transactions in date range (memo rows included)
  statement(actor: AccessTokenPayload, id: string, q: StatementQueryDto) {
    const { tenantId, companyId } = this.scope(actor);
    return withTenant(this.db, tenantId, async (tx) => {
      await this.find(tx, companyId, id);
      const conds = [eq(bankTransactions.bankAccountId, id)];
      if (q.from) conds.push(gte(bankTransactions.date, q.from));
      if (q.to) conds.push(lte(bankTransactions.date, q.to));
      const rows = await tx.select().from(bankTransactions).where(and(...conds)).orderBy(asc(bankTransactions.date), asc(bankTransactions.createdAt));
      let running = M.money(0);
      const out = rows.map((r) => {
        const signed = M.mul(M.money(r.amount), M.money(signOf(r.type as BankTxType)));
        running = M.add(running, signed);
        return { ...r, signedAmount: M.toDb(signed), balance: M.toDb(running) };
      });
      return { bankAccountId: id, closingBalance: M.toDb(running), rows: out };
    });
  }
}
