import { Inject, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { and, count, desc, eq, type SQL } from 'drizzle-orm';
import { bankAccounts, bankTransactions, Db, Tx, withTenant } from '@ddotsinvoice/db';
import * as M from '@ddotsinvoice/money';
import { AccessTokenPayload } from '@ddotsinvoice/shared';
import { DB } from '../../infra/drizzle.module';
import { requireCompany, requireTenant } from '../../common/tenant';
import { openFyFor } from '../../modules/accounting/accounting.util';
import { postJournal } from '../../modules/accounting/journal-posting';
import { ensureAccount } from '../../purchasing/purchasing.util';
import { BankTxType, insertBankTx, signOf } from './bank-tx.core';
import { BankTxQueryDto, CreateBankTxDto } from './bt.dto';

// Contra account per memo type (created if missing)
const CONTRA: Record<Exclude<BankTxType, 'transfer'>, [string, string, 'revenue' | 'expense']> = {
  deposit: ['4900', 'Other Income', 'revenue'],
  interest: ['4800', 'Interest Income', 'revenue'],
  withdrawal: ['6000', 'General Expenses', 'expense'],
  bank_charge: ['6100', 'Bank Charges', 'expense'],
};

@Injectable()
export class BankTransactionsService {
  constructor(@Inject(DB) private readonly db: Db) {}

  private scope(actor: AccessTokenPayload) {
    return { tenantId: requireTenant(actor.tenantId), companyId: requireCompany(actor.companyId) };
  }

  private async find(tx: Tx, companyId: string, id: string) {
    const [r] = await tx.select().from(bankTransactions).where(and(eq(bankTransactions.id, id), eq(bankTransactions.companyId, companyId))).limit(1);
    if (!r) throw new NotFoundException('Bank transaction not found');
    return r;
  }

  list(actor: AccessTokenPayload, q: BankTxQueryDto) {
    const { tenantId, companyId } = this.scope(actor);
    const conds: SQL[] = [eq(bankTransactions.companyId, companyId)];
    if (q.bankAccountId) conds.push(eq(bankTransactions.bankAccountId, q.bankAccountId));
    const where = and(...conds);
    return withTenant(this.db, tenantId, async (tx) => {
      const items = await tx.select().from(bankTransactions).where(where).orderBy(desc(bankTransactions.date)).limit(q.limit).offset((q.page - 1) * q.limit);
      const [{ total }] = await tx.select({ total: count() }).from(bankTransactions).where(where);
      return { items, total, page: q.page, limit: q.limit };
    });
  }

  findOne(actor: AccessTokenPayload, id: string) {
    const { tenantId, companyId } = this.scope(actor);
    return withTenant(this.db, tenantId, (tx) => this.find(tx, companyId, id));
  }

  create(actor: AccessTokenPayload, dto: CreateBankTxDto) {
    const { tenantId, companyId } = this.scope(actor);
    if (dto.type === 'transfer') throw new UnprocessableEntityException('Transfers are not supported yet');
    return withTenant(this.db, tenantId, async (tx) => {
      const [bank] = await tx.select().from(bankAccounts).where(and(eq(bankAccounts.id, dto.bankAccountId), eq(bankAccounts.companyId, companyId))).limit(1);
      if (!bank) throw new NotFoundException('Bank account not found');
      const fy = await openFyFor(tx, companyId, dto.date);
      const [code, name, kind] = CONTRA[dto.type as Exclude<BankTxType, 'transfer'>];
      const contra = await ensureAccount(tx, tenantId, companyId, code, name, kind);
      const amount = M.money(dto.amount);
      const row = await insertBankTx(tx, {
        tenantId, companyId, bankAccountId: bank.id, fiscalYearId: fy.id, date: dto.date, type: dto.type, amount,
        description: dto.description, reference: dto.reference, userId: actor.sub,
      });
      const v = M.toDb(amount);
      const inbound = signOf(dto.type) === 1;
      const jeId = await postJournal(tx, {
        tenantId,
        companyId,
        date: dto.date,
        description: `Bank ${dto.type} ${row.number}`,
        userId: actor.sub,
        lines: inbound
          ? [{ accountId: bank.glAccountId, debit: v, credit: '0' }, { accountId: contra, debit: '0', credit: v }]
          : [{ accountId: contra, debit: v, credit: '0' }, { accountId: bank.glAccountId, debit: '0', credit: v }],
      });
      const [out] = await tx.update(bankTransactions).set({ journalEntryId: jeId, updatedAt: new Date() }).where(eq(bankTransactions.id, row.id)).returning();
      return out;
    });
  }

  reconcile(actor: AccessTokenPayload, id: string) {
    const { tenantId, companyId } = this.scope(actor);
    return withTenant(this.db, tenantId, async (tx) => {
      await this.find(tx, companyId, id);
      const [row] = await tx
        .update(bankTransactions)
        .set({ isReconciled: true, reconciledAt: new Date(), updatedAt: new Date() })
        .where(eq(bankTransactions.id, id))
        .returning();
      return row;
    });
  }
}
