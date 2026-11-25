-- Migration 0023: Fix admin PK conflict and ensure correct credentials.
-- Problem: Migrations 0021 and 0022 used ON CONFLICT (email) but on production
-- id '00000000-0000-0000-0000-000000000001' was already taken by admin@ddotsmedia.com
-- (seeded in 0018), causing a PRIMARY KEY violation that crashes migrate.js → 502.
--
-- This DO block handles all possible DB states safely:
--   State A: id=0001 exists with email=admin@ddotsmedia.com (production)
--   State B: id=0001 exists with email=admin@ddinvoice.com (partially migrated)
--   State C: admin@ddinvoice.com exists with a different id (edge case)
--   State D: neither exists (fresh DB - should not happen but handled)

DO $$
DECLARE
  v_id   uuid := '00000000-0000-0000-0000-000000000001'::uuid;
  v_email text := 'admin@ddinvoice.com';
  v_hash  text := '$argon2id$v=19$m=65536,t=3,p=4$P3KFqHohxs5Dhbh0hEh5+A$aiMTJZA1g1Nh2FgAbCz2VPxGmo8/U4Tw6MUkv5sWWVY';
BEGIN
  -- Step 1: If id=0001 exists with wrong email (e.g. admin@ddotsmedia.com),
  -- rename it to the correct email so the PK slot is reused properly.
  UPDATE users SET
    email      = v_email,
    password_hash = v_hash,
    first_name = 'Super',
    last_name  = 'Admin',
    role       = 'platform_admin',
    is_active  = true,
    tenant_id  = NULL,
    updated_at = NOW()
  WHERE id = v_id AND email != v_email;

  -- Step 2: If correct email exists (possibly from 0021/0022 on a fresh DB),
  -- just ensure the password hash and flags are correct.
  UPDATE users SET
    password_hash = v_hash,
    is_active  = true,
    tenant_id  = NULL,
    role       = 'platform_admin',
    updated_at = NOW()
  WHERE email = v_email;

  -- Step 3: If neither the id nor the email exists yet, insert fresh.
  IF NOT EXISTS (SELECT 1 FROM users WHERE id = v_id OR email = v_email) THEN
    INSERT INTO users (
      id, tenant_id, email, password_hash,
      first_name, last_name, role, is_active, created_at, updated_at
    ) VALUES (
      v_id, NULL, v_email, v_hash,
      'Super', 'Admin', 'platform_admin', true, NOW(), NOW()
    );
  END IF;

  -- Step 4: Deactivate any old admin@ddotsmedia.com / sadmin@ddotsmedia.com entries.
  UPDATE users SET is_active = false, updated_at = NOW()
  WHERE email IN ('admin@ddotsmedia.com', 'sadmin@ddotsmedia.com');
END$$;
--> statement-breakpoint
