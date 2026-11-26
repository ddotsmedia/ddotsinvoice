import { pgTable, pgEnum, uuid, varchar, text, date, numeric, timestamp, integer } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { companies } from './companies';
import { accounts } from './accounts';

export const depreciationMethodEnum = pgEnum('depreciation_method', ['straight_line', 'declining_balance']);
export const assetStatusEnum = pgEnum('asset_status', ['active', 'fully_depreciated', 'disposed', 'idle']);

export const fixedAssets = pgTable('fixed_assets', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  companyId: uuid('company_id').notNull().references(() => companies.id),
  code: varchar('code', { length: 30 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  nameAr: varchar('name_ar', { length: 255 }),
  category: varchar('category', { length: 100 }),          // e.g. "Vehicle", "Equipment", "Building"
  description: text('description'),
  acquisitionDate: date('acquisition_date').notNull(),
  acquisitionCost: numeric('acquisition_cost', { precision: 20, scale: 6 }).notNull(),
  residualValue: numeric('residual_value', { precision: 20, scale: 6 }).notNull().default('0'),
  usefulLifeMonths: integer('useful_life_months').notNull(),
  depreciationMethod: depreciationMethodEnum('depreciation_method').notNull().default('straight_line'),
  accumulatedDepreciation: numeric('accumulated_depreciation', { precision: 20, scale: 6 }).notNull().default('0'),
  status: assetStatusEnum('status').notNull().default('active'),
  disposalDate: date('disposal_date'),
  disposalValue: numeric('disposal_value', { precision: 20, scale: 6 }),
  disposalNotes: text('disposal_notes'),
  location: varchar('location', { length: 255 }),
  serialNumber: varchar('serial_number', { length: 100 }),
  // GL accounts
  assetAccountId: uuid('asset_account_id').references(() => accounts.id),
  accumulatedDepreciationAccountId: uuid('accumulated_depreciation_account_id').references(() => accounts.id),
  depreciationExpenseAccountId: uuid('depreciation_expense_account_id').references(() => accounts.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  deletedAt: timestamp('deleted_at'),
});

export const assetDepreciationSchedules = pgTable('asset_depreciation_schedules', {
  id: uuid('id').primaryKey().defaultRandom(),
  assetId: uuid('asset_id').notNull().references(() => fixedAssets.id),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  companyId: uuid('company_id').notNull().references(() => companies.id),
  periodDate: date('period_date').notNull(),   // month/year of depreciation
  depreciationAmount: numeric('depreciation_amount', { precision: 20, scale: 6 }).notNull(),
  bookValue: numeric('book_value', { precision: 20, scale: 6 }).notNull(),
  posted: varchar('posted', { length: 50 }).default('pending'),  // pending | posted
  journalEntryId: uuid('journal_entry_id'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});
