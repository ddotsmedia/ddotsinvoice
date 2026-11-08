import { pgTable, uuid, numeric, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { companies } from './companies';
import { inventoryItems } from './inventory_items';
import { warehouses } from './warehouses';

export const inventoryBalances = pgTable('inventory_balances', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  companyId: uuid('company_id').notNull().references(() => companies.id),
  itemId: uuid('item_id').notNull().references(() => inventoryItems.id),
  warehouseId: uuid('warehouse_id').notNull().references(() => warehouses.id),
  qty: numeric('qty', { precision: 20, scale: 6 }).default('0'),
  avgCost: numeric('avg_cost', { precision: 20, scale: 6 }).default('0'),
  totalValue: numeric('total_value', { precision: 20, scale: 6 }).default('0'),
  lastMovedAt: timestamp('last_moved_at'),
}, (t) => ({
  uniqBalance: uniqueIndex('inventory_balances_tenant_company_item_wh_idx').on(t.tenantId, t.companyId, t.itemId, t.warehouseId),
}));
