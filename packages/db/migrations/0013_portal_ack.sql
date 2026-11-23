ALTER TABLE invoices ADD COLUMN IF NOT EXISTS portal_paid_acknowledged_at timestamptz DEFAULT NULL;
