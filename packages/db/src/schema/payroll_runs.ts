import { pgTable, pgEnum, uuid, integer, numeric, boolean, text, timestamp, uniqueIndex, index } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { companies } from './companies';
import { branches } from './branches';
import { journalEntries } from './journal_entries';
import { users } from './users';

export const payrollStatusEnum = pgEnum('payroll_status', ['draft', 'approved', 'paid', 'cancelled']);

export const payrollRuns = pgTable('payroll_runs', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  companyId: uuid('company_id').notNull().references(() => companies.id),
  branchId: uuid('branch_id').references(() => branches.id),
  periodYear: integer('period_year').notNull(),
  periodMonth: integer('period_month').notNull(),
  status: payrollStatusEnum('status').notNull().default('draft'),
  totalGross: numeric('total_gross', { precision: 20, scale: 6 }).default('0'),
  totalDeductions: numeric('total_deductions', { precision: 20, scale: 6 }).default('0'),
  totalNet: numeric('total_net', { precision: 20, scale: 6 }).default('0'),
  journalEntryId: uuid('journal_entry_id').references(() => journalEntries.id),
  wpsFileGenerated: boolean('wps_file_generated').default(false),
  wpsFileName: text('wps_file_name'),
  approvedBy: uuid('approved_by').references(() => users.id),
  approvedAt: timestamp('approved_at'),
  paidAt: timestamp('paid_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (t) => ({
  uniqPeriod: uniqueIndex('payroll_runs_period_idx').on(t.tenantId, t.companyId, t.periodYear, t.periodMonth),
  idxPeriod: index('idx_payroll_runs_period').on(t.companyId, t.periodYear, t.periodMonth),
}));
