CREATE TYPE "public"."quote_item_kind" AS ENUM('pieza', 'servicio_ingenieria');--> statement-breakpoint
ALTER TABLE "quote_items" ADD COLUMN "kind" "quote_item_kind" DEFAULT 'pieza' NOT NULL;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "kind" "quote_item_kind" DEFAULT 'pieza' NOT NULL;--> statement-breakpoint
ALTER TABLE "engineering_hours" ADD COLUMN "started_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "engineering_hours" ADD COLUMN "ended_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "engineering_hours" ADD COLUMN "duration_minutes" integer;--> statement-breakpoint
UPDATE "engineering_hours"
SET
  "started_at" = "worked_on",
  "ended_at" = "worked_on",
  "duration_minutes" = ROUND(("hours"::numeric) * 60)
WHERE "started_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "engineering_hours_open_uidx" ON "engineering_hours" USING btree ("engineering_request_id","user_id") WHERE "ended_at" is null and "started_at" is not null;
