ALTER TYPE "public"."activity_action" ADD VALUE 'stock_moved';--> statement-breakpoint
ALTER TYPE "public"."activity_entity_type" ADD VALUE 'material';--> statement-breakpoint
ALTER TYPE "public"."activity_entity_type" ADD VALUE 'inventory_movement';--> statement-breakpoint
ALTER TYPE "public"."activity_entity_type" ADD VALUE 'warehouse';--> statement-breakpoint
CREATE TYPE "public"."material_category" AS ENUM('materia_prima', 'consumibles', 'herramientas', 'producto_terminado');--> statement-breakpoint
CREATE TYPE "public"."inventory_movement_type" AS ENUM('entrada', 'salida', 'ajuste', 'reserva', 'liberacion', 'consumo');--> statement-breakpoint
CREATE TABLE "warehouses" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"is_official_seed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "units_of_measure" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"integer_only" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"is_official_seed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "materials" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"description" text NOT NULL,
	"category" "material_category" NOT NULL,
	"unit_id" text NOT NULL,
	"warehouse_id" text NOT NULL,
	"is_critical" boolean DEFAULT false NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"min_stock" numeric(14, 4),
	"notes" text,
	"is_demo" boolean DEFAULT false NOT NULL,
	"created_by" text,
	"updated_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory_balances" (
	"id" text PRIMARY KEY NOT NULL,
	"material_id" text NOT NULL,
	"warehouse_id" text NOT NULL,
	"on_hand" numeric(14, 4) DEFAULT '0' NOT NULL,
	"reserved" numeric(14, 4) DEFAULT '0' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "inventory_balances_on_hand_nonneg" CHECK ("on_hand" >= 0),
	CONSTRAINT "inventory_balances_reserved_nonneg" CHECK ("reserved" >= 0),
	CONSTRAINT "inventory_balances_reserved_lte_on_hand" CHECK ("reserved" <= "on_hand")
);
--> statement-breakpoint
CREATE TABLE "production_order_materials" (
	"id" text PRIMARY KEY NOT NULL,
	"production_order_id" text NOT NULL,
	"material_id" text NOT NULL,
	"warehouse_id" text NOT NULL,
	"required_qty" numeric(14, 4) NOT NULL,
	"reserved_qty" numeric(14, 4) DEFAULT '0' NOT NULL,
	"consumed_qty" numeric(14, 4) DEFAULT '0' NOT NULL,
	"created_by" text,
	"updated_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory_movements" (
	"id" text PRIMARY KEY NOT NULL,
	"material_id" text NOT NULL,
	"warehouse_id" text NOT NULL,
	"type" "inventory_movement_type" NOT NULL,
	"quantity" numeric(14, 4) NOT NULL,
	"on_hand_delta" numeric(14, 4) DEFAULT '0' NOT NULL,
	"reserved_delta" numeric(14, 4) DEFAULT '0' NOT NULL,
	"reason" text,
	"production_order_id" text,
	"production_order_material_id" text,
	"is_demo" boolean DEFAULT false NOT NULL,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "inventory_movements_quantity_positive" CHECK ("quantity" > 0)
);
--> statement-breakpoint
ALTER TABLE "materials" ADD CONSTRAINT "materials_unit_id_units_of_measure_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."units_of_measure"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "materials" ADD CONSTRAINT "materials_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "materials" ADD CONSTRAINT "materials_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "materials" ADD CONSTRAINT "materials_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_balances" ADD CONSTRAINT "inventory_balances_material_id_materials_id_fk" FOREIGN KEY ("material_id") REFERENCES "public"."materials"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_balances" ADD CONSTRAINT "inventory_balances_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_order_materials" ADD CONSTRAINT "production_order_materials_production_order_id_production_orders_id_fk" FOREIGN KEY ("production_order_id") REFERENCES "public"."production_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_order_materials" ADD CONSTRAINT "production_order_materials_material_id_materials_id_fk" FOREIGN KEY ("material_id") REFERENCES "public"."materials"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_order_materials" ADD CONSTRAINT "production_order_materials_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_order_materials" ADD CONSTRAINT "production_order_materials_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_order_materials" ADD CONSTRAINT "production_order_materials_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_material_id_materials_id_fk" FOREIGN KEY ("material_id") REFERENCES "public"."materials"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_production_order_id_production_orders_id_fk" FOREIGN KEY ("production_order_id") REFERENCES "public"."production_orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_production_order_material_id_production_order_materials_id_fk" FOREIGN KEY ("production_order_material_id") REFERENCES "public"."production_order_materials"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "warehouses_code_uidx" ON "warehouses" USING btree ("code");--> statement-breakpoint
CREATE INDEX "warehouses_active_idx" ON "warehouses" USING btree ("active");--> statement-breakpoint
CREATE UNIQUE INDEX "units_of_measure_code_uidx" ON "units_of_measure" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "materials_code_uidx" ON "materials" USING btree ("code");--> statement-breakpoint
CREATE INDEX "materials_category_idx" ON "materials" USING btree ("category");--> statement-breakpoint
CREATE INDEX "materials_active_idx" ON "materials" USING btree ("active");--> statement-breakpoint
CREATE INDEX "materials_critical_idx" ON "materials" USING btree ("is_critical");--> statement-breakpoint
CREATE INDEX "materials_warehouse_id_idx" ON "materials" USING btree ("warehouse_id");--> statement-breakpoint
CREATE UNIQUE INDEX "inventory_balances_material_warehouse_uidx" ON "inventory_balances" USING btree ("material_id","warehouse_id");--> statement-breakpoint
CREATE INDEX "inventory_balances_warehouse_idx" ON "inventory_balances" USING btree ("warehouse_id");--> statement-breakpoint
CREATE UNIQUE INDEX "production_order_materials_ot_material_uidx" ON "production_order_materials" USING btree ("production_order_id","material_id");--> statement-breakpoint
CREATE INDEX "production_order_materials_ot_idx" ON "production_order_materials" USING btree ("production_order_id");--> statement-breakpoint
CREATE INDEX "production_order_materials_material_idx" ON "production_order_materials" USING btree ("material_id");--> statement-breakpoint
CREATE INDEX "inventory_movements_material_idx" ON "inventory_movements" USING btree ("material_id");--> statement-breakpoint
CREATE INDEX "inventory_movements_warehouse_idx" ON "inventory_movements" USING btree ("warehouse_id");--> statement-breakpoint
CREATE INDEX "inventory_movements_type_idx" ON "inventory_movements" USING btree ("type");--> statement-breakpoint
CREATE INDEX "inventory_movements_created_at_idx" ON "inventory_movements" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "inventory_movements_ot_idx" ON "inventory_movements" USING btree ("production_order_id");
