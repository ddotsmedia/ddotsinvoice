-- Migration 0016: Create ddots_admin role with BYPASSRLS for cross-tenant operations.
-- All role/privilege operations are wrapped in exception handlers so this migration
-- succeeds even when the connecting user lacks superuser privilege.
-- For full setup (ddots_admin BYPASSRLS role) run scripts/setup-db-roles.sh as a PostgreSQL superuser.

DO $$
BEGIN
  -- Create ddots_admin if it does not exist
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ddots_admin') THEN
    BEGIN
      CREATE ROLE ddots_admin LOGIN PASSWORD 'changeme' NOSUPERUSER NOCREATEDB NOCREATEROLE BYPASSRLS;
      RAISE NOTICE 'Created ddots_admin role with BYPASSRLS.';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Could not create ddots_admin role (superuser required for BYPASSRLS): %. Run scripts/setup-db-roles.sh as a superuser.', SQLERRM;
    END;
  END IF;

  -- Ensure BYPASSRLS even if role already existed without it
  BEGIN
    ALTER ROLE ddots_admin BYPASSRLS;
    RAISE NOTICE 'BYPASSRLS set on ddots_admin.';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Could not set BYPASSRLS on ddots_admin (superuser required): %', SQLERRM;
  END;

  -- Grant schema/table/sequence privileges if the role now exists
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ddots_admin') THEN
    BEGIN
      GRANT USAGE ON SCHEMA public TO ddots_admin;
      GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ddots_admin;
      GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO ddots_admin;
      ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ddots_admin;
      ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO ddots_admin;
      RAISE NOTICE 'Privileges granted to ddots_admin.';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Could not grant privileges to ddots_admin: %', SQLERRM;
    END;
  END IF;
END$$;--> statement-breakpoint

-- Fix all existing RLS policies to use current_setting(..., true) so they return NULL
-- instead of throwing when app.tenant_id is not set as a session variable.
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
