-- Migration 0021: Seed correct admin credentials.
-- Uses a DO block to handle all DB states without PK/unique constraint conflicts.
-- Migration 0018 seeded admin@ddotsmedia.com with id=00000000-0000-0000-0000-000000000001.
-- A bare INSERT ON CONFLICT (email) fails with PK conflict when the same id is taken
-- by a different email. This DO block renames the row in-place instead.

DO $$
DECLARE
  v_id   uuid := '00000000-0000-0000-0000-000000000001'::uuid;
  v_email text := 'admin@ddinvoice.com';
  v_hash  text := '$argon2id$v=19$m=65536,t=3,p=4$P3KFqHohxs5Dhbh0hEh5+A$aiMTJZA1g1Nh2FgAbCz2VPxGmo8/U4Tw6MUkv5sWWVY';
BEGIN
  -- Step 1: If id=0001 exists with wrong email (e.g. admin@ddotsmedia.com), rename it.
  UPDATE users SET
    email         = v_email,
    password_hash = v_hash,
    first_name    = 'Super',
    last_name     = 'Admin',
    role          = 'platform_admin',
    is_active     = true,
    tenant_id     = NULL,
    updated_at    = NOW()
  WHERE id = v_id AND email != v_email;

  -- Step 2: If correct email already exists, just refresh the hash.
  UPDATE users SET
    password_hash = v_hash,
    is_active     = true,
    tenant_id     = NULL,
    role          = 'platform_admin',
    updated_at    = NOW()
  WHERE email = v_email;

  -- Step 3: Neither id nor email exists yet — insert fresh.
  IF NOT EXISTS (SELECT 1 FROM users WHERE id = v_id OR email = v_email) THEN
    INSERT INTO users (
      id, tenant_id, email, password_hash,
      first_name, last_name, role, is_active, created_at, updated_at
    ) VALUES (
      v_id, NULL, v_email, v_hash,
      'Super', 'Admin', 'platform_admin', true, NOW(), NOW()
    );
  END IF;

  -- Step 4: Deactivate old ddotsmedia.com admin accounts.
  UPDATE users SET is_active = false, updated_at = NOW()
  WHERE email IN ('admin@ddotsmedia.com', 'sadmin@ddotsmedia.com');
END$$;
--> statement-breakpoint
