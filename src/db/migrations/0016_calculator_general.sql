ALTER TABLE "machines" ADD COLUMN IF NOT EXISTS "calculator_specs" jsonb;--> statement-breakpoint
ALTER TABLE "materials" ADD COLUMN IF NOT EXISTS "branch_id" text;--> statement-breakpoint
ALTER TABLE "materials" ADD COLUMN IF NOT EXISTS "supplier_material_id" text;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "supplier_materials" (
	"id" text PRIMARY KEY NOT NULL,
	"supplier_id" text NOT NULL,
	"position" integer DEFAULT 1 NOT NULL,
	"description" text NOT NULL,
	"grade" text,
	"thickness_in" numeric(10, 4),
	"cost_per_kg" numeric(14, 4),
	"sheet_width_in" numeric(10, 4),
	"sheet_length_in" numeric(10, 4),
	"density_g_cm3" numeric(10, 4),
	"unit" text DEFAULT 'kg' NOT NULL,
	"notes" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "supplier_materials" ADD CONSTRAINT "supplier_materials_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "materials" ADD CONSTRAINT "materials_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "materials" ADD CONSTRAINT "materials_supplier_material_id_supplier_materials_id_fk" FOREIGN KEY ("supplier_material_id") REFERENCES "public"."supplier_materials"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "supplier_materials_supplier_idx" ON "supplier_materials" USING btree ("supplier_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "materials_branch_id_idx" ON "materials" USING btree ("branch_id");
