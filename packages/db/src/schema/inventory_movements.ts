import { pgTable, pgEnum, uuid, varchar, date, numeric, timestamp, index } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { companies } from './companies';
import { inventoryItems } from './inventory_items';
import { warehouses } from './warehouses';

export const movementTypeEnum = pgEnum('movement_type', [
  'grn_in', 'invoice_out', 'adjustment_in', 'adjustment_out', 'transfer_in', 'transfer_out',
]);

export const inventoryMovements = pgTable('inventory_movements', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  companyId: uuid('company_id').notNull().references(() => companies.id),
  itemId: uuid('item_id').notNull().references(() => inventoryItems.id),
  warehouseId: uuid('warehouse_id').notNull().references(() => warehouses.id),
  type: movementTypeEnum('type').notNull(),
  refType: varchar('ref_type', { length: 30 }).notNull(),
  refId: uuid('ref_id').notNull(),
  date: date('date').notNull(),
  qty: numeric('qty', { precision: 20, scale: 6 }).notNull(), // +in / -out
  unitCost: numeric('unit_cost', { precision: 20, scale: 6 }).notNull(),
  totalCost: numeric('total_cost', { precision: 20, scale: 6 }).notNull(),
  qtyBefore: numeric('qty_before', { precision: 20, scale: 6 }).notNull(),
  qtyAfter: numeric('qty_after', { precision: 20, scale: 6 }).notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (t) => ({
  idxItemWarehouse: index('idx_inv_movements_item_warehouse').on(t.itemId, t.warehouseId),
}));
