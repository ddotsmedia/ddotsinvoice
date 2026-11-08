import { NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { and, eq, gte, inArray, isNull, lte } from 'drizzle-orm';
import { accounts, fiscalYears, numberSequences, Tx } from '@ddotsinvoice/db';
import * as M from '@ddotsinvoice/money';

export const ACCOUNT_TYPES = ['asset', 'liability', 'equity', 'revenue', 'expense'] as const;
export type AccountType = (typeof ACCOUNT_TYPES)[number];
export type NormalBalance = 'debit' | 'credit';
export const MAX_LEVEL = 5;

export const normalFor = (t: AccountType): NormalBalance => (t === 'asset' || t === 'expense' ? 'debit' : 'credit');

// debit-normal: debit - credit; credit-normal: credit - debit
export const signedBalance = (normal: NormalBalance, debit: M.Money, credit: M.Money): M.Money =>
  normal === 'debit' ? M.sub(debit, credit) : M.sub(credit, debit);

export const total = (vals: string[]): M.Money => vals.reduce((acc, v) => M.add(acc, M.money(v)), M.money(0));

export interface LineIn {
  accountId: string;
  debit: string;
  credit: string;
  description?: string | null;
}

// Each line: exactly one of debit/credit > 0; accounts must be active, postable, in company
export async function assertPostableLines(tx: Tx, companyId: string, lines: LineIn[]): Promise<void> {
  for (const l of lines) {
    if (M.money(l.debit).isZero() === M.money(l.credit).isZero()) {
      throw new UnprocessableEntityException('Each line needs exactly one of debit or credit greater than 0');
    }
  }
  const ids = [...new Set(lines.map((l) => l.accountId))];
  const rows = await tx
    .select()
    .from(accounts)
    .where(and(eq(accounts.companyId, companyId), inArray(accounts.id, ids), isNull(accounts.deletedAt)));
  if (rows.length !== ids.length) throw new NotFoundException('Account not found');
  for (const a of rows) {
    if (!a.isActive) throw new UnprocessableEntityException(`Account ${a.code} is inactive`);
    if (a.isHeader) throw new UnprocessableEntityException(`Account ${a.code} is a header account`);
  }
}

export async function openFyFor(tx: Tx, companyId: string, date: string) {
  const [fy] = await tx
    .select()
    .from(fiscalYears)
    .where(
      and(
        eq(fiscalYears.companyId, companyId),
        eq(fiscalYears.status, 'open'),
        lte(fiscalYears.startDate, date),
        gte(fiscalYears.endDate, date),
      ),
    )
    .limit(1);
  if (!fy) throw new UnprocessableEntityException(`No open fiscal year covers ${date}`);
  return fy;
}

// Row-locked increment: {prefix}-{YYYY}-{padded}
export async function nextNumber(tx: Tx, companyId: string, prefix: string, year: string): Promise<string> {
  const [seq] = await tx
    .select()
    .from(numberSequences)
    .where(and(eq(numberSequences.companyId, companyId), eq(numberSequences.prefix, prefix)))
    .for('update');
  if (!seq) throw new NotFoundException(`Number sequence ${prefix} not found`);
  const next = seq.lastNumber + 1;
  await tx.update(numberSequences).set({ lastNumber: next }).where(eq(numberSequences.id, seq.id));
  return `${prefix}-${year}-${String(next).padStart(seq.padLength, '0')}`;
}
