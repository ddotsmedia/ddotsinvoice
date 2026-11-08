import { pgTable, pgEnum, uuid, varchar, date, numeric, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { companies } from './companies';
import { branches } from './branches';
import { suppliers } from './suppliers';
import { goodsReceiptNotes } from './goods_receipt_notes';
import { purchaseOrders } from './purchase_orders';
import { fiscalYears } from './fiscal_years';
import { journalEntries } from './journal_entries';
import { users } from './users';

export const supplierInvStatusEnum = pgEnum('supplier_invoice_status', ['draft', 'posted', 'partially_paid', 'fully_paid', 'cancelled']);

export const supplierInvoices = pgTable('supplier_invoices', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  companyId: uuid('company_id').notNull().references(() => companies.id),
  branchId: uuid('branch_id').notNull().references(() => branches.id),
  supplierId: uuid('supplier_id').notNull().references(() => suppliers.id),
  grnId: uuid('grn_id').references(() => goodsReceiptNotes.id),
  poId: uuid('po_id').references(() => purchaseOrders.id),
  fiscalYearId: uuid('fiscal_year_id').notNull().references(() => fiscalYears.id),
  number: varchar('number', { length: 30 }).notNull(),
  supplierRef: varchar('supplier_ref', { length: 50 }),
  date: date('date').notNull(),
  dueDate: date('due_date').notNull(),
  status: supplierInvStatusEnum('status').notNull().default('draft'),
  currencyCode: varchar('currency_code', { length: 3 }).default('AED'),
  exchangeRate: numeric('exchange_rate', { precision: 20, scale: 6 }).default('1'),
  subtotal: numeric('subtotal', { precision: 20, scale: 6 }).notNull(),
  vatAmount: numeric('vat_amount', { precision: 20, scale: 6 }).notNull(),
  total: numeric('total', { precision: 20, scale: 6 }).notNull(),
  paidAmount: numeric('paid_amount', { precision: 20, scale: 6 }).default('0'),
  balanceDue: numeric('balance_due', { precision: 20, scale: 6 }).notNull(),
  journalEntryId: uuid('journal_entry_id').references(() => journalEntries.id),
  matchingStatus: varchar('matching_status', { length: 20 }).default('unmatched'),
  createdBy: uuid('created_by').notNull().references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (t) => ({
  uniqNumber: uniqueIndex('supplier_invoices_number_company_idx').on(t.companyId, t.number),
}));
