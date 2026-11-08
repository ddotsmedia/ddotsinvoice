ALTER TYPE "user_role" ADD VALUE IF NOT EXISTS 'super_admin';--> statement-breakpoint
ALTER TYPE "user_role" ADD VALUE IF NOT EXISTS 'hr_manager';--> statement-breakpoint
ALTER TYPE "user_role" ADD VALUE IF NOT EXISTS 'payroll_manager';--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "permissions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "code" varchar(50) NOT NULL UNIQUE,
  "description" text NOT NULL,
  "module" varchar(30) NOT NULL,
  "action" varchar(20) NOT NULL
);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "role_permissions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "company_id" uuid REFERENCES "companies"("id") ON DELETE CASCADE,
  "role" varchar(30) NOT NULL,
  "permission_code" varchar(50) NOT NULL REFERENCES "permissions"("code") ON DELETE CASCADE,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "role_permissions_uniq" ON "role_permissions" ("company_id", "role", "permission_code") NULLS NOT DISTINCT;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "platform_settings" (
  "id" integer PRIMARY KEY CHECK ("id" = 1),
  "platform_name" varchar(255) NOT NULL DEFAULT 'DdotsInvoice',
  "logo_url" text,
  "default_currency" varchar(3) NOT NULL DEFAULT 'AED',
  "default_vat_rate" numeric(5,2) NOT NULL DEFAULT 5,
  "smtp_host" varchar(255),
  "smtp_port" integer,
  "smtp_user" varchar(255),
  "smtp_pass" text,
  "maintenance_mode" boolean NOT NULL DEFAULT false,
  "updated_at" timestamp NOT NULL DEFAULT now()
);--> statement-breakpoint
INSERT INTO "platform_settings" ("id") VALUES (1) ON CONFLICT DO NOTHING;--> statement-breakpoint
ALTER TABLE "audit_logs" DROP COLUMN IF EXISTS "entity";--> statement-breakpoint
ALTER TABLE "audit_logs" DROP COLUMN IF EXISTS "entity_id";--> statement-breakpoint
ALTER TABLE "audit_logs" DROP COLUMN IF EXISTS "before";--> statement-breakpoint
ALTER TABLE "audit_logs" DROP COLUMN IF EXISTS "after";--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "module" varchar(30);--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "record_id" uuid;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "old_values" jsonb;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "new_values" jsonb;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_logs_company_created_idx" ON "audit_logs" ("company_id", "created_at");--> statement-breakpoint
INSERT INTO "permissions" ("code", "description", "module", "action")
SELECT m || ':' || a, initcap(a) || ' ' || m, m, a
FROM unnest(ARRAY['invoicing','purchasing','payments','hr','payroll','reports','budgets','settings']) AS m
CROSS JOIN unnest(ARRAY['view','create','edit','delete','approve','post','pay']) AS a
ON CONFLICT ("code") DO NOTHING;--> statement-breakpoint
INSERT INTO "role_permissions" ("company_id", "role", "permission_code")
SELECT NULL, r, p."code" FROM "permissions" p
CROSS JOIN unnest(ARRAY['super_admin','tenant_admin','company_admin']) AS r
ON CONFLICT DO NOTHING;--> statement-breakpoint
INSERT INTO "role_permissions" ("company_id", "role", "permission_code")
SELECT NULL, 'accountant', p."code" FROM "permissions" p
WHERE p."module" IN ('invoicing','purchasing','payments','reports') AND p."action" IN ('view','create','edit')
ON CONFLICT DO NOTHING;--> statement-breakpoint
INSERT INTO "role_permissions" ("company_id", "role", "permission_code")
SELECT NULL, 'hr_manager', p."code" FROM "permissions" p
WHERE p."module" IN ('hr','payroll') AND p."action" IN ('view','create','edit','approve')
ON CONFLICT DO NOTHING;--> statement-breakpoint
INSERT INTO "role_permissions" ("company_id", "role", "permission_code")
SELECT NULL, 'payroll_manager', p."code" FROM "permissions" p
WHERE p."module" IN ('hr','payroll') AND p."action" IN ('view','create','edit','approve','pay')
ON CONFLICT DO NOTHING;--> statement-breakpoint
INSERT INTO "role_permissions" ("company_id", "role", "permission_code")
SELECT NULL, 'viewer', p."code" FROM "permissions" p WHERE p."action" = 'view'
ON CONFLICT DO NOTHING;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON "permissions", "role_permissions", "platform_settings", "audit_logs" TO ddots_app;
