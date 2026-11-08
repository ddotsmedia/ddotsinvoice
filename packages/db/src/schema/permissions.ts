import { pgTable, uuid, varchar, text, timestamp } from 'drizzle-orm/pg-core';
import { companies } from './companies';

export const permissions = pgTable('permissions', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: varchar('code', { length: 50 }).notNull().unique(), // module:action
  description: text('description').notNull(),
  module: varchar('module', { length: 30 }).notNull(),
  action: varchar('action', { length: 20 }).notNull(),
});

// companyId NULL = platform default; companyId set = company override (replaces defaults for that role)
export const rolePermissions = pgTable('role_permissions', {
  id: uuid('id').primaryKey().defaultRandom(),
  companyId: uuid('company_id').references(() => companies.id, { onDelete: 'cascade' }),
  role: varchar('role', { length: 30 }).notNull(),
  permissionCode: varchar('permission_code', { length: 50 }).notNull().references(() => permissions.code, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});
