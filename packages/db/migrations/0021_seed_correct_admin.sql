-- Migration 0021: Seed correct admin credentials.
-- Upserts admin@ddinvoice.com as platform_admin with correct password DDI@ddi2027%.
-- Deactivates sadmin@ddotsmedia.com (seeded in 0020) which is no longer needed.

INSERT INTO "users" (id, tenant_id, email, password_hash, first_name, last_name, role, is_active)
VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid,
  NULL,
  'admin@ddinvoice.com',
  '$argon2id$v=19$m=65536,t=3,p=4$Vz+t5IjpzgNDGoy+FCjjHg$FHkWqqIx0Yirr/kQgQPAaxmqnKntbUeoRUbC4ao02sY',
  'Platform',
  'Admin',
  'platform_admin',
  true
)
ON CONFLICT (email) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  role = EXCLUDED.role,
  is_active = EXCLUDED.is_active,
  tenant_id = EXCLUDED.tenant_id,
  updated_at = NOW();--> statement-breakpoint

-- Deactivate old sadmin@ddotsmedia.com entry seeded in migration 0020.
UPDATE "users"
SET is_active = false, updated_at = NOW()
WHERE email = 'sadmin@ddotsmedia.com';--> statement-breakpoint
