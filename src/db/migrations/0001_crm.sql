CREATE TYPE "public"."customer_type" AS ENUM('industrial', 'maquiladora', 'comercial', 'otro');
--> statement-breakpoint
CREATE TYPE "public"."customer_status" AS ENUM('activo', 'inactivo');
--> statement-breakpoint
CREATE TYPE "public"."activity_action" AS ENUM('created', 'updated', 'deleted', 'primary_contact_changed');
--> statement-breakpoint
CREATE TYPE "public"."activity_entity_type" AS ENUM('customer', 'contact');
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"legal_name" text NOT NULL,
	"trade_name" text,
	"rfc" text,
	"phone" text,
	"email" text,
	"address" text,
	"city" text,
	"state" text,
	"country" text DEFAULT 'México' NOT NULL,
	"type" "customer_type" NOT NULL,
	"status" "customer_status" DEFAULT 'activo' NOT NULL,
	"notes" text,
	"is_demo" boolean DEFAULT false NOT NULL,
	"created_by" text,
	"updated_by" text,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contacts" (
	"id" text PRIMARY KEY NOT NULL,
	"customer_id" text NOT NULL,
	"name" text NOT NULL,
	"title" text,
	"email" text,
	"phone" text,
	"whatsapp" text,
	"department" text,
	"is_primary" boolean DEFAULT false NOT NULL,
	"notes" text,
	"is_demo" boolean DEFAULT false NOT NULL,
	"created_by" text,
	"updated_by" text,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "activity_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"actor_user_id" text,
	"action" "activity_action" NOT NULL,
	"entity_type" "activity_entity_type" NOT NULL,
	"entity_id" text NOT NULL,
	"parent_entity_type" "activity_entity_type",
	"parent_entity_id" text,
	"previous_value" jsonb,
	"new_value" jsonb,
	"summary" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "customers_code_uidx" ON "customers" USING btree ("code");
--> statement-breakpoint
CREATE UNIQUE INDEX "customers_rfc_active_uidx" ON "customers" USING btree ("rfc") WHERE "customers"."rfc" is not null and "customers"."deleted_at" is null;
--> statement-breakpoint
CREATE INDEX "customers_legal_name_idx" ON "customers" USING btree ("legal_name");
--> statement-breakpoint
CREATE INDEX "customers_status_idx" ON "customers" USING btree ("status");
--> statement-breakpoint
CREATE INDEX "customers_type_idx" ON "customers" USING btree ("type");
--> statement-breakpoint
CREATE INDEX "customers_deleted_at_idx" ON "customers" USING btree ("deleted_at");
--> statement-breakpoint
CREATE INDEX "contacts_customer_id_idx" ON "contacts" USING btree ("customer_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "contacts_one_primary_uidx" ON "contacts" USING btree ("customer_id") WHERE "contacts"."is_primary" = true and "contacts"."deleted_at" is null;
--> statement-breakpoint
CREATE INDEX "contacts_deleted_at_idx" ON "contacts" USING btree ("deleted_at");
--> statement-breakpoint
CREATE INDEX "activity_logs_entity_idx" ON "activity_logs" USING btree ("entity_type","entity_id");
--> statement-breakpoint
CREATE INDEX "activity_logs_parent_idx" ON "activity_logs" USING btree ("parent_entity_type","parent_entity_id","created_at");
--> statement-breakpoint
CREATE INDEX "activity_logs_created_at_idx" ON "activity_logs" USING btree ("created_at");
