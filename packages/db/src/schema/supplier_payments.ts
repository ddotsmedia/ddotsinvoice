import { pgTable, pgEnum, uuid, varchar, text, date, numeric, timestamp, index } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { companies } from './companies';
import { branches } from './branches';
import { suppliers } from './suppliers';
import { fiscalYears } from './fiscal_years';
import { bankAccounts } from './bank_accounts';
import { journalEntries } from './journal_entries';
import { users } from './users';
import { paymentMethodEnum } from './payment_methods';

export const supplierPaymentStatusEnum = pgEnum('supplier_payment_status', ['draft', 'posted', 'reconciled', 'voided']);

export const supplierPayments = pgTable('supplier_payments', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  companyId: uuid('company_id').notNull().references(() => companies.id),
  branchId: uuid('branch_id').notNull().references(() => branches.id),
  supplierId: uuid('supplier_id').notNull().references(() => suppliers.id),
  fiscalYearId: uuid('fiscal_year_id').notNull().references(() => fiscalYears.id),
  number: varchar('number', { length: 30 }).notNull(), // PAY-2026-00001
  date: date('date').notNull(),
  amount: numeric('amount', { precision: 20, scale: 6 }).notNull(),
  currencyCode: varchar('currency_code', { length: 3 }).default('AED'),
  exchangeRate: numeric('exchange_rate', { precision: 20, scale: 6 }).default('1'),
  paymentMethod: paymentMethodEnum('payment_method').notNull(),
  bankAccountId: uuid('bank_account_id').references(() => bankAccounts.id),
  reference: varchar('reference', { length: 100 }),
  notes: text('notes'),
  status: supplierPaymentStatusEnum('status').notNull().default('draft'),
  journalEntryId: uuid('journal_entry_id').references(() => journalEntries.id),
  createdBy: uuid('created_by').notNull().references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (t) => ({
  idxSupplier: index('idx_supplier_payments_supplier').on(t.supplierId),
}));
