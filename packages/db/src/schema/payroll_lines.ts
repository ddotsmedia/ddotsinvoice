import { pgTable, pgEnum, uuid, integer, numeric, jsonb, timestamp, index } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { companies } from './companies';
import { payrollRuns } from './payroll_runs';
import { employees } from './employees';

export const payrollLineStatusEnum = pgEnum('payroll_line_status', ['included', 'excluded']);

export const payrollLines = pgTable('payroll_lines', {
  id: uuid('id').primaryKey().defaultRandom(),
  payrollRunId: uuid('payroll_run_id').notNull().references(() => payrollRuns.id, { onDelete: 'cascade' }),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  companyId: uuid('company_id').notNull().references(() => companies.id),
  employeeId: uuid('employee_id').notNull().references(() => employees.id),
  basicSalary: numeric('basic_salary', { precision: 20, scale: 6 }).notNull(),
  housingAllowance: numeric('housing_allowance', { precision: 20, scale: 6 }).notNull(),
  transportAllowance: numeric('transport_allowance', { precision: 20, scale: 6 }).notNull(),
  otherAllowances: numeric('other_allowances', { precision: 20, scale: 6 }).notNull(),
  grossSalary: numeric('gross_salary', { precision: 20, scale: 6 }).notNull(),
  deductions: numeric('deductions', { precision: 20, scale: 6 }).default('0'),
  deductionDetails: jsonb('deduction_details'),
  netSalary: numeric('net_salary', { precision: 20, scale: 6 }).notNull(),
  workingDays: integer('working_days').default(30),
  paidDays: numeric('paid_days', { precision: 20, scale: 6 }).default('30'),
  status: payrollLineStatusEnum('status').notNull().default('included'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (t) => ({
  idxRun: index('idx_payroll_lines_run').on(t.payrollRunId),
}));
