import { pgTable, uuid, text, integer, numeric, timestamp } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { companies } from './companies';
import { goodsReceiptNotes } from './goods_receipt_notes';
import { purchaseOrderLines } from './purchase_order_lines';
import { warehouses } from './warehouses';

export const goodsReceiptLines = pgTable('goods_receipt_lines', {
  id: uuid('id').primaryKey().defaultRandom(),
  grnId: uuid('grn_id').notNull().references(() => goodsReceiptNotes.id, { onDelete: 'cascade' }),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  companyId: uuid('company_id').notNull().references(() => companies.id),
  poLineId: uuid('po_line_id').references(() => purchaseOrderLines.id),
  lineNumber: integer('line_number').notNull(),
  itemId: uuid('item_id'),
  description: text('description').notNull(),
  qtyReceived: numeric('qty_received', { precision: 20, scale: 6 }).notNull(),
  unitCost: numeric('unit_cost', { precision: 20, scale: 6 }).notNull(),
  vatRate: numeric('vat_rate', { precision: 20, scale: 6 }).default('5'),
  vatAmount: numeric('vat_amount', { precision: 20, scale: 6 }).notNull(),
  lineTotal: numeric('line_total', { precision: 20, scale: 6 }).notNull(),
  warehouseId: uuid('warehouse_id').notNull().references(() => warehouses.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});
