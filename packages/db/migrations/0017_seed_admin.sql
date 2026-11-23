-- Migration 0017: Add platform_admin RLS bypass + seed super-admin user.
-- Platform admin users have tenant_id = NULL. The existing tenant_isolation policy
-- hides all rows when app.tenant_id is unset (nullif returns NULL → tenant_id=NULL is false).
-- Adding a PERMISSIVE policy so rows with tenant_id IS NULL are always visible enables
-- platform admin login without requiring DATABASE_ADMIN_URL / ddots_admin role on VPS.

-- Allow platform admin users (tenant_id IS NULL) to be visible without tenant context.
-- This policy is PERMISSIVE: a row is visible if EITHER policy passes.
CREATE POLICY platform_admin_bypass ON "users"
  AS PERMISSIVE FOR ALL
  USING (tenant_id IS NULL);--> statement-breakpoint

-- Seed platform super-admin if no users exist yet.
INSERT INTO "users" (id, tenant_id, email, password_hash, first_name, last_name, role, is_active)
SELECT
  '00000000-0000-0000-0000-000000000001'::uuid,
  NULL,
  'admin@ddotsmedia.com',
  '$argon2id$v=19$m=65536,t=3,p=4$ce94uJ/CUQPtNR0NJQKq/A$c+BV1HznSfqGrtDg41q0OwC3nsysEOF5w8ePscOUxuU',
  'Super',
  'Admin',
  'platform_admin',
  true
WHERE NOT EXISTS (SELECT 1 FROM "users" LIMIT 1);
