import { pgTable, uuid, varchar, text, integer, boolean, timestamp, jsonb, uniqueIndex } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { companies } from './companies';
import { accounts } from './accounts';

export const suppliers = pgTable('suppliers', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  companyId: uuid('company_id').notNull().references(() => companies.id),
  code: varchar('code', { length: 30 }).notNull(),
  nameEn: text('name_en').notNull(),
  nameAr: text('name_ar').notNull(),
  trn: varchar('trn', { length: 15 }),
  paymentTerms: integer('payment_terms').default(30),
  defaultApAccountId: uuid('default_ap_account_id').references(() => accounts.id),
  currencyCode: varchar('currency_code', { length: 3 }).default('AED'),
  isActive: boolean('is_active').default(true),
  address: jsonb('address'),
  contactJson: jsonb('contact_json'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (t) => ({
  uniqCode: uniqueIndex('suppliers_code_company_idx').on(t.companyId, t.code),
}));
