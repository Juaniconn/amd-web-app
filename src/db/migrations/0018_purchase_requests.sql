ALTER TYPE "activity_entity_type" ADD VALUE IF NOT EXISTS 'purchase_request';--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "purchase_request_status" AS ENUM('borrador', 'solicitada', 'convertida', 'cancelada');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "purchase_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"number" text NOT NULL,
	"order_id" text NOT NULL,
	"status" "purchase_request_status" DEFAULT 'borrador' NOT NULL,
	"notes" text,
	"is_demo" boolean DEFAULT false NOT NULL,
	"created_by" text,
	"updated_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "purchase_request_items" (
	"id" text PRIMARY KEY NOT NULL,
	"purchase_request_id" text NOT NULL,
	"position" integer NOT NULL,
	"material_id" text NOT NULL,
	"quantity" numeric(14, 4) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD COLUMN IF NOT EXISTS "order_id" text;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD COLUMN IF NOT EXISTS "purchase_request_id" text;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "purchase_requests" ADD CONSTRAINT "purchase_requests_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "purchase_requests" ADD CONSTRAINT "purchase_requests_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "purchase_requests" ADD CONSTRAINT "purchase_requests_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "purchase_request_items" ADD CONSTRAINT "purchase_request_items_purchase_request_id_purchase_requests_id_fk" FOREIGN KEY ("purchase_request_id") REFERENCES "public"."purchase_requests"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "purchase_request_items" ADD CONSTRAINT "purchase_request_items_material_id_materials_id_fk" FOREIGN KEY ("material_id") REFERENCES "public"."materials"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_purchase_request_id_purchase_requests_id_fk" FOREIGN KEY ("purchase_request_id") REFERENCES "public"."purchase_requests"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "purchase_requests_number_uidx" ON "purchase_requests" USING btree ("number");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "purchase_requests_order_idx" ON "purchase_requests" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "purchase_requests_status_idx" ON "purchase_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "purchase_request_items_request_idx" ON "purchase_request_items" USING btree ("purchase_request_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "purchase_orders_order_idx" ON "purchase_orders" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "purchase_orders_request_idx" ON "purchase_orders" USING btree ("purchase_request_id");
