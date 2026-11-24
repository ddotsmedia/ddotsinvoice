-- Migration 0017: Add platform_admin RLS bypass + seed super-admin user.
-- Idempotent: policy creation guarded; INSERT uses ON CONFLICT DO NOTHING.

-- Allow platform admin users (tenant_id IS NULL) to be visible without tenant context.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'users' AND policyname = 'platform_admin_bypass'
  ) THEN
    EXECUTE '
      CREATE POLICY platform_admin_bypass ON "users"
        AS PERMISSIVE FOR ALL
        USING (tenant_id IS NULL)
    ';
  END IF;
END$$;--> statement-breakpoint

-- Seed platform super-admin if no users exist yet.
INSERT INTO "users" (id, tenant_id, email, password_hash, first_name, last_name, role, is_active)
VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid,
  NULL,
  'admin@ddotsmedia.com',
  '$argon2id$v=19$m=65536,t=3,p=4$ce94uJ/CUQPtNR0NJQKq/A$c+BV1HznSfqGrtDg41q0OwC3nsysEOF5w8ePscOUxuU',
  'Super',
  'Admin',
  'platform_admin',
  true
)
ON CONFLICT (email) DO NOTHING;
