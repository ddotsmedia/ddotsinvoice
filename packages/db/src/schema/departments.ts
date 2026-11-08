import { pgTable, uuid, varchar, text, boolean, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { companies } from './companies';

export const departments = pgTable('departments', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  companyId: uuid('company_id').notNull().references(() => companies.id),
  code: varchar('code', { length: 20 }).notNull(),
  nameEn: text('name_en').notNull(),
  nameAr: text('name_ar').notNull(),
  managerId: uuid('manager_id'), // employee id (no FK to avoid cycle)
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (t) => ({
  uniqCode: uniqueIndex('departments_code_company_idx').on(t.companyId, t.code),
}));
