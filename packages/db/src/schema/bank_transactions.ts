import { pgTable, pgEnum, uuid, varchar, text, date, numeric, boolean, timestamp, index } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { companies } from './companies';
import { bankAccounts } from './bank_accounts';
import { fiscalYears } from './fiscal_years';
import { journalEntries } from './journal_entries';
import { users } from './users';

export const bankTxTypeEnum = pgEnum('bank_tx_type', ['deposit', 'withdrawal', 'transfer', 'bank_charge', 'interest']);

export const bankTransactions = pgTable('bank_transactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  companyId: uuid('company_id').notNull().references(() => companies.id),
  bankAccountId: uuid('bank_account_id').notNull().references(() => bankAccounts.id),
  fiscalYearId: uuid('fiscal_year_id').notNull().references(() => fiscalYears.id),
  number: varchar('number', { length: 30 }).notNull(), // BTXN-2026-00001
  date: date('date').notNull(),
  type: bankTxTypeEnum('type').notNull(),
  amount: numeric('amount', { precision: 20, scale: 6 }).notNull(),
  description: text('description'),
  reference: varchar('reference', { length: 100 }),
  isReconciled: boolean('is_reconciled').default(false),
  reconciledAt: timestamp('reconciled_at'),
  journalEntryId: uuid('journal_entry_id').references(() => journalEntries.id),
  relatedPaymentId: uuid('related_payment_id'),
  relatedPaymentType: varchar('related_payment_type', { length: 20 }), // customer|supplier
  createdBy: uuid('created_by').notNull().references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (t) => ({
  idxAccountDate: index('idx_bank_txn_account_date').on(t.bankAccountId, t.date),
}));
