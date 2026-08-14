import { relations, sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { users } from "./auth";
import { productionOrders } from "./production";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
};

export const materialCategoryEnum = pgEnum("material_category", [
  "materia_prima",
  "consumibles",
  "herramientas",
  "producto_terminado",
]);

export const inventoryMovementTypeEnum = pgEnum("inventory_movement_type", [
  "entrada",
  "salida",
  "ajuste",
  "reserva",
  "liberacion",
  "consumo",
]);

export const warehouses = pgTable(
  "warehouses",
  {
    id: text("id").primaryKey(),
    code: text("code").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    sortOrder: integer("sort_order").notNull().default(0),
    active: boolean("active").notNull().default(true),
    isOfficialSeed: boolean("is_official_seed").notNull().default(false),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("warehouses_code_uidx").on(table.code),
    index("warehouses_active_idx").on(table.active),
  ],
);

export const unitsOfMeasure = pgTable(
  "units_of_measure",
  {
    id: text("id").primaryKey(),
    code: text("code").notNull(),
    name: text("name").notNull(),
    integerOnly: boolean("integer_only").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    active: boolean("active").notNull().default(true),
    isOfficialSeed: boolean("is_official_seed").notNull().default(false),
    ...timestamps,
  },
  (table) => [uniqueIndex("units_of_measure_code_uidx").on(table.code)],
);

export const materials = pgTable(
  "materials",
  {
    id: text("id").primaryKey(),
    code: text("code").notNull(),
    description: text("description").notNull(),
    category: materialCategoryEnum("category").notNull(),
    unitId: text("unit_id")
      .notNull()
      .references(() => unitsOfMeasure.id, { onDelete: "restrict" }),
    warehouseId: text("warehouse_id")
      .notNull()
      .references(() => warehouses.id, { onDelete: "restrict" }),
    isCritical: boolean("is_critical").notNull().default(false),
    active: boolean("active").notNull().default(true),
    minStock: numeric("min_stock", { precision: 14, scale: 4 }),
    notes: text("notes"),
    isDemo: boolean("is_demo").notNull().default(false),
    createdBy: text("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
    updatedBy: text("updated_by").references(() => users.id, {
      onDelete: "set null",
    }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("materials_code_uidx").on(table.code),
    index("materials_category_idx").on(table.category),
    index("materials_active_idx").on(table.active),
    index("materials_critical_idx").on(table.isCritical),
    index("materials_warehouse_id_idx").on(table.warehouseId),
  ],
);

export const inventoryBalances = pgTable(
  "inventory_balances",
  {
    id: text("id").primaryKey(),
    materialId: text("material_id")
      .notNull()
      .references(() => materials.id, { onDelete: "restrict" }),
    warehouseId: text("warehouse_id")
      .notNull()
      .references(() => warehouses.id, { onDelete: "restrict" }),
    onHand: numeric("on_hand", { precision: 14, scale: 4 }).notNull().default("0"),
    reserved: numeric("reserved", { precision: 14, scale: 4 })
      .notNull()
      .default("0"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("inventory_balances_material_warehouse_uidx").on(
      table.materialId,
      table.warehouseId,
    ),
    index("inventory_balances_warehouse_idx").on(table.warehouseId),
    check("inventory_balances_on_hand_nonneg", sql`${table.onHand} >= 0`),
    check("inventory_balances_reserved_nonneg", sql`${table.reserved} >= 0`),
    check(
      "inventory_balances_reserved_lte_on_hand",
      sql`${table.reserved} <= ${table.onHand}`,
    ),
  ],
);

export const productionOrderMaterials = pgTable(
  "production_order_materials",
  {
    id: text("id").primaryKey(),
    productionOrderId: text("production_order_id")
      .notNull()
      .references(() => productionOrders.id, { onDelete: "cascade" }),
    materialId: text("material_id")
      .notNull()
      .references(() => materials.id, { onDelete: "restrict" }),
    warehouseId: text("warehouse_id")
      .notNull()
      .references(() => warehouses.id, { onDelete: "restrict" }),
    requiredQty: numeric("required_qty", { precision: 14, scale: 4 }).notNull(),
    reservedQty: numeric("reserved_qty", { precision: 14, scale: 4 })
      .notNull()
      .default("0"),
    consumedQty: numeric("consumed_qty", { precision: 14, scale: 4 })
      .notNull()
      .default("0"),
    createdBy: text("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
    updatedBy: text("updated_by").references(() => users.id, {
      onDelete: "set null",
    }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("production_order_materials_ot_material_uidx").on(
      table.productionOrderId,
      table.materialId,
    ),
    index("production_order_materials_ot_idx").on(table.productionOrderId),
    index("production_order_materials_material_idx").on(table.materialId),
  ],
);

export const inventoryMovements = pgTable(
  "inventory_movements",
  {
    id: text("id").primaryKey(),
    materialId: text("material_id")
      .notNull()
      .references(() => materials.id, { onDelete: "restrict" }),
    warehouseId: text("warehouse_id")
      .notNull()
      .references(() => warehouses.id, { onDelete: "restrict" }),
    type: inventoryMovementTypeEnum("type").notNull(),
    quantity: numeric("quantity", { precision: 14, scale: 4 }).notNull(),
    onHandDelta: numeric("on_hand_delta", { precision: 14, scale: 4 })
      .notNull()
      .default("0"),
    reservedDelta: numeric("reserved_delta", { precision: 14, scale: 4 })
      .notNull()
      .default("0"),
    reason: text("reason"),
    productionOrderId: text("production_order_id").references(
      () => productionOrders.id,
      { onDelete: "set null" },
    ),
    productionOrderMaterialId: text("production_order_material_id").references(
      () => productionOrderMaterials.id,
      { onDelete: "set null" },
    ),
    isDemo: boolean("is_demo").notNull().default(false),
    createdBy: text("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("inventory_movements_material_idx").on(table.materialId),
    index("inventory_movements_warehouse_idx").on(table.warehouseId),
    index("inventory_movements_type_idx").on(table.type),
    index("inventory_movements_created_at_idx").on(table.createdAt),
    index("inventory_movements_ot_idx").on(table.productionOrderId),
    check("inventory_movements_quantity_positive", sql`${table.quantity} > 0`),
  ],
);

export const warehousesRelations = relations(warehouses, ({ many }) => ({
  materials: many(materials),
  balances: many(inventoryBalances),
}));

export const unitsOfMeasureRelations = relations(unitsOfMeasure, ({ many }) => ({
  materials: many(materials),
}));

export const materialsRelations = relations(materials, ({ one, many }) => ({
  unit: one(unitsOfMeasure, {
    fields: [materials.unitId],
    references: [unitsOfMeasure.id],
  }),
  warehouse: one(warehouses, {
    fields: [materials.warehouseId],
    references: [warehouses.id],
  }),
  balances: many(inventoryBalances),
  movements: many(inventoryMovements),
}));

export const inventoryBalancesRelations = relations(
  inventoryBalances,
  ({ one }) => ({
    material: one(materials, {
      fields: [inventoryBalances.materialId],
      references: [materials.id],
    }),
    warehouse: one(warehouses, {
      fields: [inventoryBalances.warehouseId],
      references: [warehouses.id],
    }),
  }),
);

export const productionOrderMaterialsRelations = relations(
  productionOrderMaterials,
  ({ one }) => ({
    productionOrder: one(productionOrders, {
      fields: [productionOrderMaterials.productionOrderId],
      references: [productionOrders.id],
    }),
    material: one(materials, {
      fields: [productionOrderMaterials.materialId],
      references: [materials.id],
    }),
    warehouse: one(warehouses, {
      fields: [productionOrderMaterials.warehouseId],
      references: [warehouses.id],
    }),
  }),
);

export const inventoryMovementsRelations = relations(
  inventoryMovements,
  ({ one }) => ({
    material: one(materials, {
      fields: [inventoryMovements.materialId],
      references: [materials.id],
    }),
    warehouse: one(warehouses, {
      fields: [inventoryMovements.warehouseId],
      references: [warehouses.id],
    }),
    productionOrder: one(productionOrders, {
      fields: [inventoryMovements.productionOrderId],
      references: [productionOrders.id],
    }),
  }),
);
