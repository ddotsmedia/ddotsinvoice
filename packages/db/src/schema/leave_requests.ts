import { pgTable, pgEnum, uuid, date, text, numeric, timestamp } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { companies } from './companies';
import { employees } from './employees';
import { leaveTypes } from './leave_types';
import { users } from './users';

export const leaveStatusEnum = pgEnum('leave_status', ['pending', 'approved', 'rejected', 'cancelled']);

export const leaveRequests = pgTable('leave_requests', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  companyId: uuid('company_id').notNull().references(() => companies.id),
  employeeId: uuid('employee_id').notNull().references(() => employees.id),
  leaveTypeId: uuid('leave_type_id').notNull().references(() => leaveTypes.id),
  startDate: date('start_date').notNull(),
  endDate: date('end_date').notNull(),
  days: numeric('days', { precision: 20, scale: 6 }).notNull(),
  status: leaveStatusEnum('status').notNull().default('pending'),
  approvedBy: uuid('approved_by').references(() => users.id),
  approvedAt: timestamp('approved_at'),
  notes: text('notes'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});
