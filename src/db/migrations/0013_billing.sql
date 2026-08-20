CREATE TYPE "public"."invoice_status" AS ENUM('borrador', 'emitida', 'parcial', 'pagada', 'cancelada');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('transferencia', 'cheque', 'efectivo', 'otro');--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" text PRIMARY KEY NOT NULL,
	"number" text NOT NULL,
	"order_id" text NOT NULL,
	"customer_id" text NOT NULL,
	"branch_id" text,
	"issue_date" timestamp with time zone NOT NULL,
	"due_date" timestamp with time zone,
	"currency" text DEFAULT 'mxn' NOT NULL,
	"payment_term" text DEFAULT 'net_30',
	"status" "invoice_status" DEFAULT 'borrador' NOT NULL,
	"subtotal" numeric(14, 2) DEFAULT '0' NOT NULL,
	"tax_total" numeric(14, 2) DEFAULT '0' NOT NULL,
	"total" numeric(14, 2) DEFAULT '0' NOT NULL,
	"paid_total" numeric(14, 2) DEFAULT '0' NOT NULL,
	"notes" text,
	"created_by" text,
	"updated_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "invoices_number_uidx" ON "invoices" USING btree ("number");--> statement-breakpoint
CREATE UNIQUE INDEX "invoices_order_uidx" ON "invoices" USING btree ("order_id");--> statement-breakpoint
CREATE TABLE "invoice_items" (
	"id" text PRIMARY KEY NOT NULL,
	"invoice_id" text NOT NULL,
	"position" integer NOT NULL,
	"description" text NOT NULL,
	"quantity" numeric(14, 4) NOT NULL,
	"unit_price" numeric(14, 4) NOT NULL,
	"tax_percent" numeric(5, 2) DEFAULT '16' NOT NULL,
	"line_total" numeric(14, 2) NOT NULL
);--> statement-breakpoint
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE TABLE "invoice_payments" (
	"id" text PRIMARY KEY NOT NULL,
	"invoice_id" text NOT NULL,
	"paid_at" timestamp with time zone NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"method" "payment_method" DEFAULT 'transferencia' NOT NULL,
	"reference" text,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "invoice_payments" ADD CONSTRAINT "invoice_payments_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TYPE "public"."activity_entity_type" ADD VALUE 'invoice';--> statement-breakpoint
ALTER TYPE "public"."document_entity_type" ADD VALUE 'invoice';
