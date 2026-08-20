CREATE TYPE "public"."supplier_status" AS ENUM('activo', 'inactivo');--> statement-breakpoint
CREATE TYPE "public"."purchase_order_status" AS ENUM('borrador', 'enviada', 'confirmada', 'parcial', 'recibida', 'cerrada', 'cancelada');--> statement-breakpoint
CREATE TABLE "suppliers" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"legal_name" text NOT NULL,
	"rfc" text,
	"contact_name" text,
	"email" text,
	"phone" text,
	"address" text,
	"city" text,
	"country" text DEFAULT 'México' NOT NULL,
	"payment_term" text DEFAULT 'net_30',
	"lead_time" text,
	"notes" text,
	"status" "supplier_status" DEFAULT 'activo' NOT NULL,
	"is_demo" boolean DEFAULT false NOT NULL,
	"created_by" text,
	"updated_by" text,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE UNIQUE INDEX "suppliers_code_uidx" ON "suppliers" USING btree ("code");--> statement-breakpoint
CREATE INDEX "suppliers_status_idx" ON "suppliers" USING btree ("status");--> statement-breakpoint
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE TABLE "purchase_orders" (
	"id" text PRIMARY KEY NOT NULL,
	"number" text NOT NULL,
	"supplier_id" text NOT NULL,
	"branch_id" text,
	"production_order_id" text,
	"owner_user_id" text,
	"issue_date" timestamp with time zone NOT NULL,
	"expected_date" timestamp with time zone,
	"currency" text DEFAULT 'mxn' NOT NULL,
	"payment_term" text DEFAULT 'net_30',
	"is_urgent" boolean DEFAULT false NOT NULL,
	"urgent_reason" text,
	"status" "purchase_order_status" DEFAULT 'borrador' NOT NULL,
	"notes" text,
	"subtotal" numeric(14, 2) DEFAULT '0' NOT NULL,
	"tax_total" numeric(14, 2) DEFAULT '0' NOT NULL,
	"total" numeric(14, 2) DEFAULT '0' NOT NULL,
	"is_demo" boolean DEFAULT false NOT NULL,
	"created_by" text,
	"updated_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_production_order_id_production_orders_id_fk" FOREIGN KEY ("production_order_id") REFERENCES "public"."production_orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "purchase_orders_number_uidx" ON "purchase_orders" USING btree ("number");--> statement-breakpoint
CREATE INDEX "purchase_orders_status_idx" ON "purchase_orders" USING btree ("status");--> statement-breakpoint
CREATE TABLE "purchase_order_items" (
	"id" text PRIMARY KEY NOT NULL,
	"purchase_order_id" text NOT NULL,
	"position" integer NOT NULL,
	"material_id" text NOT NULL,
	"warehouse_id" text,
	"description" text NOT NULL,
	"quantity" numeric(14, 4) NOT NULL,
	"received_qty" numeric(14, 4) DEFAULT '0' NOT NULL,
	"unit_price" numeric(14, 4) DEFAULT '0' NOT NULL,
	"tax_percent" numeric(5, 2) DEFAULT '16' NOT NULL,
	"line_subtotal" numeric(14, 2) DEFAULT '0' NOT NULL,
	"line_tax" numeric(14, 2) DEFAULT '0' NOT NULL,
	"line_total" numeric(14, 2) DEFAULT '0' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_purchase_order_id_purchase_orders_id_fk" FOREIGN KEY ("purchase_order_id") REFERENCES "public"."purchase_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_material_id_materials_id_fk" FOREIGN KEY ("material_id") REFERENCES "public"."materials"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE TABLE "purchase_receipts" (
	"id" text PRIMARY KEY NOT NULL,
	"number" text NOT NULL,
	"purchase_order_id" text NOT NULL,
	"received_at" timestamp with time zone NOT NULL,
	"notes" text,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "purchase_receipts" ADD CONSTRAINT "purchase_receipts_purchase_order_id_purchase_orders_id_fk" FOREIGN KEY ("purchase_order_id") REFERENCES "public"."purchase_orders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "purchase_receipts_number_uidx" ON "purchase_receipts" USING btree ("number");--> statement-breakpoint
CREATE TABLE "purchase_receipt_items" (
	"id" text PRIMARY KEY NOT NULL,
	"receipt_id" text NOT NULL,
	"purchase_order_item_id" text NOT NULL,
	"quantity" numeric(14, 4) NOT NULL
);--> statement-breakpoint
ALTER TABLE "purchase_receipt_items" ADD CONSTRAINT "purchase_receipt_items_receipt_id_purchase_receipts_id_fk" FOREIGN KEY ("receipt_id") REFERENCES "public"."purchase_receipts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_receipt_items" ADD CONSTRAINT "purchase_receipt_items_purchase_order_item_id_purchase_order_items_id_fk" FOREIGN KEY ("purchase_order_item_id") REFERENCES "public"."purchase_order_items"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_movements" ADD COLUMN "purchase_order_id" text;--> statement-breakpoint
ALTER TABLE "inventory_movements" ADD COLUMN "purchase_receipt_id" text;--> statement-breakpoint
ALTER TYPE "public"."activity_entity_type" ADD VALUE 'supplier';--> statement-breakpoint
ALTER TYPE "public"."activity_entity_type" ADD VALUE 'purchase_order';--> statement-breakpoint
ALTER TYPE "public"."document_entity_type" ADD VALUE 'supplier';--> statement-breakpoint
ALTER TYPE "public"."document_entity_type" ADD VALUE 'purchase_order';
