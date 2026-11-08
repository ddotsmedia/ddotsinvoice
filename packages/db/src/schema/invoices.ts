import { pgTable, pgEnum, uuid, varchar, text, date, integer, numeric, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { companies } from './companies';
import { branches } from './branches';
import { users } from './users';
import { customers } from './customers';
import { fiscalYears } from './fiscal_years';
import { journalEntries } from './journal_entries';

export const invoiceTypeEnum = pgEnum('invoice_type', ['quote', 'invoice', 'credit_note']);
export const invoiceStatusEnum = pgEnum('invoice_status', [
  'draft', 'sent', 'posted', 'paid', 'partially_paid', 'overdue', 'void', 'converted',
]);
export const vatTypeEnum = pgEnum('vat_type', ['standard', 'zero_rated', 'exempt']);

export const invoices = pgTable('invoices', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  companyId: uuid('company_id').notNull().references(() => companies.id),
  branchId: uuid('branch_id').references(() => branches.id),
  customerId: uuid('customer_id').notNull().references(() => customers.id),
  type: invoiceTypeEnum('type').notNull(),
  status: invoiceStatusEnum('status').notNull().default('draft'),
  number: varchar('number', { length: 30 }).notNull(),
  date: date('date').notNull(),
  dueDate: date('due_date'),
  paymentTerms: integer('payment_terms').notNull().default(30),
  currency: varchar('currency', { length: 3 }).notNull().default('AED'),
  exchangeRate: numeric('exchange_rate', { precision: 20, scale: 6 }).notNull().default('1'),
  subtotal: numeric('subtotal', { precision: 20, scale: 6 }).notNull().default('0'),
  vatAmount: numeric('vat_amount', { precision: 20, scale: 6 }).notNull().default('0'),
  total: numeric('total', { precision: 20, scale: 6 }).notNull().default('0'),
  paidAmount: numeric('paid_amount', { precision: 20, scale: 6 }).notNull().default('0'),
  balanceDue: numeric('balance_due', { precision: 20, scale: 6 }).notNull().default('0'),
  notes: text('notes'),
  notesAr: text('notes_ar'),
  termsAndConditions: text('terms_and_conditions'),
  journalEntryId: uuid('journal_entry_id').references(() => journalEntries.id),
  convertedFromId: uuid('converted_from_id'), // quote→invoice
  creditNoteForId: uuid('credit_note_for_id'), // credit note → original invoice
  fiscalYearId: uuid('fiscal_year_id').notNull().references(() => fiscalYears.id),
  postedAt: timestamp('posted_at'),
  postedBy: uuid('posted_by').references(() => users.id),
  createdBy: uuid('created_by').notNull().references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (t) => ({
  uniqNumber: uniqueIndex('invoices_number_company_idx').on(t.companyId, t.number),
}));
