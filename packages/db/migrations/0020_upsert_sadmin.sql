-- Migration 0020: Upsert sadmin@ddotsmedia.com as platform_admin.
-- Migration 0018 seeded admin@ddotsmedia.com only. This ensures sadmin@ddotsmedia.com
-- also exists as platform_admin so the super-admin login works.
-- Hash matches Admin@12345 (same as 0018).

INSERT INTO "users" (id, tenant_id, email, password_hash, first_name, last_name, role, is_active)
VALUES (
  '00000000-0000-0000-0000-000000000002'::uuid,
  NULL,
  'sadmin@ddotsmedia.com',
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

-- Safely attempt to grant BYPASSRLS to ddots_admin if it exists and we have superuser.
-- This is a no-op if already set; swallows error if not superuser (non-fatal).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ddots_admin') THEN
    BEGIN
      ALTER ROLE ddots_admin BYPASSRLS;
    EXCEPTION WHEN OTHERS THEN
      -- Not superuser; ddots_admin may already have BYPASSRLS from migration 0016.
      NULL;
    END;
  END IF;
END$$;
