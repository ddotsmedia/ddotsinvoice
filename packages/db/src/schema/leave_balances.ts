import { pgTable, uuid, integer, numeric, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { companies } from './companies';
import { employees } from './employees';
import { leaveTypes } from './leave_types';

export const leaveBalances = pgTable('leave_balances', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  companyId: uuid('company_id').notNull().references(() => companies.id),
  employeeId: uuid('employee_id').notNull().references(() => employees.id),
  leaveTypeId: uuid('leave_type_id').notNull().references(() => leaveTypes.id),
  year: integer('year').notNull(),
  accrued: numeric('accrued', { precision: 20, scale: 6 }).default('0'),
  taken: numeric('taken', { precision: 20, scale: 6 }).default('0'),
  balance: numeric('balance', { precision: 20, scale: 6 }).default('0'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (t) => ({
  uniqBalance: uniqueIndex('leave_balances_unique_idx').on(t.tenantId, t.companyId, t.employeeId, t.leaveTypeId, t.year),
}));
