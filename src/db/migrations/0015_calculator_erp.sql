CREATE TYPE "public"."machine_kind" AS ENUM('laser', 'press_brake', 'otro');--> statement-breakpoint
CREATE TABLE "plant_rates" (
	"id" text PRIMARY KEY NOT NULL,
	"is_placeholder" boolean DEFAULT true NOT NULL,
	"default_margin_pct" numeric(8, 4) DEFAULT '30' NOT NULL,
	"a36_cost_per_kg" numeric(14, 4) DEFAULT '38' NOT NULL,
	"machine_hourly" numeric(14, 4) DEFAULT '1200' NOT NULL,
	"press_hourly" numeric(14, 4) DEFAULT '650' NOT NULL,
	"bend_unit_cost" numeric(14, 4) DEFAULT '18' NOT NULL,
	"powder_coat_min" numeric(14, 4) DEFAULT '480' NOT NULL,
	"powder_coat_per_m2" numeric(14, 4) DEFAULT '165' NOT NULL,
	"engineering_hours" numeric(8, 4) DEFAULT '1.5' NOT NULL,
	"engineering_hourly" numeric(14, 4) DEFAULT '450' NOT NULL,
	"packing_unit" numeric(14, 4) DEFAULT '75' NOT NULL,
	"cut_speed_ipm" numeric(14, 4) DEFAULT '100' NOT NULL,
	"pierce_sec" numeric(8, 4) DEFAULT '1.2' NOT NULL,
	"load_min" numeric(8, 4) DEFAULT '1.5' NOT NULL,
	"unload_min" numeric(8, 4) DEFAULT '1' NOT NULL,
	"durma_setup_min" numeric(8, 4) DEFAULT '12' NOT NULL,
	"durma_sec_per_hit" numeric(8, 4) DEFAULT '18' NOT NULL,
	"press_bend_length_mm" numeric(14, 4) DEFAULT '3050' NOT NULL,
	"press_tonnage_ton" numeric(14, 4) DEFAULT '220' NOT NULL,
	"updated_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "machines" ADD COLUMN "kind" "machine_kind" DEFAULT 'otro' NOT NULL;--> statement-breakpoint
ALTER TABLE "machines" ADD COLUMN "hourly_cost" numeric(14, 4);--> statement-breakpoint
ALTER TABLE "machines" ADD COLUMN "bend_length_mm" numeric(14, 4);--> statement-breakpoint
ALTER TABLE "machines" ADD COLUMN "tonnage_ton" numeric(14, 4);--> statement-breakpoint
ALTER TABLE "materials" ADD COLUMN "grade" text;--> statement-breakpoint
ALTER TABLE "materials" ADD COLUMN "thickness_in" numeric(10, 4);--> statement-breakpoint
ALTER TABLE "materials" ADD COLUMN "cost_per_kg" numeric(14, 4);--> statement-breakpoint
ALTER TABLE "materials" ADD COLUMN "sheet_width_in" numeric(10, 4);--> statement-breakpoint
ALTER TABLE "materials" ADD COLUMN "sheet_length_in" numeric(10, 4);--> statement-breakpoint
ALTER TABLE "materials" ADD COLUMN "density_g_cm3" numeric(10, 4);--> statement-breakpoint
ALTER TABLE "materials" ADD COLUMN "supplier_id" text;--> statement-breakpoint
ALTER TABLE "materials" ADD COLUMN "used_in_calculator" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "website" text;--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "material_available" text;--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "classification" text;--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "advantages" text;--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "disadvantages" text;--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "distance_note" text;--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "used_in_calculator" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "plant_rates" ADD CONSTRAINT "plant_rates_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "materials" ADD CONSTRAINT "materials_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "materials_used_in_calculator_idx" ON "materials" USING btree ("used_in_calculator");--> statement-breakpoint
CREATE INDEX "suppliers_used_in_calculator_idx" ON "suppliers" USING btree ("used_in_calculator");--> statement-breakpoint
CREATE INDEX "machines_kind_idx" ON "machines" USING btree ("kind");
