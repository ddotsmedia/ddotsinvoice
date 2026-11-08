import { pgTable, uuid, text, integer, numeric, timestamp } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { companies } from './companies';
import { purchaseOrders } from './purchase_orders';
import { accounts } from './accounts';

export const purchaseOrderLines = pgTable('purchase_order_lines', {
  id: uuid('id').primaryKey().defaultRandom(),
  poId: uuid('po_id').notNull().references(() => purchaseOrders.id, { onDelete: 'cascade' }),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  companyId: uuid('company_id').notNull().references(() => companies.id),
  lineNumber: integer('line_number').notNull(),
  itemId: uuid('item_id'),
  description: text('description').notNull(),
  qty: numeric('qty', { precision: 20, scale: 6 }).notNull(),
  unitPrice: numeric('unit_price', { precision: 20, scale: 6 }).notNull(),
  discount: numeric('discount', { precision: 20, scale: 6 }).default('0'),
  vatRate: numeric('vat_rate', { precision: 20, scale: 6 }).default('5'),
  vatAmount: numeric('vat_amount', { precision: 20, scale: 6 }).notNull(),
  lineTotal: numeric('line_total', { precision: 20, scale: 6 }).notNull(),
  inventoryAccountId: uuid('inventory_account_id').references(() => accounts.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});
