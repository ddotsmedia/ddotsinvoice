import { pgTable, pgEnum, uuid, varchar, text, date, timestamp, uniqueIndex, type AnyPgColumn } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { companies } from './companies';
import { branches } from './branches';
import { users } from './users';
import { departments } from './departments';

export const employeeStatusEnum = pgEnum('employee_status', ['active', 'terminated', 'on_leave', 'suspended']);

export const employees = pgTable('employees', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  companyId: uuid('company_id').notNull().references(() => companies.id),
  branchId: uuid('branch_id').references(() => branches.id),
  employeeNumber: varchar('employee_number', { length: 20 }).notNull(), // EMP-00001
  nameEn: text('name_en').notNull(),
  nameAr: text('name_ar').notNull(),
  nationalId: varchar('national_id', { length: 20 }),
  passportNumber: varchar('passport_number', { length: 20 }),
  nationality: varchar('nationality', { length: 3 }),
  jobTitle: text('job_title').notNull(),
  departmentId: uuid('department_id').references(() => departments.id),
  managerId: uuid('manager_id').references((): AnyPgColumn => employees.id),
  userId: uuid('user_id').references(() => users.id),
  hireDate: date('hire_date').notNull(),
  terminationDate: date('termination_date'),
  status: employeeStatusEnum('status').notNull().default('active'),
  bankAccountNumber: varchar('bank_account_number', { length: 30 }),
  ibanNumber: varchar('iban_number', { length: 34 }),
  bankName: text('bank_name'),
  routingCode: varchar('routing_code', { length: 20 }),
  laborCardNumber: varchar('labor_card_number', { length: 20 }),
  visaNumber: varchar('visa_number', { length: 20 }),
  visaExpiry: date('visa_expiry'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (t) => ({
  uniqNumber: uniqueIndex('employees_number_company_idx').on(t.companyId, t.employeeNumber),
}));
