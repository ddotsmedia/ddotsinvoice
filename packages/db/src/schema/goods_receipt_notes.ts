import { pgTable, pgEnum, uuid, varchar, text, date, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { companies } from './companies';
import { branches } from './branches';
import { suppliers } from './suppliers';
import { purchaseOrders } from './purchase_orders';
import { fiscalYears } from './fiscal_years';
import { journalEntries } from './journal_entries';
import { users } from './users';

export const grnStatusEnum = pgEnum('grn_status', ['draft', 'posted', 'cancelled']);

export const goodsReceiptNotes = pgTable('goods_receipt_notes', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  companyId: uuid('company_id').notNull().references(() => companies.id),
  branchId: uuid('branch_id').notNull().references(() => branches.id),
  supplierId: uuid('supplier_id').notNull().references(() => suppliers.id),
  poId: uuid('po_id').references(() => purchaseOrders.id),
  fiscalYearId: uuid('fiscal_year_id').notNull().references(() => fiscalYears.id),
  number: varchar('number', { length: 30 }).notNull(),
  date: date('date').notNull(),
  status: grnStatusEnum('status').notNull().default('draft'),
  journalEntryId: uuid('journal_entry_id').references(() => journalEntries.id),
  notes: text('notes'),
  createdBy: uuid('created_by').notNull().references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (t) => ({
  idxTenantPo: index('idx_grn_tenant_po').on(t.tenantId, t.poId),
  uniqNumber: uniqueIndex('goods_receipt_notes_number_company_idx').on(t.companyId, t.number),
}));
