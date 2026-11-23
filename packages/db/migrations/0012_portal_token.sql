ALTER TABLE invoices ADD COLUMN IF NOT EXISTS portal_token varchar(64) DEFAULT NULL;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS portal_token_expires_at timestamptz DEFAULT NULL;
