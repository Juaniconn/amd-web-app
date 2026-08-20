ALTER TABLE "production_order_materials" ADD COLUMN IF NOT EXISTS "order_id" text;--> statement-breakpoint
UPDATE "production_order_materials" pom
SET "order_id" = po."order_id"
FROM "production_orders" po
WHERE po."id" = pom."production_order_id"
  AND pom."order_id" IS NULL;--> statement-breakpoint
DELETE FROM "production_order_materials" WHERE "order_id" IS NULL;--> statement-breakpoint
ALTER TABLE "production_order_materials" ALTER COLUMN "order_id" SET NOT NULL;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "production_order_materials" ADD CONSTRAINT "production_order_materials_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DROP INDEX IF EXISTS "production_order_materials_ot_material_uidx";--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "production_order_materials_order_material_uidx" ON "production_order_materials" USING btree ("order_id","material_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "production_order_materials_order_idx" ON "production_order_materials" USING btree ("order_id");--> statement-breakpoint
ALTER TABLE "production_order_materials" ALTER COLUMN "production_order_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "production_order_materials" DROP CONSTRAINT IF EXISTS "production_order_materials_production_order_id_production_orders_id_fk";--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "production_order_materials" ADD CONSTRAINT "production_order_materials_production_order_id_production_orders_id_fk" FOREIGN KEY ("production_order_id") REFERENCES "public"."production_orders"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
