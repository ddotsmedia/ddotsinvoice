import { relations } from 'drizzle-orm';
import { tenants } from './tenants';
import { companies } from './companies';
import { branches } from './branches';
import { users, refreshTokens } from './users';
import { accounts } from './accounts';
import { fiscalYears } from './fiscal_years';
import { journalEntries } from './journal_entries';
import { journalLines } from './journal_lines';

export * from './tenants';
export * from './companies';
export * from './branches';
export * from './users';
export * from './audit_logs';
export * from './accounts';
export * from './fiscal_years';
export * from './journal_entries';
export * from './journal_lines';
export * from './number_sequences';
export * from './customers';
export * from './invoices';
export * from './invoice_lines';
export * from './suppliers';
export * from './purchase_orders';
export * from './purchase_order_lines';
export * from './warehouses';
export * from './goods_receipt_notes';
export * from './goods_receipt_lines';
export * from './inventory_items';
export * from './inventory_lots';
export * from './inventory_movements';
export * from './inventory_balances';
export * from './supplier_invoices';
export * from './supplier_invoice_lines';

export const tenantsRelations = relations(tenants, ({ many }) => ({
  companies: many(companies),
  branches: many(branches),
  users: many(users),
}));

export const companiesRelations = relations(companies, ({ one, many }) => ({
  tenant: one(tenants, { fields: [companies.tenantId], references: [tenants.id] }),
  branches: many(branches),
  users: many(users),
  accounts: many(accounts),
  fiscalYears: many(fiscalYears),
}));

export const branchesRelations = relations(branches, ({ one }) => ({
  tenant: one(tenants, { fields: [branches.tenantId], references: [tenants.id] }),
  company: one(companies, { fields: [branches.companyId], references: [companies.id] }),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  tenant: one(tenants, { fields: [users.tenantId], references: [tenants.id] }),
  company: one(companies, { fields: [users.companyId], references: [companies.id] }),
  branch: one(branches, { fields: [users.branchId], references: [branches.id] }),
  refreshTokens: many(refreshTokens),
}));

export const refreshTokensRelations = relations(refreshTokens, ({ one }) => ({
  user: one(users, { fields: [refreshTokens.userId], references: [users.id] }),
}));

export const accountsRelations = relations(accounts, ({ one, many }) => ({
  company: one(companies, { fields: [accounts.companyId], references: [companies.id] }),
  parent: one(accounts, { fields: [accounts.parentId], references: [accounts.id], relationName: 'account_parent' }),
  children: many(accounts, { relationName: 'account_parent' }),
  journalLines: many(journalLines),
}));

export const fiscalYearsRelations = relations(fiscalYears, ({ one, many }) => ({
  company: one(companies, { fields: [fiscalYears.companyId], references: [companies.id] }),
  journalEntries: many(journalEntries),
}));

export const journalEntriesRelations = relations(journalEntries, ({ one, many }) => ({
  fiscalYear: one(fiscalYears, { fields: [journalEntries.fiscalYearId], references: [fiscalYears.id] }),
  branch: one(branches, { fields: [journalEntries.branchId], references: [branches.id] }),
  lines: many(journalLines),
}));

export const journalLinesRelations = relations(journalLines, ({ one }) => ({
  entry: one(journalEntries, { fields: [journalLines.journalEntryId], references: [journalEntries.id] }),
  account: one(accounts, { fields: [journalLines.accountId], references: [accounts.id] }),
}));
