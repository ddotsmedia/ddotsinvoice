import { pgTable, uuid, varchar, text, boolean, timestamp } from 'drizzle-orm/pg-core';

export const suggestions = pgTable('suggestions', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull(),
  email: varchar('email', { length: 255 }).notNull(),
  category: varchar('category', { length: 50 }).notNull(),
  priority: varchar('priority', { length: 10 }).notNull().default('medium'),
  subject: varchar('subject', { length: 100 }).notNull(),
  description: text('description').notNull(),
  wantsNotification: boolean('wants_notification').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
