import { pgTable, pgEnum, uuid, date, numeric, timestamp } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { companies } from './companies';
import { employees } from './employees';
import { journalEntries } from './journal_entries';

export const eosStatusEnum = pgEnum('eos_status', ['draft', 'approved', 'paid']);

export const endOfService = pgTable('end_of_service', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  companyId: uuid('company_id').notNull().references(() => companies.id),
  employeeId: uuid('employee_id').notNull().references(() => employees.id),
  terminationDate: date('termination_date').notNull(),
  lastBasicSalary: numeric('last_basic_salary', { precision: 20, scale: 6 }).notNull(),
  yearsOfService: numeric('years_of_service', { precision: 20, scale: 6 }).notNull(),
  gratuityAmount: numeric('gratuity_amount', { precision: 20, scale: 6 }).notNull(),
  leaveEncashment: numeric('leave_encashment', { precision: 20, scale: 6 }).default('0'),
  otherSettlements: numeric('other_settlements', { precision: 20, scale: 6 }).default('0'),
  totalAmount: numeric('total_amount', { precision: 20, scale: 6 }).notNull(),
  status: eosStatusEnum('status').notNull().default('draft'),
  journalEntryId: uuid('journal_entry_id').references(() => journalEntries.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});
