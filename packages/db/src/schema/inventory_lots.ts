import { pgTable, uuid, numeric, date, timestamp } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { companies } from './companies';
import { inventoryItems } from './inventory_items';
import { warehouses } from './warehouses';
import { goodsReceiptLines } from './goods_receipt_lines';

export const inventoryLots = pgTable('inventory_lots', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  companyId: uuid('company_id').notNull().references(() => companies.id),
  itemId: uuid('item_id').notNull().references(() => inventoryItems.id),
  warehouseId: uuid('warehouse_id').notNull().references(() => warehouses.id),
  grnLineId: uuid('grn_line_id').references(() => goodsReceiptLines.id),
  originalQty: numeric('original_qty', { precision: 20, scale: 6 }).notNull(),
  remainingQty: numeric('remaining_qty', { precision: 20, scale: 6 }).notNull(),
  unitCost: numeric('unit_cost', { precision: 20, scale: 6 }).notNull(),
  receivedDate: date('received_date').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});
