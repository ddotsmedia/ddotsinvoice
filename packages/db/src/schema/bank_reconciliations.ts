import { pgTable, pgEnum, uuid, date, numeric, timestamp } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { companies } from './companies';
import { bankAccounts } from './bank_accounts';
import { fiscalYears } from './fiscal_years';
import { users } from './users';

export const reconciliationStatusEnum = pgEnum('reconciliation_status', ['open', 'closed']);

export const bankReconciliations = pgTable('bank_reconciliations', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  companyId: uuid('company_id').notNull().references(() => companies.id),
  bankAccountId: uuid('bank_account_id').notNull().references(() => bankAccounts.id),
  fiscalYearId: uuid('fiscal_year_id').notNull().references(() => fiscalYears.id),
  statementDate: date('statement_date').notNull(),
  openingBalance: numeric('opening_balance', { precision: 20, scale: 6 }).notNull(),
  closingBalance: numeric('closing_balance', { precision: 20, scale: 6 }).notNull(),
  status: reconciliationStatusEnum('status').notNull().default('open'),
  closedAt: timestamp('closed_at'),
  closedBy: uuid('closed_by').references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});
