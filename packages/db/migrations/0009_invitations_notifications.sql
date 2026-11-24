CREATE TABLE IF NOT EXISTS "invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
	"company_id" uuid NOT NULL REFERENCES "companies"("id"),
	"email" varchar(255) NOT NULL,
	"role" varchar(30) NOT NULL,
	"token" varchar(64) NOT NULL UNIQUE,
	"expires_at" timestamp NOT NULL,
	"accepted_at" timestamp,
	"invited_by" uuid NOT NULL REFERENCES "users"("id"),
	"created_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "invitations_company_idx" ON "invitations" ("company_id", "created_at");--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
	"user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
	"company_id" uuid,
	"type" varchar(50) NOT NULL,
	"title" varchar(255) NOT NULL,
	"body" text,
	"link" varchar(500),
	"is_read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notifications_user_idx" ON "notifications" ("user_id", "is_read", "created_at");--> statement-breakpoint
ALTER TABLE "invitations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "invitations" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='invitations' AND policyname='tenant_isolation') THEN
    EXECUTE 'CREATE POLICY tenant_isolation ON "invitations" USING (tenant_id = current_setting(''app.tenant_id'')::uuid)';
  END IF;
END$$;--> statement-breakpoint
ALTER TABLE "notifications" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "notifications" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='notifications' AND policyname='tenant_isolation') THEN
    EXECUTE 'CREATE POLICY tenant_isolation ON "notifications" USING (tenant_id = current_setting(''app.tenant_id'')::uuid)';
  END IF;
END$$;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON "invitations", "notifications" TO ddots_app;
