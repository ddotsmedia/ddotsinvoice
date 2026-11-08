import { and, eq } from 'drizzle-orm';
import { numberSequences, Tx } from '@ddotsinvoice/db';
import * as M from '@ddotsinvoice/money';

// Whole completed years between two ISO dates, as a fraction of 12-month blocks
export const completedYears = (from: string, to: string): M.Money => {
  const [fy, fm, fd] = from.split('-').map(Number);
  const [ty, tm, td] = to.split('-').map(Number);
  let months = (ty - fy) * 12 + (tm - fm);
  if (td < fd) months -= 1;
  return M.div(M.money(Math.max(months, 0)), M.money(12));
};

// UAE Labour Law: 21 days/yr for first 5 years, 30 days/yr after; none under 1 year
export const gratuityDays = (years: M.Money): M.Money => {
  if (years.lessThan(1)) return M.money(0);
  if (years.lessThanOrEqualTo(5)) return M.mul(years, M.money(21));
  return M.add(M.mul(M.money(5), M.money(21)), M.mul(M.sub(years, M.money(5)), M.money(30)));
};

// Next employee-style number without year: PREFIX-00001
export async function nextSeqNo(tx: Tx, companyId: string, prefix: string): Promise<string> {
  const [seq] = await tx
    .select()
    .from(numberSequences)
    .where(and(eq(numberSequences.companyId, companyId), eq(numberSequences.prefix, prefix)))
    .for('update');
  const next = seq.lastNumber + 1;
  await tx.update(numberSequences).set({ lastNumber: next }).where(eq(numberSequences.id, seq.id));
  return `${prefix}-${String(next).padStart(seq.padLength, '0')}`;
}

export const lastDayOf = (year: number, month: number): string =>
  new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
