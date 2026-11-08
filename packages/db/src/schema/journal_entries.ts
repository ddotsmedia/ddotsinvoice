import { pgTable, pgEnum, uuid, varchar, text, date, numeric, timestamp } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { companies } from './companies';
import { branches } from './branches';
import { users } from './users';
import { fiscalYears } from './fiscal_years';

export const journalStatusEnum = pgEnum('journal_status', ['draft', 'posted', 'reversed']);

export const journalEntries = pgTable('journal_entries', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  companyId: uuid('company_id').notNull().references(() => companies.id),
  branchId: uuid('branch_id').references(() => branches.id),
  fiscalYearId: uuid('fiscal_year_id').notNull().references(() => fiscalYears.id),
  number: varchar('number', { length: 30 }).notNull(), // JE-2026-00001
  date: date('date').notNull(),
  description: text('description').notNull(),
  descriptionAr: text('description_ar'),
  status: journalStatusEnum('status').notNull().default('draft'),
  currency: varchar('currency', { length: 3 }).notNull().default('AED'),
  exchangeRate: numeric('exchange_rate', { precision: 20, scale: 6 }).notNull().default('1'),
  reversesId: uuid('reverses_id'),
  reversedById: uuid('reversed_by_id'),
  postedAt: timestamp('posted_at'),
  postedBy: uuid('posted_by').references(() => users.id),
  createdBy: uuid('created_by').notNull().references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});
