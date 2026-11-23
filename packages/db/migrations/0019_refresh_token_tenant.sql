-- Migration 0019: Add tenant_id to refresh_tokens so the refresh endpoint can set
-- the correct RLS context (app.tenant_id) when querying the users table on token rotation.
-- Nullable: NULL for platform_admin (tenant_id IS NULL bypass policy covers them).
ALTER TABLE "refresh_tokens" ADD COLUMN IF NOT EXISTS "tenant_id" uuid;
