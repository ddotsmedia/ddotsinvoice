ALTER TABLE tenants ADD COLUMN IF NOT EXISTS plan_expires_at timestamptz;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS invoice_count_this_month int NOT NULL DEFAULT 0;
