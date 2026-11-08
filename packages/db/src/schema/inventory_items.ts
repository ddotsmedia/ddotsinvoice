import { pgTable, pgEnum, uuid, varchar, text, boolean, numeric, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { companies } from './companies';
import { accounts } from './accounts';

export const costMethodEnum = pgEnum('cost_method', ['fifo', 'avco']);

export const inventoryItems = pgTable('inventory_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  companyId: uuid('company_id').notNull().references(() => companies.id),
  code: varchar('code', { length: 30 }).notNull(),
  nameEn: text('name_en').notNull(),
  nameAr: text('name_ar').notNull(),
  unit: varchar('unit', { length: 20 }).notNull(),
  costMethod: costMethodEnum('cost_method').notNull().default('avco'),
  inventoryAccountId: uuid('inventory_account_id').notNull().references(() => accounts.id),
  cogsAccountId: uuid('cogs_account_id').notNull().references(() => accounts.id),
  reorderPoint: numeric('reorder_point', { precision: 20, scale: 6 }).default('0'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (t) => ({
  uniqCode: uniqueIndex('inventory_items_code_company_idx').on(t.companyId, t.code),
}));
