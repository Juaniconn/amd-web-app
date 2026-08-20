CREATE TYPE "public"."delivery_status" AS ENUM('pendiente', 'preparando', 'enviado', 'entregado', 'incidencia');--> statement-breakpoint
CREATE TABLE "deliveries" (
	"id" text PRIMARY KEY NOT NULL,
	"number" text NOT NULL,
	"order_id" text NOT NULL,
	"production_order_id" text,
	"branch_id" text,
	"status" "delivery_status" DEFAULT 'pendiente' NOT NULL,
	"scheduled_date" timestamp with time zone,
	"shipped_at" timestamp with time zone,
	"delivered_at" timestamp with time zone,
	"carrier" text,
	"tracking_number" text,
	"quantity" numeric(14, 4),
	"shipping_address" text,
	"shipping_city" text,
	"shipping_state" text,
	"shipping_country" text,
	"notes" text,
	"created_by" text,
	"updated_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "deliveries_number_uidx" ON "deliveries" USING btree ("number");--> statement-breakpoint
CREATE INDEX "deliveries_order_idx" ON "deliveries" USING btree ("order_id");--> statement-breakpoint
ALTER TYPE "public"."activity_entity_type" ADD VALUE 'delivery';--> statement-breakpoint
ALTER TYPE "public"."document_entity_type" ADD VALUE 'delivery';
