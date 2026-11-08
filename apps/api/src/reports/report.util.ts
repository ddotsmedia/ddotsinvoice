import { and, eq, gte, inArray, lte, sql, type SQL } from 'drizzle-orm';
import { accounts, journalEntries, journalLines, Tx } from '@ddotsinvoice/db';
import * as M from '@ddotsinvoice/money';

export interface Mv { d: M.Money; c: M.Money }

// Posted + reversed (reversed originals still net via their reversal)
export async function movements(tx: Tx, companyId: string, from?: string, to?: string): Promise<Map<string, Mv>> {
  const conds: SQL[] = [
    eq(journalEntries.companyId, companyId),
    inArray(journalEntries.status, ['posted', 'reversed']),
  ];
  if (from) conds.push(gte(journalEntries.date, from));
  if (to) conds.push(lte(journalEntries.date, to));
  const rows = await tx
    .select({
      accountId: journalLines.accountId,
      d: sql<string>`coalesce(sum(${journalLines.debit}),0)`,
      c: sql<string>`coalesce(sum(${journalLines.credit}),0)`,
    })
    .from(journalLines)
    .innerJoin(journalEntries, eq(journalEntries.id, journalLines.journalEntryId))
    .where(and(...conds))
    .groupBy(journalLines.accountId);
  return new Map(rows.map((r) => [r.accountId, { d: M.money(r.d), c: M.money(r.c) }]));
}

export async function accountsById(tx: Tx, companyId: string) {
  const rows = await tx.select().from(accounts).where(eq(accounts.companyId, companyId));
  return new Map(rows.map((a) => [a.id, a]));
}

export const addDays = (date: string, days: number): string => {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

export const todayIso = (): string => new Date().toISOString().slice(0, 10);

export const daysBetween = (from: string, to: string): number =>
  Math.floor((Date.parse(to) - Date.parse(from)) / 86400000);
