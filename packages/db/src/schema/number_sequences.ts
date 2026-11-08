import { pgTable, uuid, varchar, integer, uniqueIndex } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { companies } from './companies';

export const numberSequences = pgTable('number_sequences', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  companyId: uuid('company_id').notNull().references(() => companies.id),
  prefix: varchar('prefix', { length: 20 }).notNull(),
  lastNumber: integer('last_number').notNull().default(0),
  padLength: integer('pad_length').notNull().default(5),
}, (t) => ({
  uniq: uniqueIndex('number_sequences_company_prefix_idx').on(t.companyId, t.prefix),
}));
