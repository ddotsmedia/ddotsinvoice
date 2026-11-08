import { pgTable, pgEnum, uuid, varchar, text, date, numeric, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { companies } from './companies';
import { branches } from './branches';
import { suppliers } from './suppliers';
import { fiscalYears } from './fiscal_years';
import { users } from './users';

export const poStatusEnum = pgEnum('po_status', ['draft', 'submitted', 'approved', 'partially_received', 'fully_received', 'cancelled']);

export const purchaseOrders = pgTable('purchase_orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  companyId: uuid('company_id').notNull().references(() => companies.id),
  branchId: uuid('branch_id').notNull().references(() => branches.id),
  supplierId: uuid('supplier_id').notNull().references(() => suppliers.id),
  fiscalYearId: uuid('fiscal_year_id').notNull().references(() => fiscalYears.id),
  number: varchar('number', { length: 30 }).notNull(),
  date: date('date').notNull(),
  expectedDeliveryDate: date('expected_delivery_date'),
  status: poStatusEnum('status').notNull().default('draft'),
  currencyCode: varchar('currency_code', { length: 3 }).default('AED'),
  exchangeRate: numeric('exchange_rate', { precision: 20, scale: 6 }).default('1'),
  subtotal: numeric('subtotal', { precision: 20, scale: 6 }).notNull(),
  vatAmount: numeric('vat_amount', { precision: 20, scale: 6 }).notNull(),
  total: numeric('total', { precision: 20, scale: 6 }).notNull(),
  notes: text('notes'),
  approvedBy: uuid('approved_by').references(() => users.id),
  approvedAt: timestamp('approved_at'),
  createdBy: uuid('created_by').notNull().references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (t) => ({
  idxTenantCompany: index('idx_po_tenant_company').on(t.tenantId, t.companyId),
  uniqNumber: uniqueIndex('purchase_orders_number_company_idx').on(t.companyId, t.number),
}));
