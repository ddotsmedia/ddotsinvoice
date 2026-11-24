-- Migration 0022: Re-seed admin with fresh argon2id hash.
-- Forces correct password_hash for admin@ddinvoice.com regardless of prior migration state.

INSERT INTO "users" (
  "id", "tenant_id", "email", "password_hash", "first_name", "last_name",
  "role", "is_active", "created_at", "updated_at"
) VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid,
  NULL,
  'admin@ddinvoice.com',
  '$argon2id$v=19$m=65536,t=3,p=4$BC1a+7dyX6Jo1EcDS+zHlw$CTXYk6wPy7P7pyghK31zHQ2m2+PNtM0YMWFHbY92Ubc',
  'Super',
  'Admin',
  'platform_admin',
  true,
  NOW(),
  NOW()
) ON CONFLICT (email) DO UPDATE SET
  "password_hash" = EXCLUDED."password_hash",
  "is_active" = true,
  "tenant_id" = NULL,
  "role" = 'platform_admin',
  "updated_at" = NOW();--> statement-breakpoint
