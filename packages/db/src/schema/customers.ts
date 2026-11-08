import { pgTable, uuid, varchar, text, boolean, timestamp, integer, numeric } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { companies } from './companies';
import { accounts } from './accounts';

export const customers = pgTable('customers', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  companyId: uuid('company_id').notNull().references(() => companies.id),
  name: varchar('name', { length: 255 }).notNull(),
  nameAr: varchar('name_ar', { length: 255 }),
  trn: varchar('trn', { length: 15 }), // UAE TRN, validated if provided
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 20 }),
  address: text('address'),
  addressAr: text('address_ar'),
  paymentTerms: integer('payment_terms').notNull().default(30), // days
  creditLimit: numeric('credit_limit', { precision: 20, scale: 6 }).default('0'),
  currency: varchar('currency', { length: 3 }).notNull().default('AED'),
  accountId: uuid('account_id').references(() => accounts.id), // AR sub-account
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  deletedAt: timestamp('deleted_at'),
});
