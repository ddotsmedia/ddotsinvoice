-- Migration: Fixed Assets & PDC Register
-- Creates fixed_assets, asset_depreciation_schedules, and pdc_cheques tables

CREATE TYPE "public"."depreciation_method" AS ENUM('straight_line', 'declining_balance');
CREATE TYPE "public"."asset_status" AS ENUM('active', 'fully_depreciated', 'disposed', 'idle');
CREATE TYPE "public"."pdc_type" AS ENUM('received', 'issued');
CREATE TYPE "public"."pdc_status" AS ENUM('pending', 'presented', 'cleared', 'bounced', 'cancelled', 'returned');

CREATE TABLE "fixed_assets" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL,
  "company_id" uuid NOT NULL,
  "code" varchar(50) NOT NULL,
  "name" varchar(255) NOT NULL,
  "name_ar" varchar(255),
  "category" varchar(100),
  "description" text,
  "acquisition_date" date NOT NULL,
  "acquisition_cost" numeric(18, 2) NOT NULL,
  "residual_value" numeric(18, 2) NOT NULL DEFAULT 0,
  "useful_life_months" integer NOT NULL,
  "depreciation_method" "depreciation_method" NOT NULL DEFAULT 'straight_line',
  "accumulated_depreciation" numeric(18, 2) NOT NULL DEFAULT 0,
  "status" "asset_status" NOT NULL DEFAULT 'active',
  "disposal_date" date,
  "disposal_value" numeric(18, 2),
  "disposal_notes" text,
  "location" varchar(255),
  "serial_number" varchar(255),
  "asset_account_id" uuid,
  "accumulated_depreciation_account_id" uuid,
  "depreciation_expense_account_id" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "deleted_at" timestamp with time zone
);

CREATE TABLE "asset_depreciation_schedules" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "asset_id" uuid NOT NULL,
  "tenant_id" uuid NOT NULL,
  "company_id" uuid NOT NULL,
  "period_date" varchar(7) NOT NULL,
  "depreciation_amount" numeric(18, 2) NOT NULL,
  "book_value" numeric(18, 2) NOT NULL,
  "posted" varchar(20) NOT NULL DEFAULT 'pending',
  "journal_entry_id" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "asset_depreciation_schedules_asset_id_fk" FOREIGN KEY ("asset_id") REFERENCES "fixed_assets"("id") ON DELETE CASCADE
);

CREATE TABLE "pdc_cheques" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL,
  "company_id" uuid NOT NULL,
  "type" "pdc_type" NOT NULL,
  "cheque_number" varchar(100) NOT NULL,
  "bank_name" varchar(255),
  "amount" numeric(18, 2) NOT NULL,
  "currency" varchar(3) NOT NULL DEFAULT 'AED',
  "due_date" date NOT NULL,
  "status" "pdc_status" NOT NULL DEFAULT 'pending',
  "customer_id" uuid,
  "supplier_id" uuid,
  "bank_account_id" uuid,
  "reference" varchar(255),
  "notes" text,
  "presented_date" date,
  "cleared_date" date,
  "bounced_date" date,
  "bounced_reason" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "deleted_at" timestamp with time zone
);

CREATE INDEX "fixed_assets_company_id_idx" ON "fixed_assets" ("company_id");
CREATE INDEX "fixed_assets_status_idx" ON "fixed_assets" ("status");
CREATE INDEX "asset_depreciation_schedules_asset_id_idx" ON "asset_depreciation_schedules" ("asset_id");
CREATE INDEX "pdc_cheques_company_id_idx" ON "pdc_cheques" ("company_id");
CREATE INDEX "pdc_cheques_due_date_idx" ON "pdc_cheques" ("due_date");
CREATE INDEX "pdc_cheques_status_idx" ON "pdc_cheques" ("status");
