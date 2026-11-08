import { pgTable, uuid, text, numeric, integer, timestamp, index } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { companies } from './companies';
import { journalEntries } from './journal_entries';
import { accounts } from './accounts';

export const journalLines = pgTable('journal_lines', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  companyId: uuid('company_id').notNull().references(() => companies.id),
  journalEntryId: uuid('journal_entry_id').notNull().references(() => journalEntries.id, { onDelete: 'cascade' }),
  accountId: uuid('account_id').notNull().references(() => accounts.id),
  debit: numeric('debit', { precision: 20, scale: 6 }).notNull().default('0'),
  credit: numeric('credit', { precision: 20, scale: 6 }).notNull().default('0'),
  description: text('description'),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (t) => ({
  entryIdx: index('journal_lines_entry_idx').on(t.journalEntryId),
  accountIdx: index('journal_lines_account_idx').on(t.accountId, t.companyId),
}));
