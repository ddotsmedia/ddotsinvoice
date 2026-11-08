import { pgTable, uuid, varchar, text, boolean, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { companies } from './companies';
import { branches } from './branches';
import { accounts } from './accounts';

export const bankAccounts = pgTable('bank_accounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  companyId: uuid('company_id').notNull().references(() => companies.id),
  branchId: uuid('branch_id').references(() => branches.id),
  code: varchar('code', { length: 20 }).notNull(),
  nameEn: text('name_en').notNull(),
  nameAr: text('name_ar').notNull(),
  bankName: text('bank_name').notNull(),
  accountNumber: varchar('account_number', { length: 50 }).notNull(),
  iban: varchar('iban', { length: 34 }),
  currency: varchar('currency', { length: 3 }).default('AED'),
  glAccountId: uuid('gl_account_id').notNull().references(() => accounts.id),
  isDefault: boolean('is_default').default(false),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (t) => ({
  uniqCode: uniqueIndex('bank_accounts_code_company_idx').on(t.companyId, t.code),
}));
