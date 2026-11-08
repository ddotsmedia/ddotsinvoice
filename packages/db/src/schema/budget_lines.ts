import { pgTable, uuid, numeric, timestamp } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { companies } from './companies';
import { budgets } from './budgets';
import { accounts } from './accounts';

export const budgetLines = pgTable('budget_lines', {
  id: uuid('id').primaryKey().defaultRandom(),
  budgetId: uuid('budget_id').notNull().references(() => budgets.id, { onDelete: 'cascade' }),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  companyId: uuid('company_id').notNull().references(() => companies.id),
  accountId: uuid('account_id').notNull().references(() => accounts.id),
  budgetedAmount: numeric('budgeted_amount', { precision: 20, scale: 6 }).notNull(),
  actualAmount: numeric('actual_amount', { precision: 20, scale: 6 }).notNull().default('0'),
  variance: numeric('variance', { precision: 20, scale: 6 }).notNull().default('0'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});
