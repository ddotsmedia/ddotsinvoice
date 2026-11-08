import { pgTable, pgEnum, uuid, varchar, text, boolean, timestamp } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { companies } from './companies';
import { branches } from './branches';

export const roleEnum = pgEnum('user_role', [
  'platform_admin', 'tenant_admin', 'company_admin', 'branch_manager', 'accountant',
  'sales', 'purchasing', 'warehouse', 'hr_payroll', 'viewer',
]);

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id),
  companyId: uuid('company_id').references(() => companies.id),
  branchId: uuid('branch_id').references(() => branches.id),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  firstName: varchar('first_name', { length: 100 }).notNull(),
  lastName: varchar('last_name', { length: 100 }).notNull(),
  role: roleEnum('role').notNull(),
  mfaEnabled: boolean('mfa_enabled').notNull().default(false),
  mfaSecret: text('mfa_secret'),
  isActive: boolean('is_active').notNull().default(true),
  lastLoginAt: timestamp('last_login_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  deletedAt: timestamp('deleted_at'),
});

export const refreshTokens = pgTable('refresh_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});
