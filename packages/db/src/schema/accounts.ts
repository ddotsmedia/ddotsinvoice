import { pgTable, pgEnum, uuid, varchar, text, boolean, timestamp, integer, uniqueIndex } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { companies } from './companies';

export const accountTypeEnum = pgEnum('account_type', ['asset', 'liability', 'equity', 'revenue', 'expense']);
export const normalBalanceEnum = pgEnum('normal_balance', ['debit', 'credit']);

export const accounts = pgTable('accounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  companyId: uuid('company_id').notNull().references(() => companies.id),
  parentId: uuid('parent_id'), // self-ref via relations()
  code: varchar('code', { length: 20 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  nameAr: varchar('name_ar', { length: 255 }),
  type: accountTypeEnum('type').notNull(),
  normalBalance: normalBalanceEnum('normal_balance').notNull(),
  level: integer('level').notNull().default(1), // 1=root, max 5
  isHeader: boolean('is_header').notNull().default(false), // header accounts cannot post
  isSystem: boolean('is_system').notNull().default(false), // system accounts cannot be deleted
  currency: varchar('currency', { length: 3 }).notNull().default('AED'),
  description: text('description'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  deletedAt: timestamp('deleted_at'),
}, (t) => ({
  uniqCode: uniqueIndex('accounts_code_company_idx').on(t.companyId, t.code),
}));
