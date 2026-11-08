import { pgTable, integer, varchar, text, numeric, boolean, timestamp } from 'drizzle-orm/pg-core';

// Single-row table: id is always 1
export const platformSettings = pgTable('platform_settings', {
  id: integer('id').primaryKey(),
  platformName: varchar('platform_name', { length: 255 }).notNull().default('DdotsInvoice'),
  logoUrl: text('logo_url'),
  defaultCurrency: varchar('default_currency', { length: 3 }).notNull().default('AED'),
  defaultVatRate: numeric('default_vat_rate', { precision: 5, scale: 2 }).notNull().default('5'),
  smtpHost: varchar('smtp_host', { length: 255 }),
  smtpPort: integer('smtp_port'),
  smtpUser: varchar('smtp_user', { length: 255 }),
  smtpPass: text('smtp_pass'),
  maintenanceMode: boolean('maintenance_mode').notNull().default(false),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});
