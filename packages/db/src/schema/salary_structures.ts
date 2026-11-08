import { pgTable, uuid, date, numeric, boolean, timestamp } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { companies } from './companies';
import { employees } from './employees';

export const salaryStructures = pgTable('salary_structures', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  companyId: uuid('company_id').notNull().references(() => companies.id),
  employeeId: uuid('employee_id').notNull().references(() => employees.id),
  effectiveDate: date('effective_date').notNull(),
  basicSalary: numeric('basic_salary', { precision: 20, scale: 6 }).notNull(),
  housingAllowance: numeric('housing_allowance', { precision: 20, scale: 6 }).default('0'),
  transportAllowance: numeric('transport_allowance', { precision: 20, scale: 6 }).default('0'),
  otherAllowances: numeric('other_allowances', { precision: 20, scale: 6 }).default('0'),
  grossSalary: numeric('gross_salary', { precision: 20, scale: 6 }).notNull(),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});
