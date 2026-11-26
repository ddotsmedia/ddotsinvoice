import { pgTable, pgEnum, uuid, varchar, text, date, numeric, timestamp } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { companies } from './companies';
import { customers } from './customers';
import { suppliers } from './suppliers';
import { bankAccounts } from './bank_accounts';

export const pdcTypeEnum = pgEnum('pdc_type', ['received', 'issued']);
export const pdcStatusEnum = pgEnum('pdc_status', ['pending', 'presented', 'cleared', 'bounced', 'cancelled', 'returned']);

export const pdcCheques = pgTable('pdc_cheques', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  companyId: uuid('company_id').notNull().references(() => companies.id),
  type: pdcTypeEnum('type').notNull(),                    // received from customer | issued to supplier
  chequeNumber: varchar('cheque_number', { length: 50 }).notNull(),
  bankName: varchar('bank_name', { length: 100 }),
  amount: numeric('amount', { precision: 20, scale: 6 }).notNull(),
  currency: varchar('currency', { length: 3 }).notNull().default('AED'),
  dueDate: date('due_date').notNull(),                    // maturity / presentation date
  status: pdcStatusEnum('status').notNull().default('pending'),
  customerId: uuid('customer_id').references(() => customers.id),
  supplierId: uuid('supplier_id').references(() => suppliers.id),
  bankAccountId: uuid('bank_account_id').references(() => bankAccounts.id),
  reference: varchar('reference', { length: 100 }),       // invoice ref or PO ref
  notes: text('notes'),
  presentedDate: date('presented_date'),
  clearedDate: date('cleared_date'),
  bouncedDate: date('bounced_date'),
  bouncedReason: text('bounced_reason'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  deletedAt: timestamp('deleted_at'),
});
