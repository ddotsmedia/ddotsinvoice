import { pgTable, pgEnum, uuid, varchar, date, timestamp } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { companies } from './companies';
import { users } from './users';

export const fiscalYearStatusEnum = pgEnum('fiscal_year_status', ['open', 'closed', 'locked']);

export const fiscalYears = pgTable('fiscal_years', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  companyId: uuid('company_id').notNull().references(() => companies.id),
  name: varchar('name', { length: 50 }).notNull(),
  startDate: date('start_date').notNull(),
  endDate: date('end_date').notNull(),
  status: fiscalYearStatusEnum('status').notNull().default('open'),
  closedAt: timestamp('closed_at'),
  closedBy: uuid('closed_by').references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});
