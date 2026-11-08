import { pgTable, pgEnum, uuid, text, integer, timestamp, index } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { companies } from './companies';
import { users } from './users';

export const budgetStatusEnum = pgEnum('budget_status', ['draft', 'approved', 'closed']);

export const budgets = pgTable('budgets', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  companyId: uuid('company_id').notNull().references(() => companies.id),
  name: text('name').notNull(),
  fiscalYear: integer('fiscal_year').notNull(),
  fiscalMonth: integer('fiscal_month'), // null = annual
  status: budgetStatusEnum('status').notNull().default('draft'),
  approvedBy: uuid('approved_by').references(() => users.id),
  approvedAt: timestamp('approved_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (t) => ({
  idxYear: index('idx_budgets_company_year').on(t.companyId, t.fiscalYear),
}));
