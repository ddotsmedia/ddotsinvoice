import { pgTable, uuid, numeric, timestamp, index } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { companies } from './companies';
import { customerPayments } from './customer_payments';
import { invoices } from './invoices';

export const customerPaymentAllocations = pgTable('customer_payment_allocations', {
  id: uuid('id').primaryKey().defaultRandom(),
  paymentId: uuid('payment_id').notNull().references(() => customerPayments.id, { onDelete: 'cascade' }),
  invoiceId: uuid('invoice_id').notNull().references(() => invoices.id),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  companyId: uuid('company_id').notNull().references(() => companies.id),
  allocatedAmount: numeric('allocated_amount', { precision: 20, scale: 6 }).notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (t) => ({
  idxInvoice: index('idx_payment_allocations_invoice').on(t.invoiceId),
}));
