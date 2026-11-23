-- Fix: create ddots_admin role with BYPASSRLS for cross-tenant operations (login, platform admin).
-- The ddots_app role (used by DATABASE_URL) is NOSUPERUSER and subject to RLS.
-- The ddots_admin role (used by DATABASE_ADMIN_URL) bypasses RLS so auth/super-admin queries work.
-- Also fixes RLS policies to use missing_ok=true so they never throw when app.tenant_id is unset.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ddots_admin') THEN
    -- BYPASSRLS: skips row-level security on all tables (required for login / platform-admin queries)
    -- NOSUPERUSER: least-privilege otherwise
    CREATE ROLE ddots_admin LOGIN PASSWORD 'changeme' NOSUPERUSER NOCREATEDB NOCREATEROLE BYPASSRLS;
  END IF;
  -- Ensure BYPASSRLS is set even if the role already exists without it
  ALTER ROLE ddots_admin BYPASSRLS;
END$$;--> statement-breakpoint
GRANT USAGE ON SCHEMA public TO ddots_admin;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ddots_admin;--> statement-breakpoint
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO ddots_admin;--> statement-breakpoint
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ddots_admin;--> statement-breakpoint
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO ddots_admin;--> statement-breakpoint

-- Fix all existing RLS policies to use current_setting(..., true) so they return NULL
-- instead of throwing when app.tenant_id is not set as a session variable.
-- This prevents 500 errors when ddots_admin connects without a tenant context.
DO $$
DECLARE tbl text;
BEGIN
  FOR tbl IN
    SELECT tablename FROM pg_policies
    WHERE schemaname = 'public' AND policyname = 'tenant_isolation'
  LOOP
    EXECUTE format('DROP POLICY tenant_isolation ON %I', tbl);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I USING ('
      '  tenant_id = nullif(current_setting(''app.tenant_id'', true), '''')::uuid'
      ')',
      tbl
    );
  END LOOP;
END$$;
