import { UnprocessableEntityException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { journalEntries, journalLines, Tx } from '@ddotsinvoice/db';
import * as M from '@ddotsinvoice/money';
import { assertPostableLines, LineIn, nextNumber, openFyFor, total } from './accounting.util';

export interface PostJournalArgs {
  tenantId: string;
  companyId: string;
  branchId?: string | null;
  date: string;
  description: string;
  lines: LineIn[];
  userId: string;
  reversesId?: string | null;
}

// Creates and posts a balanced entry inside the caller's transaction (lines are inserted while draft, then posted)
export async function postJournal(tx: Tx, a: PostJournalArgs): Promise<string> {
  if (!M.eq(total(a.lines.map((l) => l.debit)), total(a.lines.map((l) => l.credit)))) {
    throw new UnprocessableEntityException('Unbalanced journal entry');
  }
  await assertPostableLines(tx, a.companyId, a.lines);
  const fy = await openFyFor(tx, a.companyId, a.date);
  const number = await nextNumber(tx, a.companyId, 'JE', a.date.slice(0, 4));
  const [e] = await tx
    .insert(journalEntries)
    .values({
      tenantId: a.tenantId,
      companyId: a.companyId,
      branchId: a.branchId ?? null,
      fiscalYearId: fy.id,
      number,
      date: a.date,
      description: a.description,
      createdBy: a.userId,
      reversesId: a.reversesId ?? null,
    })
    .returning();
  await tx.insert(journalLines).values(
    a.lines.map((l, i) => ({
      tenantId: a.tenantId,
      companyId: a.companyId,
      journalEntryId: e.id,
      accountId: l.accountId,
      debit: M.toDb(M.money(l.debit)),
      credit: M.toDb(M.money(l.credit)),
      description: l.description ?? null,
      sortOrder: i,
    })),
  );
  await tx
    .update(journalEntries)
    .set({ status: 'posted', postedAt: new Date(), postedBy: a.userId, updatedAt: new Date() })
    .where(eq(journalEntries.id, e.id));
  return e.id;
}

// Counter-entry with swapped sides; original marked reversed
export async function reverseJournal(
  tx: Tx,
  originalId: string,
  tenantId: string,
  companyId: string,
  userId: string,
): Promise<string> {
  const [o] = await tx.select().from(journalEntries).where(eq(journalEntries.id, originalId)).limit(1);
  if (!o || o.status !== 'posted') throw new UnprocessableEntityException('Journal entry is not posted');
  const ls = await tx.select().from(journalLines).where(eq(journalLines.journalEntryId, originalId));
  const revId = await postJournal(tx, {
    tenantId,
    companyId,
    branchId: o.branchId,
    date: o.date,
    description: `Reversal of ${o.number}`,
    userId,
    reversesId: o.id,
    lines: ls.map((l) => ({ accountId: l.accountId, debit: l.credit, credit: l.debit, description: l.description })),
  });
  await tx
    .update(journalEntries)
    .set({ status: 'reversed', reversedById: revId, updatedAt: new Date() })
    .where(eq(journalEntries.id, o.id));
  return revId;
}
