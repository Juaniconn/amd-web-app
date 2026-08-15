ALTER TYPE "public"."order_status" RENAME TO "order_status_old";--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('borrador', 'pendiente', 'aprobado', 'en_produccion', 'completado', 'cancelado');--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "status" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "status" TYPE "public"."order_status" USING (
  CASE "status"::text
    WHEN 'nuevo' THEN 'pendiente'
    ELSE "status"::text
  END
)::"public"."order_status";--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "status" SET DEFAULT 'pendiente';--> statement-breakpoint
DROP TYPE "public"."order_status_old";--> statement-breakpoint
CREATE TYPE "public"."project_status" AS ENUM('planeacion', 'activo', 'pausado', 'completado', 'cancelado');--> statement-breakpoint
CREATE TABLE "projects" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"customer_id" text NOT NULL,
	"description" text,
	"owner_user_id" text,
	"status" "project_status" DEFAULT 'planeacion' NOT NULL,
	"start_date" timestamp with time zone,
	"estimated_end_date" timestamp with time zone,
	"notes" text,
	"is_demo" boolean DEFAULT false NOT NULL,
	"created_by" text,
	"updated_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "projects_code_uidx" ON "projects" USING btree ("code");--> statement-breakpoint
CREATE INDEX "projects_customer_id_idx" ON "projects" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "projects_status_idx" ON "projects" USING btree ("status");--> statement-breakpoint
CREATE INDEX "projects_owner_user_id_idx" ON "projects" USING btree ("owner_user_id");--> statement-breakpoint
CREATE INDEX "projects_estimated_end_date_idx" ON "projects" USING btree ("estimated_end_date");--> statement-breakpoint
ALTER TABLE "quotes" ADD COLUMN "project_id" text;--> statement-breakpoint
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "quotes_project_id_idx" ON "quotes" USING btree ("project_id");--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "project_id" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "owner_user_id" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "promised_date" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "notes" text;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "orders_project_id_idx" ON "orders" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "orders_status_idx" ON "orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "orders_promised_date_idx" ON "orders" USING btree ("promised_date");--> statement-breakpoint
ALTER TYPE "public"."activity_entity_type" ADD VALUE 'project';--> statement-breakpoint
ALTER TYPE "public"."document_entity_type" ADD VALUE 'project';
