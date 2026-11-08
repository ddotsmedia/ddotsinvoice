import { pgTable, uuid, numeric, timestamp } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { companies } from './companies';
import { supplierPayments } from './supplier_payments';
import { supplierInvoices } from './supplier_invoices';

export const supplierPaymentAllocations = pgTable('supplier_payment_allocations', {
  id: uuid('id').primaryKey().defaultRandom(),
  paymentId: uuid('payment_id').notNull().references(() => supplierPayments.id, { onDelete: 'cascade' }),
  supplierInvoiceId: uuid('supplier_invoice_id').notNull().references(() => supplierInvoices.id),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  companyId: uuid('company_id').notNull().references(() => companies.id),
  allocatedAmount: numeric('allocated_amount', { precision: 20, scale: 6 }).notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});
