import { pgTable, uuid, varchar, text, boolean, numeric, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { companies } from './companies';

export const leaveTypes = pgTable('leave_types', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  companyId: uuid('company_id').notNull().references(() => companies.id),
  code: varchar('code', { length: 20 }).notNull(),
  nameEn: text('name_en').notNull(),
  nameAr: text('name_ar').notNull(),
  daysPerYear: numeric('days_per_year', { precision: 20, scale: 6 }).default('30'),
  isEncashable: boolean('is_encashable').default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (t) => ({
  uniqCode: uniqueIndex('leave_types_code_company_idx').on(t.companyId, t.code),
}));
