ALTER TABLE invoices ADD COLUMN IF NOT EXISTS is_recurring boolean DEFAULT false;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS recurrence_interval varchar(10) DEFAULT NULL;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS next_recurrence_date date DEFAULT NULL;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS parent_invoice_id uuid DEFAULT NULL;
