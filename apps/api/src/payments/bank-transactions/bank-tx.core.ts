import { bankTransactions, Tx } from '@ddotsinvoice/db';
import * as M from '@ddotsinvoice/money';
import { nextNumber } from '../../modules/accounting/accounting.util';

export type BankTxType = 'deposit' | 'withdrawal' | 'transfer' | 'bank_charge' | 'interest';

// Money in: deposit/interest. Money out: withdrawal/bank_charge/transfer.
export const signOf = (t: BankTxType): 1 | -1 => (t === 'deposit' || t === 'interest' ? 1 : -1);

export interface BankTxInput {
  tenantId: string;
  companyId: string;
  bankAccountId: string;
  fiscalYearId: string;
  date: string;
  type: BankTxType;
  amount: M.Money;
  description?: string | null;
  reference?: string | null;
  relatedPaymentId?: string;
  relatedPaymentType?: 'customer' | 'supplier';
  userId: string;
}

// Inserts a numbered bank transaction row (journal linked separately)
export async function insertBankTx(tx: Tx, p: BankTxInput) {
  const number = await nextNumber(tx, p.companyId, 'BTXN', p.date.slice(0, 4));
  const [row] = await tx
    .insert(bankTransactions)
    .values({
      tenantId: p.tenantId,
      companyId: p.companyId,
      bankAccountId: p.bankAccountId,
      fiscalYearId: p.fiscalYearId,
      number,
      date: p.date,
      type: p.type,
      amount: M.toDb(p.amount),
      description: p.description ?? null,
      reference: p.reference ?? null,
      relatedPaymentId: p.relatedPaymentId,
      relatedPaymentType: p.relatedPaymentType,
      createdBy: p.userId,
    })
    .returning();
  return row;
}
