import { pgTable, uuid, varchar, integer, numeric, timestamp } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { companies } from './companies';
import { invoices, vatTypeEnum } from './invoices';
import { accounts } from './accounts';

export const invoice_lines = pgTable('invoice_lines', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  companyId: uuid('company_id').notNull().references(() => companies.id),
  invoiceId: uuid('invoice_id').notNull().references(() => invoices.id, { onDelete: 'cascade' }),
  sortOrder: integer('sort_order').notNull().default(0),
  description: varchar('description', { length: 500 }).notNull(),
  descriptionAr: varchar('description_ar', { length: 500 }),
  quantity: numeric('quantity', { precision: 20, scale: 6 }).notNull().default('1'),
  unitPrice: numeric('unit_price', { precision: 20, scale: 6 }).notNull(),
  discountPct: numeric('discount_pct', { precision: 5, scale: 2 }).notNull().default('0'),
  discountAmount: numeric('discount_amount', { precision: 20, scale: 6 }).notNull().default('0'),
  lineSubtotal: numeric('line_subtotal', { precision: 20, scale: 6 }).notNull(), // qty*price-discount
  vatType: vatTypeEnum('vat_type').notNull().default('standard'),
  vatRate: numeric('vat_rate', { precision: 5, scale: 2 }).notNull().default('5'),
  vatAmount: numeric('vat_amount', { precision: 20, scale: 6 }).notNull().default('0'),
  lineTotal: numeric('line_total', { precision: 20, scale: 6 }).notNull(), // subtotal+vat
  revenueAccountId: uuid('revenue_account_id').references(() => accounts.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});
