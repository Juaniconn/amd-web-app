CREATE TYPE "public"."quote_rfq_type" AS ENUM('solo_fabricacion', 'diseno_fabricacion', 'diseno_solamente', 'reverse_engineering');--> statement-breakpoint
CREATE TYPE "public"."quote_engineering_type" AS ENUM('diseno_nuevo', 'modificacion', 'reverse_engineering', 'manufacturabilidad');--> statement-breakpoint
CREATE TYPE "public"."quote_engineering_status" AS ENUM('no_requerida', 'pendiente', 'en_proceso', 'esperando_cliente', 'aprobada', 'liberada');--> statement-breakpoint
CREATE TYPE "public"."order_origin" AS ENUM('rfq_directa', 'rfq_ingenieria');--> statement-breakpoint
CREATE TYPE "public"."engineering_request_status" AS ENUM('pendiente', 'asignado', 'disenando', 'revision_interna', 'esperando_cliente', 'correcciones', 'aprobado', 'liberado', 'cancelado');--> statement-breakpoint
CREATE TYPE "public"."engineering_priority" AS ENUM('baja', 'media', 'alta');--> statement-breakpoint
ALTER TYPE "public"."activity_action" ADD VALUE 'assigned';--> statement-breakpoint
ALTER TYPE "public"."activity_action" ADD VALUE 'approved';--> statement-breakpoint
ALTER TYPE "public"."activity_action" ADD VALUE 'released';--> statement-breakpoint
ALTER TYPE "public"."activity_action" ADD VALUE 'cancelled';--> statement-breakpoint
ALTER TYPE "public"."activity_action" ADD VALUE 'hours_logged';--> statement-breakpoint
ALTER TYPE "public"."activity_entity_type" ADD VALUE 'engineering_request';--> statement-breakpoint
ALTER TYPE "public"."activity_entity_type" ADD VALUE 'engineering_hours';--> statement-breakpoint
ALTER TYPE "public"."document_entity_type" ADD VALUE 'engineering_request';--> statement-breakpoint
ALTER TABLE "quotes" ADD COLUMN "rfq_type" "quote_rfq_type" DEFAULT 'solo_fabricacion' NOT NULL;--> statement-breakpoint
ALTER TABLE "quotes" ADD COLUMN "requires_engineering" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "quotes" ADD COLUMN "engineering_type" "quote_engineering_type";--> statement-breakpoint
ALTER TABLE "quotes" ADD COLUMN "engineering_status" "quote_engineering_status" DEFAULT 'no_requerida' NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "origin" "order_origin" DEFAULT 'rfq_directa' NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "engineering_request_id" text;--> statement-breakpoint
CREATE TABLE "engineering_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"number" text NOT NULL,
	"customer_id" text NOT NULL,
	"quote_id" text NOT NULL,
	"assignee_user_id" text,
	"description" text NOT NULL,
	"notes" text,
	"project_type" text NOT NULL,
	"priority" "engineering_priority" DEFAULT 'media' NOT NULL,
	"due_date" timestamp with time zone,
	"status" "engineering_request_status" DEFAULT 'pendiente' NOT NULL,
	"hours_logged" numeric(10, 2) DEFAULT '0' NOT NULL,
	"assigned_at" timestamp with time zone,
	"design_started_at" timestamp with time zone,
	"approved_at" timestamp with time zone,
	"released_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"released_by" text,
	"is_demo" boolean DEFAULT false NOT NULL,
	"created_by" text,
	"updated_by" text,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "engineering_hours" (
	"id" text PRIMARY KEY NOT NULL,
	"engineering_request_id" text NOT NULL,
	"user_id" text,
	"hours" numeric(8, 2) NOT NULL,
	"note" text,
	"worked_on" timestamp with time zone NOT NULL,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "engineering_requests" ADD CONSTRAINT "engineering_requests_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "engineering_requests" ADD CONSTRAINT "engineering_requests_quote_id_quotes_id_fk" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "engineering_requests" ADD CONSTRAINT "engineering_requests_assignee_user_id_users_id_fk" FOREIGN KEY ("assignee_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "engineering_requests" ADD CONSTRAINT "engineering_requests_released_by_users_id_fk" FOREIGN KEY ("released_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "engineering_requests" ADD CONSTRAINT "engineering_requests_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "engineering_requests" ADD CONSTRAINT "engineering_requests_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "engineering_hours" ADD CONSTRAINT "engineering_hours_engineering_request_id_engineering_requests_id_fk" FOREIGN KEY ("engineering_request_id") REFERENCES "public"."engineering_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "engineering_hours" ADD CONSTRAINT "engineering_hours_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "engineering_hours" ADD CONSTRAINT "engineering_hours_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_engineering_request_id_engineering_requests_id_fk" FOREIGN KEY ("engineering_request_id") REFERENCES "public"."engineering_requests"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "engineering_requests_number_uidx" ON "engineering_requests" USING btree ("number");--> statement-breakpoint
CREATE UNIQUE INDEX "engineering_requests_quote_active_uidx" ON "engineering_requests" USING btree ("quote_id") WHERE "deleted_at" is null;--> statement-breakpoint
CREATE INDEX "engineering_requests_customer_id_idx" ON "engineering_requests" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "engineering_requests_status_idx" ON "engineering_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "engineering_requests_assignee_idx" ON "engineering_requests" USING btree ("assignee_user_id");--> statement-breakpoint
CREATE INDEX "engineering_requests_due_date_idx" ON "engineering_requests" USING btree ("due_date");--> statement-breakpoint
CREATE INDEX "engineering_requests_deleted_at_idx" ON "engineering_requests" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "engineering_hours_request_idx" ON "engineering_hours" USING btree ("engineering_request_id");--> statement-breakpoint
CREATE INDEX "engineering_hours_user_idx" ON "engineering_hours" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "quotes_rfq_type_idx" ON "quotes" USING btree ("rfq_type");--> statement-breakpoint
CREATE INDEX "quotes_engineering_status_idx" ON "quotes" USING btree ("engineering_status");--> statement-breakpoint
CREATE INDEX "orders_origin_idx" ON "orders" USING btree ("origin");--> statement-breakpoint
CREATE INDEX "orders_engineering_request_id_idx" ON "orders" USING btree ("engineering_request_id");
