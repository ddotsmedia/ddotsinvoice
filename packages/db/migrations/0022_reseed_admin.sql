-- Migration 0022: Ensure admin hash is correct (no-op if 0021 already set it).
-- Uses same DO block pattern to be idempotent and conflict-safe.

DO $$
DECLARE
  v_id   uuid := '00000000-0000-0000-0000-000000000001'::uuid;
  v_email text := 'admin@ddinvoice.com';
  v_hash  text := '$argon2id$v=19$m=65536,t=3,p=4$P3KFqHohxs5Dhbh0hEh5+A$aiMTJZA1g1Nh2FgAbCz2VPxGmo8/U4Tw6MUkv5sWWVY';
BEGIN
  UPDATE users SET
    password_hash = v_hash,
    is_active     = true,
    tenant_id     = NULL,
    role          = 'platform_admin',
    updated_at    = NOW()
  WHERE email = v_email;

  -- Insert only if completely missing (edge case).
  IF NOT EXISTS (SELECT 1 FROM users WHERE id = v_id OR email = v_email) THEN
    INSERT INTO users (
      id, tenant_id, email, password_hash,
      first_name, last_name, role, is_active, created_at, updated_at
    ) VALUES (
      v_id, NULL, v_email, v_hash,
      'Super', 'Admin', 'platform_admin', true, NOW(), NOW()
    );
  END IF;
END$$;
--> statement-breakpoint
