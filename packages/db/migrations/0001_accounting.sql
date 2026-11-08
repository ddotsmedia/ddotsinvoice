CREATE TYPE "public"."account_type" AS ENUM('asset', 'liability', 'equity', 'revenue', 'expense');--> statement-breakpoint
CREATE TYPE "public"."normal_balance" AS ENUM('debit', 'credit');--> statement-breakpoint
CREATE TYPE "public"."fiscal_year_status" AS ENUM('open', 'closed', 'locked');--> statement-breakpoint
CREATE TYPE "public"."journal_status" AS ENUM('draft', 'posted', 'reversed');--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"parent_id" uuid,
	"code" varchar(20) NOT NULL,
	"name" varchar(255) NOT NULL,
	"name_ar" varchar(255),
	"type" "account_type" NOT NULL,
	"normal_balance" "normal_balance" NOT NULL,
	"level" integer DEFAULT 1 NOT NULL,
	"is_header" boolean DEFAULT false NOT NULL,
	"is_system" boolean DEFAULT false NOT NULL,
	"currency" varchar(3) DEFAULT 'AED' NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "fiscal_years" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"name" varchar(50) NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"status" "fiscal_year_status" DEFAULT 'open' NOT NULL,
	"closed_at" timestamp,
	"closed_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "journal_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"branch_id" uuid,
	"fiscal_year_id" uuid NOT NULL,
	"number" varchar(30) NOT NULL,
	"date" date NOT NULL,
	"description" text NOT NULL,
	"description_ar" text,
	"status" "journal_status" DEFAULT 'draft' NOT NULL,
	"currency" varchar(3) DEFAULT 'AED' NOT NULL,
	"exchange_rate" numeric(20, 6) DEFAULT '1' NOT NULL,
	"reverses_id" uuid,
	"reversed_by_id" uuid,
	"posted_at" timestamp,
	"posted_by" uuid,
	"created_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "journal_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"journal_entry_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"debit" numeric(20, 6) DEFAULT '0' NOT NULL,
	"credit" numeric(20, 6) DEFAULT '0' NOT NULL,
	"description" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "number_sequences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"prefix" varchar(20) NOT NULL,
	"last_number" integer DEFAULT 0 NOT NULL,
	"pad_length" integer DEFAULT 5 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fiscal_years" ADD CONSTRAINT "fiscal_years_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fiscal_years" ADD CONSTRAINT "fiscal_years_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fiscal_years" ADD CONSTRAINT "fiscal_years_closed_by_users_id_fk" FOREIGN KEY ("closed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_fiscal_year_id_fiscal_years_id_fk" FOREIGN KEY ("fiscal_year_id") REFERENCES "public"."fiscal_years"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_posted_by_users_id_fk" FOREIGN KEY ("posted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_lines" ADD CONSTRAINT "journal_lines_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_lines" ADD CONSTRAINT "journal_lines_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_lines" ADD CONSTRAINT "journal_lines_journal_entry_id_journal_entries_id_fk" FOREIGN KEY ("journal_entry_id") REFERENCES "public"."journal_entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_lines" ADD CONSTRAINT "journal_lines_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "number_sequences" ADD CONSTRAINT "number_sequences_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "number_sequences" ADD CONSTRAINT "number_sequences_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "accounts_code_company_idx" ON "accounts" USING btree ("company_id","code");--> statement-breakpoint
CREATE INDEX "journal_lines_entry_idx" ON "journal_lines" USING btree ("journal_entry_id");--> statement-breakpoint
CREATE INDEX "journal_lines_account_idx" ON "journal_lines" USING btree ("account_id","company_id");--> statement-breakpoint
CREATE UNIQUE INDEX "number_sequences_company_prefix_idx" ON "number_sequences" USING btree ("company_id","prefix");--> statement-breakpoint
ALTER TABLE "accounts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY tenant_isolation ON "accounts" USING (tenant_id = current_setting('app.tenant_id')::uuid);--> statement-breakpoint
ALTER TABLE "fiscal_years" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY tenant_isolation ON "fiscal_years" USING (tenant_id = current_setting('app.tenant_id')::uuid);--> statement-breakpoint
ALTER TABLE "journal_entries" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY tenant_isolation ON "journal_entries" USING (tenant_id = current_setting('app.tenant_id')::uuid);--> statement-breakpoint
ALTER TABLE "journal_lines" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY tenant_isolation ON "journal_lines" USING (tenant_id = current_setting('app.tenant_id')::uuid);--> statement-breakpoint
ALTER TABLE "number_sequences" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY tenant_isolation ON "number_sequences" USING (tenant_id = current_setting('app.tenant_id')::uuid);--> statement-breakpoint
CREATE OR REPLACE FUNCTION journal_entries_guard() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.status <> 'draft' THEN RAISE EXCEPTION 'Posted journal entries cannot be deleted'; END IF;
    RETURN OLD;
  END IF;
  IF OLD.status = 'draft' THEN RETURN NEW; END IF;
  -- only allowed change on a posted entry: marking it reversed and linking the reversal
  IF OLD.status = 'posted' AND NEW.status = 'reversed' AND NEW.reversed_by_id IS NOT NULL
     AND NEW.number = OLD.number AND NEW.date = OLD.date AND NEW.description = OLD.description
     AND NEW.fiscal_year_id = OLD.fiscal_year_id AND NEW.posted_at IS NOT DISTINCT FROM OLD.posted_at
  THEN RETURN NEW; END IF;
  RAISE EXCEPTION 'Posted journal entries are immutable';
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint
CREATE TRIGGER journal_entries_guard BEFORE UPDATE OR DELETE ON "journal_entries" FOR EACH ROW EXECUTE FUNCTION journal_entries_guard();--> statement-breakpoint
CREATE OR REPLACE FUNCTION journal_lines_guard() RETURNS trigger AS $$
DECLARE st journal_status;
BEGIN
  IF TG_OP = 'DELETE' THEN
    SELECT status INTO st FROM journal_entries WHERE id = OLD.journal_entry_id;
  ELSE
    SELECT status INTO st FROM journal_entries WHERE id = NEW.journal_entry_id;
  END IF;
  IF st IS NOT NULL AND st <> 'draft' THEN RAISE EXCEPTION 'Lines of posted journal entries are immutable'; END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint
CREATE TRIGGER journal_lines_guard BEFORE INSERT OR UPDATE OR DELETE ON "journal_lines" FOR EACH ROW EXECUTE FUNCTION journal_lines_guard();--> statement-breakpoint
INSERT INTO "accounts" ("tenant_id","company_id","code","name","type","normal_balance","is_header","is_system")
SELECT c.tenant_id, c.id, v.code, v.name, v.type::account_type, v.nb::normal_balance, v.hdr, true
FROM "companies" c CROSS JOIN (VALUES
  ('1000','Assets','asset','debit',true),
  ('1100','Cash & Bank','asset','debit',false),
  ('1200','Accounts Receivable','asset','debit',false),
  ('2000','Liabilities','liability','credit',true),
  ('2100','Accounts Payable','liability','credit',false),
  ('3000','Equity','equity','credit',true),
  ('3100','Retained Earnings','equity','credit',false),
  ('4000','Revenue','revenue','credit',true),
  ('5000','Expenses','expense','debit',true),
  ('2200','VAT Payable','liability','credit',false)
) AS v(code,name,type,nb,hdr)
WHERE NOT EXISTS (SELECT 1 FROM "accounts" a WHERE a.company_id = c.id);--> statement-breakpoint
INSERT INTO "number_sequences" ("tenant_id","company_id","prefix","last_number","pad_length")
SELECT c.tenant_id, c.id, 'JE', 0, 5 FROM "companies" c
WHERE NOT EXISTS (SELECT 1 FROM "number_sequences" n WHERE n.company_id = c.id AND n.prefix = 'JE');