import { pgTable, uuid, varchar, text, boolean, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';

export const companies = pgTable('companies', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  name: varchar('name', { length: 255 }).notNull(),
  nameAr: varchar('name_ar', { length: 255 }),
  trn: varchar('trn', { length: 15 }),
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 20 }),
  address: text('address'),
  addressAr: text('address_ar'),
  currency: varchar('currency', { length: 3 }).notNull().default('AED'),
  fiscalYearStart: varchar('fiscal_year_start', { length: 5 }).notNull().default('01-01'),
  logoUrl: text('logo_url'),
  settings: jsonb('settings').default({}),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  deletedAt: timestamp('deleted_at'),
});
