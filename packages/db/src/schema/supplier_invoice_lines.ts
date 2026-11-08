import { pgTable, uuid, text, integer, numeric, timestamp } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { companies } from './companies';
import { supplierInvoices } from './supplier_invoices';

export const supplierInvoiceLines = pgTable('supplier_invoice_lines', {
  id: uuid('id').primaryKey().defaultRandom(),
  supplierInvoiceId: uuid('supplier_invoice_id').notNull().references(() => supplierInvoices.id, { onDelete: 'cascade' }),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  companyId: uuid('company_id').notNull().references(() => companies.id),
  lineNumber: integer('line_number').notNull(),
  itemId: uuid('item_id'),
  description: text('description').notNull(),
  qty: numeric('qty', { precision: 20, scale: 6 }).notNull(),
  unitPrice: numeric('unit_price', { precision: 20, scale: 6 }).notNull(),
  vatRate: numeric('vat_rate', { precision: 20, scale: 6 }).default('5'),
  vatAmount: numeric('vat_amount', { precision: 20, scale: 6 }).notNull(),
  lineTotal: numeric('line_total', { precision: 20, scale: 6 }).notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});
