import { and, eq } from 'drizzle-orm';
import { accounts, Tx } from '@ddotsinvoice/db';
import * as M from '@ddotsinvoice/money';
import { AccountType, normalFor } from '../modules/accounting/accounting.util';

// Line amounts: subtotal = qty*price - discount; vat = subtotal*rate/100
export const lineCalc = (qty: string, price: string, discount = '0', vatRate = '5'): { subtotal: M.Money; vat: M.Money; total: M.Money } => {
  const subtotal = M.sub(M.mul(M.money(qty), M.money(price)), M.money(discount));
  const vat = M.mul(subtotal, M.div(M.money(vatRate), M.money(100)));
  return { subtotal, vat, total: M.add(subtotal, vat) };
};

export const sumM = (xs: M.Money[]): M.Money => xs.reduce((a, x) => M.add(a, x), M.money(0));

// Returns id of account code, creating it (system, postable) if missing
export async function ensureAccount(
  tx: Tx,
  tenantId: string,
  companyId: string,
  code: string,
  nameEn: string,
  type: AccountType,
): Promise<string> {
  await tx
    .insert(accounts)
    .values({ tenantId, companyId, code, name: nameEn, type, normalBalance: normalFor(type), isSystem: true })
    .onConflictDoNothing({ target: [accounts.companyId, accounts.code] });
  const [a] = await tx
    .select({ id: accounts.id })
    .from(accounts)
    .where(and(eq(accounts.companyId, companyId), eq(accounts.code, code)))
    .limit(1);
  return a.id;
}
