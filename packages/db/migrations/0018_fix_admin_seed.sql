-- Migration 0018: Force-upsert platform super-admin user.
-- Migration 0017's seed used WHERE NOT EXISTS (SELECT 1 FROM users LIMIT 1)
-- which silently skips the insert if any user already exists.
-- This migration unconditionally ensures the platform admin exists with a valid hash.

INSERT INTO "users" (id, tenant_id, email, password_hash, first_name, last_name, role, is_active)
VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid,
  NULL,
  'admin@ddotsmedia.com',
  '$argon2id$v=19$m=65536,t=3,p=4$2QcS0+hRkdWlPfmXl4dDag$AnUyASaTsSD0URKDuzFEb2BBxU09L64GA+6DG+Fmv1M',
  'Super',
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

-- Ensure the platform_admin_bypass RLS policy exists (idempotent).
-- Allows rows with tenant_id IS NULL to be read without tenant context.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'users'
      AND policyname = 'platform_admin_bypass'
  ) THEN
    EXECUTE '
      CREATE POLICY platform_admin_bypass ON users
        AS PERMISSIVE FOR ALL
        USING (tenant_id IS NULL)
    ';
  END IF;
END$$;
