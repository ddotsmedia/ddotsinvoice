import { accounts, numberSequences, Tx, warehouses } from '@ddotsinvoice/db';

// System chart of accounts seeded on company create
const COA_SEED = [
  { code: '1000', name: 'Assets', type: 'asset', normalBalance: 'debit', isHeader: true },
  { code: '1100', name: 'Cash & Bank', type: 'asset', normalBalance: 'debit', isHeader: false },
  { code: '1200', name: 'Accounts Receivable', type: 'asset', normalBalance: 'debit', isHeader: false },
  { code: '2000', name: 'Liabilities', type: 'liability', normalBalance: 'credit', isHeader: true },
  { code: '2100', name: 'Accounts Payable', type: 'liability', normalBalance: 'credit', isHeader: false },
  { code: '3000', name: 'Equity', type: 'equity', normalBalance: 'credit', isHeader: true },
  { code: '3100', name: 'Retained Earnings', type: 'equity', normalBalance: 'credit', isHeader: false },
  { code: '4000', name: 'Revenue', type: 'revenue', normalBalance: 'credit', isHeader: true },
  { code: '5000', name: 'Expenses', type: 'expense', normalBalance: 'debit', isHeader: true },
  { code: '2200', name: 'VAT Payable', type: 'liability', normalBalance: 'credit', isHeader: false },
] as const;

export async function seedCompanyDefaults(tx: Tx, tenantId: string, companyId: string): Promise<void> {
  await tx.insert(accounts).values(
    COA_SEED.map((a) => ({
      tenantId,
      companyId,
      code: a.code,
      name: a.name,
      type: a.type,
      normalBalance: a.normalBalance,
      isHeader: a.isHeader,
      isSystem: true,
    })),
  );
  await tx.insert(numberSequences).values(
    ['JE', 'INV', 'CN', 'QT', 'PO', 'GRN', 'SINV', 'RCPT', 'PAY', 'BTXN', 'EMP'].map((prefix) => ({ tenantId, companyId, prefix, lastNumber: 0, padLength: 5 })),
  );
  await tx.insert(warehouses).values({ tenantId, companyId, code: 'MAIN', nameEn: 'Main Warehouse', nameAr: 'المستودع الرئيسي', isDefault: true });
}
