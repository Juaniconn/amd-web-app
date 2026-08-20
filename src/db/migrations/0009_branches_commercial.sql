CREATE TYPE "public"."branch_status" AS ENUM('activo', 'inactivo');--> statement-breakpoint
CREATE TYPE "public"."quote_addressee_mode" AS ENUM('nombre', 'departamento');--> statement-breakpoint
CREATE TYPE "public"."payment_term" AS ENUM('net_15', 'net_30', 'net_45', 'net_60', 'net_90', 'net_120');--> statement-breakpoint
CREATE TABLE "branches" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"address" text,
	"city" text,
	"state" text,
	"country" text DEFAULT 'México' NOT NULL,
	"postal_code" text,
	"phone" text,
	"email" text,
	"rfc" text,
	"status" "branch_status" DEFAULT 'activo' NOT NULL,
	"is_official_seed" boolean DEFAULT false NOT NULL,
	"is_demo" boolean DEFAULT false NOT NULL,
	"created_by" text,
	"updated_by" text,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "branches" ADD CONSTRAINT "branches_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branches" ADD CONSTRAINT "branches_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "branches_code_uidx" ON "branches" USING btree ("code");--> statement-breakpoint
CREATE INDEX "branches_status_idx" ON "branches" USING btree ("status");--> statement-breakpoint
CREATE INDEX "branches_deleted_at_idx" ON "branches" USING btree ("deleted_at");--> statement-breakpoint
INSERT INTO "branches" ("id", "code", "name", "city", "state", "country", "status", "is_official_seed") VALUES
  ('amd-branch-cjs', 'CJS', 'AMD México — Ciudad Juárez', 'Ciudad Juárez', 'Chihuahua', 'México', 'activo', true),
  ('amd-branch-gdl', 'GDL', 'AMD México — Guadalajara', 'Guadalajara', 'Jalisco', 'México', 'activo', true),
  ('amd-branch-elp', 'ELP', 'AMD México — El Paso', 'El Paso', 'Texas', 'Estados Unidos', 'activo', true);--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "shipping_same_as_billing" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "shipping_address" text;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "shipping_city" text;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "shipping_state" text;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "shipping_postal_code" text;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "shipping_country" text;--> statement-breakpoint
ALTER TABLE "quotes" ADD COLUMN "payment_term" "payment_term" DEFAULT 'net_30';--> statement-breakpoint
ALTER TABLE "quotes" ADD COLUMN "addressee_mode" "quote_addressee_mode" DEFAULT 'nombre' NOT NULL;--> statement-breakpoint
ALTER TABLE "quotes" ADD COLUMN "branch_id" text;--> statement-breakpoint
ALTER TABLE "quotes" ADD COLUMN "branch_name" text;--> statement-breakpoint
ALTER TABLE "quotes" ADD COLUMN "branch_code" text;--> statement-breakpoint
ALTER TABLE "quotes" ADD COLUMN "branch_address" text;--> statement-breakpoint
ALTER TABLE "quotes" ADD COLUMN "branch_city" text;--> statement-breakpoint
ALTER TABLE "quotes" ADD COLUMN "branch_state" text;--> statement-breakpoint
ALTER TABLE "quotes" ADD COLUMN "branch_country" text;--> statement-breakpoint
ALTER TABLE "quotes" ADD COLUMN "branch_postal_code" text;--> statement-breakpoint
ALTER TABLE "quotes" ADD COLUMN "branch_phone" text;--> statement-breakpoint
ALTER TABLE "quotes" ADD COLUMN "branch_email" text;--> statement-breakpoint
ALTER TABLE "quotes" ADD COLUMN "branch_rfc" text;--> statement-breakpoint
ALTER TABLE "quotes" ADD COLUMN "shipping_address" text;--> statement-breakpoint
ALTER TABLE "quotes" ADD COLUMN "shipping_city" text;--> statement-breakpoint
ALTER TABLE "quotes" ADD COLUMN "shipping_state" text;--> statement-breakpoint
ALTER TABLE "quotes" ADD COLUMN "shipping_postal_code" text;--> statement-breakpoint
ALTER TABLE "quotes" ADD COLUMN "shipping_country" text;--> statement-breakpoint
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "quotes_branch_id_idx" ON "quotes" USING btree ("branch_id");--> statement-breakpoint
UPDATE "quotes" SET
  "branch_id" = 'amd-branch-cjs',
  "branch_name" = 'AMD México — Ciudad Juárez',
  "branch_code" = 'CJS',
  "branch_city" = 'Ciudad Juárez',
  "branch_state" = 'Chihuahua',
  "branch_country" = 'México',
  "addressee_mode" = 'nombre',
  "payment_term" = CASE
    WHEN "payment_terms" ILIKE '%15%' THEN 'net_15'::"payment_term"
    WHEN "payment_terms" ILIKE '%45%' THEN 'net_45'::"payment_term"
    WHEN "payment_terms" ILIKE '%60%' THEN 'net_60'::"payment_term"
    WHEN "payment_terms" ILIKE '%90%' THEN 'net_90'::"payment_term"
    WHEN "payment_terms" ILIKE '%120%' THEN 'net_120'::"payment_term"
    ELSE 'net_30'::"payment_term"
  END;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "branch_id" text;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "orders_branch_id_idx" ON "orders" USING btree ("branch_id");--> statement-breakpoint
UPDATE "orders" SET "branch_id" = 'amd-branch-cjs' WHERE "branch_id" IS NULL;--> statement-breakpoint
ALTER TYPE "public"."activity_entity_type" ADD VALUE 'branch';
