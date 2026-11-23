-- Migration 0020: Fix tenant_isolation RLS policies to use current_setting(..., true)
-- The safe=true flag returns NULL instead of throwing when app.tenant_id is not set.
-- Without this fix, queries on a fresh connection (no prior set_config call) fail with:
--   ERROR: unrecognized configuration parameter "app.tenant_id"
-- This breaks platform_admin login/me (tenant_id IS NULL path) when DATABASE_ADMIN_URL
-- is not set, because the platform_admin_bypass policy cannot prevent the throw.
-- After this fix: tenant_isolation evaluates to (tenant_id = NULL::uuid) → false when
-- app.tenant_id is unset, and the platform_admin_bypass PERMISSIVE policy takes over.
DO $$
DECLARE tbl text;
BEGIN
  FOR tbl IN
    SELECT tablename FROM pg_policies
    WHERE schemaname = 'public' AND policyname = 'tenant_isolation'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', tbl);
    EXECUTE format(
      $$CREATE POLICY tenant_isolation ON %I USING (tenant_id = current_setting('app.tenant_id', true)::uuid)$$,
      tbl
    );
  END LOOP;
END$$;
