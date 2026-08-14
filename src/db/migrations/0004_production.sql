CREATE TYPE "public"."production_order_status" AS ENUM('pendiente', 'liberada', 'programada', 'en_produccion', 'pausada', 'esperando_material', 'calidad', 'terminada', 'entregada', 'cancelada');--> statement-breakpoint
CREATE TYPE "public"."production_priority" AS ENUM('urgente', 'compromiso_inmediato', 'programada', 'produccion_normal');--> statement-breakpoint
CREATE TYPE "public"."machine_status" AS ENUM('disponible', 'en_produccion', 'ocupada', 'mantenimiento', 'fuera_de_servicio');--> statement-breakpoint
CREATE TYPE "public"."production_route_step_kind" AS ENUM('ingenieria', 'produccion', 'calidad', 'entrega');--> statement-breakpoint
CREATE TYPE "public"."production_operation_status" AS ENUM('pendiente', 'en_proceso', 'terminada', 'omitida');--> statement-breakpoint
ALTER TYPE "public"."activity_action" ADD VALUE 'scheduled';--> statement-breakpoint
ALTER TYPE "public"."activity_action" ADD VALUE 'closed';--> statement-breakpoint
ALTER TYPE "public"."activity_action" ADD VALUE 'downtime_logged';--> statement-breakpoint
ALTER TYPE "public"."activity_action" ADD VALUE 'rework_logged';--> statement-breakpoint
ALTER TYPE "public"."activity_entity_type" ADD VALUE 'production_order';--> statement-breakpoint
ALTER TYPE "public"."activity_entity_type" ADD VALUE 'machine';--> statement-breakpoint
ALTER TYPE "public"."activity_entity_type" ADD VALUE 'work_center';--> statement-breakpoint
ALTER TYPE "public"."activity_entity_type" ADD VALUE 'production_route';--> statement-breakpoint
ALTER TYPE "public"."activity_entity_type" ADD VALUE 'machine_hours';--> statement-breakpoint
ALTER TYPE "public"."activity_entity_type" ADD VALUE 'labor_hours';--> statement-breakpoint
ALTER TYPE "public"."activity_entity_type" ADD VALUE 'production_downtime';--> statement-breakpoint
ALTER TYPE "public"."activity_entity_type" ADD VALUE 'production_rework';--> statement-breakpoint
CREATE TABLE "work_centers" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"is_demo" boolean DEFAULT false NOT NULL,
	"created_by" text,
	"updated_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "machines" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"brand" text,
	"model" text,
	"year" integer,
	"work_center_id" text NOT NULL,
	"responsible_user_id" text,
	"hours_per_shift" numeric(6, 2) DEFAULT '8' NOT NULL,
	"capacity" text,
	"notes" text,
	"status" "machine_status" DEFAULT 'disponible' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"commissioned_at" timestamp with time zone,
	"decommissioned_at" timestamp with time zone,
	"is_demo" boolean DEFAULT false NOT NULL,
	"created_by" text,
	"updated_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "production_routes" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"active" boolean DEFAULT true NOT NULL,
	"is_official_seed" boolean DEFAULT false NOT NULL,
	"created_by" text,
	"updated_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "production_route_steps" (
	"id" text PRIMARY KEY NOT NULL,
	"route_id" text NOT NULL,
	"position" integer NOT NULL,
	"kind" "production_route_step_kind" DEFAULT 'produccion' NOT NULL,
	"work_center_id" text,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "downtime_reasons" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"is_official_seed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "production_orders" (
	"id" text PRIMARY KEY NOT NULL,
	"number" text NOT NULL,
	"order_id" text NOT NULL,
	"order_item_id" text,
	"customer_id" text NOT NULL,
	"quote_id" text NOT NULL,
	"engineering_request_id" text,
	"origin" text NOT NULL,
	"route_id" text,
	"description" text NOT NULL,
	"part_number" text,
	"quantity" numeric(12, 4) NOT NULL,
	"unit" text DEFAULT 'pza' NOT NULL,
	"promised_date" timestamp with time zone NOT NULL,
	"priority" "production_priority" DEFAULT 'produccion_normal' NOT NULL,
	"status" "production_order_status" DEFAULT 'pendiente' NOT NULL,
	"notes" text,
	"work_center_id" text,
	"machine_id" text,
	"operator_user_id" text,
	"pause_reason_id" text,
	"released_at" timestamp with time zone,
	"scheduled_at" timestamp with time zone,
	"started_at" timestamp with time zone,
	"paused_at" timestamp with time zone,
	"quality_at" timestamp with time zone,
	"physically_closed_at" timestamp with time zone,
	"physically_closed_by" text,
	"administratively_closed_at" timestamp with time zone,
	"administratively_closed_by" text,
	"cancelled_at" timestamp with time zone,
	"delivered_at" timestamp with time zone,
	"is_demo" boolean DEFAULT false NOT NULL,
	"created_by" text,
	"updated_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "production_operations" (
	"id" text PRIMARY KEY NOT NULL,
	"production_order_id" text NOT NULL,
	"route_step_id" text,
	"position" integer NOT NULL,
	"kind" "production_route_step_kind" DEFAULT 'produccion' NOT NULL,
	"work_center_id" text,
	"name" text NOT NULL,
	"status" "production_operation_status" DEFAULT 'pendiente' NOT NULL,
	"machine_id" text,
	"operator_user_id" text,
	"started_at" timestamp with time zone,
	"finished_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "machine_hours" (
	"id" text PRIMARY KEY NOT NULL,
	"production_order_id" text NOT NULL,
	"operation_id" text,
	"machine_id" text NOT NULL,
	"operator_user_id" text,
	"started_at" timestamp with time zone NOT NULL,
	"ended_at" timestamp with time zone,
	"duration_minutes" integer,
	"notes" text,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "labor_hours" (
	"id" text PRIMARY KEY NOT NULL,
	"production_order_id" text NOT NULL,
	"operation_id" text,
	"operator_user_id" text NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"ended_at" timestamp with time zone,
	"duration_minutes" integer,
	"notes" text,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "production_downtime" (
	"id" text PRIMARY KEY NOT NULL,
	"production_order_id" text NOT NULL,
	"machine_id" text,
	"reason_id" text NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"ended_at" timestamp with time zone,
	"duration_minutes" integer,
	"notes" text,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "production_rework" (
	"id" text PRIMARY KEY NOT NULL,
	"production_order_id" text NOT NULL,
	"part_number" text,
	"quantity" numeric(12, 4) NOT NULL,
	"scrap_quantity" numeric(12, 4) DEFAULT '0' NOT NULL,
	"root_cause" text NOT NULL,
	"labor_hours" numeric(8, 2) DEFAULT '0' NOT NULL,
	"machine_hours" numeric(8, 2) DEFAULT '0' NOT NULL,
	"quality_released" boolean DEFAULT false NOT NULL,
	"quality_released_at" timestamp with time zone,
	"quality_released_by" text,
	"notes" text,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "work_centers" ADD CONSTRAINT "work_centers_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_centers" ADD CONSTRAINT "work_centers_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "machines" ADD CONSTRAINT "machines_work_center_id_work_centers_id_fk" FOREIGN KEY ("work_center_id") REFERENCES "public"."work_centers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "machines" ADD CONSTRAINT "machines_responsible_user_id_users_id_fk" FOREIGN KEY ("responsible_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "machines" ADD CONSTRAINT "machines_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "machines" ADD CONSTRAINT "machines_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_routes" ADD CONSTRAINT "production_routes_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_routes" ADD CONSTRAINT "production_routes_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_route_steps" ADD CONSTRAINT "production_route_steps_route_id_production_routes_id_fk" FOREIGN KEY ("route_id") REFERENCES "public"."production_routes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_route_steps" ADD CONSTRAINT "production_route_steps_work_center_id_work_centers_id_fk" FOREIGN KEY ("work_center_id") REFERENCES "public"."work_centers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_orders" ADD CONSTRAINT "production_orders_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_orders" ADD CONSTRAINT "production_orders_order_item_id_order_items_id_fk" FOREIGN KEY ("order_item_id") REFERENCES "public"."order_items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_orders" ADD CONSTRAINT "production_orders_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_orders" ADD CONSTRAINT "production_orders_quote_id_quotes_id_fk" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_orders" ADD CONSTRAINT "production_orders_engineering_request_id_engineering_requests_id_fk" FOREIGN KEY ("engineering_request_id") REFERENCES "public"."engineering_requests"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_orders" ADD CONSTRAINT "production_orders_route_id_production_routes_id_fk" FOREIGN KEY ("route_id") REFERENCES "public"."production_routes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_orders" ADD CONSTRAINT "production_orders_work_center_id_work_centers_id_fk" FOREIGN KEY ("work_center_id") REFERENCES "public"."work_centers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_orders" ADD CONSTRAINT "production_orders_machine_id_machines_id_fk" FOREIGN KEY ("machine_id") REFERENCES "public"."machines"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_orders" ADD CONSTRAINT "production_orders_operator_user_id_users_id_fk" FOREIGN KEY ("operator_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_orders" ADD CONSTRAINT "production_orders_pause_reason_id_downtime_reasons_id_fk" FOREIGN KEY ("pause_reason_id") REFERENCES "public"."downtime_reasons"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_orders" ADD CONSTRAINT "production_orders_physically_closed_by_users_id_fk" FOREIGN KEY ("physically_closed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_orders" ADD CONSTRAINT "production_orders_administratively_closed_by_users_id_fk" FOREIGN KEY ("administratively_closed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_orders" ADD CONSTRAINT "production_orders_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_orders" ADD CONSTRAINT "production_orders_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_operations" ADD CONSTRAINT "production_operations_production_order_id_production_orders_id_fk" FOREIGN KEY ("production_order_id") REFERENCES "public"."production_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_operations" ADD CONSTRAINT "production_operations_route_step_id_production_route_steps_id_fk" FOREIGN KEY ("route_step_id") REFERENCES "public"."production_route_steps"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_operations" ADD CONSTRAINT "production_operations_work_center_id_work_centers_id_fk" FOREIGN KEY ("work_center_id") REFERENCES "public"."work_centers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_operations" ADD CONSTRAINT "production_operations_machine_id_machines_id_fk" FOREIGN KEY ("machine_id") REFERENCES "public"."machines"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_operations" ADD CONSTRAINT "production_operations_operator_user_id_users_id_fk" FOREIGN KEY ("operator_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "machine_hours" ADD CONSTRAINT "machine_hours_production_order_id_production_orders_id_fk" FOREIGN KEY ("production_order_id") REFERENCES "public"."production_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "machine_hours" ADD CONSTRAINT "machine_hours_operation_id_production_operations_id_fk" FOREIGN KEY ("operation_id") REFERENCES "public"."production_operations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "machine_hours" ADD CONSTRAINT "machine_hours_machine_id_machines_id_fk" FOREIGN KEY ("machine_id") REFERENCES "public"."machines"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "machine_hours" ADD CONSTRAINT "machine_hours_operator_user_id_users_id_fk" FOREIGN KEY ("operator_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "machine_hours" ADD CONSTRAINT "machine_hours_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "labor_hours" ADD CONSTRAINT "labor_hours_production_order_id_production_orders_id_fk" FOREIGN KEY ("production_order_id") REFERENCES "public"."production_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "labor_hours" ADD CONSTRAINT "labor_hours_operation_id_production_operations_id_fk" FOREIGN KEY ("operation_id") REFERENCES "public"."production_operations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "labor_hours" ADD CONSTRAINT "labor_hours_operator_user_id_users_id_fk" FOREIGN KEY ("operator_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "labor_hours" ADD CONSTRAINT "labor_hours_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_downtime" ADD CONSTRAINT "production_downtime_production_order_id_production_orders_id_fk" FOREIGN KEY ("production_order_id") REFERENCES "public"."production_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_downtime" ADD CONSTRAINT "production_downtime_machine_id_machines_id_fk" FOREIGN KEY ("machine_id") REFERENCES "public"."machines"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_downtime" ADD CONSTRAINT "production_downtime_reason_id_downtime_reasons_id_fk" FOREIGN KEY ("reason_id") REFERENCES "public"."downtime_reasons"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_downtime" ADD CONSTRAINT "production_downtime_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_rework" ADD CONSTRAINT "production_rework_production_order_id_production_orders_id_fk" FOREIGN KEY ("production_order_id") REFERENCES "public"."production_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_rework" ADD CONSTRAINT "production_rework_quality_released_by_users_id_fk" FOREIGN KEY ("quality_released_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_rework" ADD CONSTRAINT "production_rework_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "work_centers_code_uidx" ON "work_centers" USING btree ("code");--> statement-breakpoint
CREATE INDEX "work_centers_active_idx" ON "work_centers" USING btree ("active");--> statement-breakpoint
CREATE INDEX "machines_work_center_id_idx" ON "machines" USING btree ("work_center_id");--> statement-breakpoint
CREATE INDEX "machines_active_idx" ON "machines" USING btree ("active");--> statement-breakpoint
CREATE INDEX "machines_status_idx" ON "machines" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "production_routes_code_uidx" ON "production_routes" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "production_route_steps_route_position_uidx" ON "production_route_steps" USING btree ("route_id","position");--> statement-breakpoint
CREATE INDEX "production_route_steps_route_id_idx" ON "production_route_steps" USING btree ("route_id");--> statement-breakpoint
CREATE UNIQUE INDEX "downtime_reasons_code_uidx" ON "downtime_reasons" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "production_orders_number_uidx" ON "production_orders" USING btree ("number");--> statement-breakpoint
CREATE INDEX "production_orders_order_id_idx" ON "production_orders" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "production_orders_customer_id_idx" ON "production_orders" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "production_orders_status_idx" ON "production_orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "production_orders_priority_idx" ON "production_orders" USING btree ("priority");--> statement-breakpoint
CREATE INDEX "production_orders_promised_date_idx" ON "production_orders" USING btree ("promised_date");--> statement-breakpoint
CREATE INDEX "production_orders_work_center_id_idx" ON "production_orders" USING btree ("work_center_id");--> statement-breakpoint
CREATE INDEX "production_orders_machine_id_idx" ON "production_orders" USING btree ("machine_id");--> statement-breakpoint
CREATE INDEX "production_orders_origin_idx" ON "production_orders" USING btree ("origin");--> statement-breakpoint
CREATE UNIQUE INDEX "production_operations_order_position_uidx" ON "production_operations" USING btree ("production_order_id","position");--> statement-breakpoint
CREATE INDEX "production_operations_order_idx" ON "production_operations" USING btree ("production_order_id");--> statement-breakpoint
CREATE INDEX "production_operations_work_center_idx" ON "production_operations" USING btree ("work_center_id");--> statement-breakpoint
CREATE INDEX "machine_hours_order_idx" ON "machine_hours" USING btree ("production_order_id");--> statement-breakpoint
CREATE INDEX "machine_hours_machine_idx" ON "machine_hours" USING btree ("machine_id");--> statement-breakpoint
CREATE UNIQUE INDEX "machine_hours_open_machine_uidx" ON "machine_hours" USING btree ("machine_id") WHERE "ended_at" is null;--> statement-breakpoint
CREATE INDEX "labor_hours_order_idx" ON "labor_hours" USING btree ("production_order_id");--> statement-breakpoint
CREATE INDEX "labor_hours_operator_idx" ON "labor_hours" USING btree ("operator_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "labor_hours_open_operator_uidx" ON "labor_hours" USING btree ("operator_user_id") WHERE "ended_at" is null;--> statement-breakpoint
CREATE INDEX "production_downtime_order_idx" ON "production_downtime" USING btree ("production_order_id");--> statement-breakpoint
CREATE INDEX "production_downtime_reason_idx" ON "production_downtime" USING btree ("reason_id");--> statement-breakpoint
CREATE INDEX "production_rework_order_idx" ON "production_rework" USING btree ("production_order_id");
