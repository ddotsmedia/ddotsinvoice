import * as M from '@ddotsinvoice/money';

export type VatType = 'standard' | 'zero_rated' | 'exempt';
export const VAT_RATE: Record<VatType, string> = { standard: '5', zero_rated: '0', exempt: '0' };

export interface LineInput {
  description: string;
  descriptionAr?: string | null;
  quantity: string;
  unitPrice: string;
  discountPct?: string;
  vatType?: VatType;
  revenueAccountId?: string | null;
}

export interface CalcLine extends LineInput {
  vatType: VatType;
  discountPct: string;
  discountAmount: string;
  lineSubtotal: string;
  vatRate: string;
  vatAmount: string;
  lineTotal: string;
}

// Persist at 6dp (matches numeric(20,6))
const r6 = (x: M.Money): M.Money => M.money(M.toDb(x));

export function calcLine(l: LineInput): CalcLine {
  const qty = M.money(l.quantity);
  const price = M.money(l.unitPrice);
  const pct = M.money(l.discountPct ?? '0');
  const vatType: VatType = l.vatType ?? 'standard';
  if (!qty.greaterThan(0) || !price.greaterThan(0)) throw new Error('Quantity and unit price must be greater than 0');
  if (pct.lessThan(0) || pct.greaterThan(100)) throw new Error('Discount must be between 0 and 100');

  const gross = r6(M.mul(qty, price));
  const discountAmount = r6(M.mul(gross, M.div(pct, M.money(100))));
  const lineSubtotal = r6(M.sub(gross, discountAmount));
  const vatRate = M.money(VAT_RATE[vatType]);
  const vatAmount = r6(M.mul(lineSubtotal, M.div(vatRate, M.money(100))));
  const lineTotal = r6(M.add(lineSubtotal, vatAmount));
  return {
    ...l,
    vatType,
    discountPct: pct.toString(),
    discountAmount: M.toDb(discountAmount),
    lineSubtotal: M.toDb(lineSubtotal),
    vatRate: vatRate.toString(),
    vatAmount: M.toDb(vatAmount),
    lineTotal: M.toDb(lineTotal),
  };
}

export function calcTotals(lines: CalcLine[]) {
  const subtotal = lines.reduce((a, l) => M.add(a, M.money(l.lineSubtotal)), M.money(0));
  const vat = lines.reduce((a, l) => M.add(a, M.money(l.vatAmount)), M.money(0));
  const total = M.add(subtotal, vat);
  return { subtotal: M.toDb(subtotal), vatAmount: M.toDb(vat), total: M.toDb(total) };
}
