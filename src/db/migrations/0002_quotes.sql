CREATE TYPE "public"."order_status" AS ENUM('nuevo');--> statement-breakpoint
CREATE TYPE "public"."quote_currency" AS ENUM('mxn', 'usd');--> statement-breakpoint
CREATE TYPE "public"."quote_status" AS ENUM('borrador', 'en_revision', 'enviada', 'aprobada', 'rechazada', 'expirada', 'convertida');--> statement-breakpoint
CREATE TYPE "public"."document_entity_type" AS ENUM('quote', 'customer', 'order');--> statement-breakpoint
CREATE TYPE "public"."document_storage_backend" AS ENUM('local', 'r2');--> statement-breakpoint
ALTER TYPE "public"."activity_action" ADD VALUE 'status_changed';--> statement-breakpoint
ALTER TYPE "public"."activity_action" ADD VALUE 'sent';--> statement-breakpoint
ALTER TYPE "public"."activity_action" ADD VALUE 'converted';--> statement-breakpoint
ALTER TYPE "public"."activity_action" ADD VALUE 'expired';--> statement-breakpoint
ALTER TYPE "public"."activity_entity_type" ADD VALUE 'quote';--> statement-breakpoint
ALTER TYPE "public"."activity_entity_type" ADD VALUE 'quote_item';--> statement-breakpoint
ALTER TYPE "public"."activity_entity_type" ADD VALUE 'document';--> statement-breakpoint
ALTER TYPE "public"."activity_entity_type" ADD VALUE 'order';--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" text PRIMARY KEY NOT NULL,
	"order_id" text NOT NULL,
	"position" integer NOT NULL,
	"description" text NOT NULL,
	"part_number" text,
	"quantity" numeric(12, 4) NOT NULL,
	"unit" text DEFAULT 'pza' NOT NULL,
	"unit_price" numeric(14, 4) DEFAULT '0' NOT NULL,
	"discount_percent" numeric(5, 2) DEFAULT '0' NOT NULL,
	"tax_percent" numeric(5, 2) DEFAULT '16' NOT NULL,
	"line_subtotal" numeric(14, 2) DEFAULT '0' NOT NULL,
	"line_tax" numeric(14, 2) DEFAULT '0' NOT NULL,
	"line_total" numeric(14, 2) DEFAULT '0' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" text PRIMARY KEY NOT NULL,
	"number" text NOT NULL,
	"customer_id" text NOT NULL,
	"quote_id" text NOT NULL,
	"currency" "quote_currency" DEFAULT 'mxn' NOT NULL,
	"total" numeric(14, 2) DEFAULT '0' NOT NULL,
	"status" "order_status" DEFAULT 'nuevo' NOT NULL,
	"is_demo" boolean DEFAULT false NOT NULL,
	"created_by" text,
	"updated_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quote_items" (
	"id" text PRIMARY KEY NOT NULL,
	"quote_id" text NOT NULL,
	"position" integer NOT NULL,
	"description" text NOT NULL,
	"part_number" text,
	"quantity" numeric(12, 4) NOT NULL,
	"unit" text DEFAULT 'pza' NOT NULL,
	"unit_price" numeric(14, 4) DEFAULT '0' NOT NULL,
	"discount_percent" numeric(5, 2) DEFAULT '0' NOT NULL,
	"tax_percent" numeric(5, 2) DEFAULT '16' NOT NULL,
	"estimated_cost" numeric(14, 4) DEFAULT '0' NOT NULL,
	"line_subtotal" numeric(14, 2) DEFAULT '0' NOT NULL,
	"line_tax" numeric(14, 2) DEFAULT '0' NOT NULL,
	"line_total" numeric(14, 2) DEFAULT '0' NOT NULL,
	"line_estimated_cost" numeric(14, 2) DEFAULT '0' NOT NULL,
	"line_profit" numeric(14, 2) DEFAULT '0' NOT NULL,
	"line_margin_percent" numeric(7, 2),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quotes" (
	"id" text PRIMARY KEY NOT NULL,
	"number" text NOT NULL,
	"customer_id" text NOT NULL,
	"contact_id" text,
	"owner_user_id" text,
	"issue_date" timestamp with time zone NOT NULL,
	"valid_until" timestamp with time zone,
	"currency" "quote_currency" DEFAULT 'mxn' NOT NULL,
	"payment_terms" text,
	"lead_time" text,
	"notes" text,
	"status" "quote_status" DEFAULT 'borrador' NOT NULL,
	"subtotal" numeric(14, 2) DEFAULT '0' NOT NULL,
	"tax_total" numeric(14, 2) DEFAULT '0' NOT NULL,
	"total" numeric(14, 2) DEFAULT '0' NOT NULL,
	"estimated_cost" numeric(14, 2) DEFAULT '0' NOT NULL,
	"estimated_profit" numeric(14, 2) DEFAULT '0' NOT NULL,
	"margin_percent" numeric(7, 2),
	"converted_order_id" text,
	"is_demo" boolean DEFAULT false NOT NULL,
	"created_by" text,
	"updated_by" text,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" text PRIMARY KEY NOT NULL,
	"entity_type" "document_entity_type" NOT NULL,
	"entity_id" text NOT NULL,
	"original_name" text NOT NULL,
	"mime_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"checksum_sha256" text,
	"storage_backend" "document_storage_backend" DEFAULT 'local' NOT NULL,
	"object_key" text NOT NULL,
	"uploaded_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_quote_id_quotes_id_fk" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_items" ADD CONSTRAINT "quote_items_quote_id_quotes_id_fk" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_converted_order_id_orders_id_fk" FOREIGN KEY ("converted_order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "order_items_order_id_idx" ON "order_items" USING btree ("order_id");--> statement-breakpoint
CREATE UNIQUE INDEX "orders_number_uidx" ON "orders" USING btree ("number");--> statement-breakpoint
CREATE UNIQUE INDEX "orders_quote_id_uidx" ON "orders" USING btree ("quote_id");--> statement-breakpoint
CREATE INDEX "orders_customer_id_idx" ON "orders" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "quote_items_quote_id_idx" ON "quote_items" USING btree ("quote_id");--> statement-breakpoint
CREATE UNIQUE INDEX "quote_items_quote_position_uidx" ON "quote_items" USING btree ("quote_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "quotes_number_uidx" ON "quotes" USING btree ("number");--> statement-breakpoint
CREATE INDEX "quotes_customer_id_idx" ON "quotes" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "quotes_status_idx" ON "quotes" USING btree ("status");--> statement-breakpoint
CREATE INDEX "quotes_deleted_at_idx" ON "quotes" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "quotes_valid_until_idx" ON "quotes" USING btree ("valid_until");--> statement-breakpoint
CREATE UNIQUE INDEX "quotes_converted_order_uidx" ON "quotes" USING btree ("converted_order_id") WHERE "quotes"."converted_order_id" is not null;--> statement-breakpoint
CREATE INDEX "documents_entity_idx" ON "documents" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "documents_object_key_idx" ON "documents" USING btree ("object_key");