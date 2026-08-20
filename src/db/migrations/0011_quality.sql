CREATE TYPE "public"."inspection_type" AS ENUM('primera_pieza', 'en_proceso', 'final');--> statement-breakpoint
CREATE TYPE "public"."inspection_result" AS ENUM('aprobado', 'aprobado_observaciones', 'rechazado');--> statement-breakpoint
CREATE TYPE "public"."ncr_status" AS ENUM('abierta', 'en_analisis', 'retrabajo', 'cerrada', 'cancelada');--> statement-breakpoint
CREATE TABLE "quality_inspections" (
	"id" text PRIMARY KEY NOT NULL,
	"number" text NOT NULL,
	"production_order_id" text NOT NULL,
	"type" "inspection_type" NOT NULL,
	"inspector_user_id" text,
	"inspected_at" timestamp with time zone NOT NULL,
	"part_number" text,
	"qty_inspected" numeric(14, 4) NOT NULL,
	"qty_accepted" numeric(14, 4) DEFAULT '0' NOT NULL,
	"qty_rejected" numeric(14, 4) DEFAULT '0' NOT NULL,
	"result" "inspection_result" NOT NULL,
	"notes" text,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "quality_inspections" ADD CONSTRAINT "quality_inspections_production_order_id_production_orders_id_fk" FOREIGN KEY ("production_order_id") REFERENCES "public"."production_orders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "quality_inspections_number_uidx" ON "quality_inspections" USING btree ("number");--> statement-breakpoint
CREATE TABLE "ncrs" (
	"id" text PRIMARY KEY NOT NULL,
	"number" text NOT NULL,
	"production_order_id" text NOT NULL,
	"inspection_id" text,
	"status" "ncr_status" DEFAULT 'abierta' NOT NULL,
	"cause" text,
	"disposition" text,
	"notes" text,
	"created_by" text,
	"updated_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "ncrs" ADD CONSTRAINT "ncrs_production_order_id_production_orders_id_fk" FOREIGN KEY ("production_order_id") REFERENCES "public"."production_orders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ncrs_number_uidx" ON "ncrs" USING btree ("number");--> statement-breakpoint
ALTER TYPE "public"."activity_entity_type" ADD VALUE 'quality_inspection';--> statement-breakpoint
ALTER TYPE "public"."activity_entity_type" ADD VALUE 'ncr';--> statement-breakpoint
ALTER TYPE "public"."document_entity_type" ADD VALUE 'quality_inspection';--> statement-breakpoint
ALTER TYPE "public"."document_entity_type" ADD VALUE 'ncr';
