CREATE TABLE IF NOT EXISTS suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL,
  category VARCHAR(50) NOT NULL,
  priority VARCHAR(10) NOT NULL DEFAULT 'medium',
  subject VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  wants_notification BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
