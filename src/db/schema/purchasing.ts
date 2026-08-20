import { relations } from "drizzle-orm";
import {
  boolean,
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
import { branches } from "./branches";
import { materials, warehouses } from "./inventory";
import { productionOrders } from "./production";
import { orders } from "./quotes";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
};

export const supplierStatusEnum = pgEnum("supplier_status", ["activo", "inactivo"]);
export const purchaseRequestStatusEnum = pgEnum("purchase_request_status", [
  "borrador",
  "solicitada",
  "convertida",
  "cancelada",
]);

export const purchaseOrderStatusEnum = pgEnum("purchase_order_status", [
  "borrador",
  "enviada",
  "confirmada",
  "parcial",
  "recibida",
  "cerrada",
  "cancelada",
]);

export const suppliers = pgTable(
  "suppliers",
  {
    id: text("id").primaryKey(),
    code: text("code").notNull(),
    legalName: text("legal_name").notNull(),
    rfc: text("rfc"),
    contactName: text("contact_name"),
    email: text("email"),
    phone: text("phone"),
    address: text("address"),
    city: text("city"),
    country: text("country").default("México").notNull(),
    paymentTerm: text("payment_term").default("net_30"),
    leadTime: text("lead_time"),
    notes: text("notes"),
    website: text("website"),
    materialAvailable: text("material_available"),
    classification: text("classification"),
    advantages: text("advantages"),
    disadvantages: text("disadvantages"),
    distanceNote: text("distance_note"),
    usedInCalculator: boolean("used_in_calculator").notNull().default(false),
    status: supplierStatusEnum("status").notNull().default("activo"),
    isDemo: boolean("is_demo").notNull().default(false),
    createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
    updatedBy: text("updated_by").references(() => users.id, { onDelete: "set null" }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("suppliers_code_uidx").on(table.code),
    index("suppliers_status_idx").on(table.status),
    index("suppliers_used_in_calculator_idx").on(table.usedInCalculator),
  ],
);

export const purchaseRequests = pgTable(
  "purchase_requests",
  {
    id: text("id").primaryKey(),
    number: text("number").notNull(),
    orderId: text("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    status: purchaseRequestStatusEnum("status").notNull().default("borrador"),
    notes: text("notes"),
    isDemo: boolean("is_demo").notNull().default(false),
    createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
    updatedBy: text("updated_by").references(() => users.id, { onDelete: "set null" }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("purchase_requests_number_uidx").on(table.number),
    index("purchase_requests_order_idx").on(table.orderId),
    index("purchase_requests_status_idx").on(table.status),
  ],
);

export const purchaseRequestItems = pgTable(
  "purchase_request_items",
  {
    id: text("id").primaryKey(),
    purchaseRequestId: text("purchase_request_id")
      .notNull()
      .references(() => purchaseRequests.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    materialId: text("material_id")
      .notNull()
      .references(() => materials.id, { onDelete: "restrict" }),
    quantity: numeric("quantity", { precision: 14, scale: 4 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("purchase_request_items_request_idx").on(table.purchaseRequestId)],
);

export const purchaseOrders = pgTable(
  "purchase_orders",
  {
    id: text("id").primaryKey(),
    number: text("number").notNull(),
    supplierId: text("supplier_id")
      .notNull()
      .references(() => suppliers.id, { onDelete: "restrict" }),
    branchId: text("branch_id").references(() => branches.id, { onDelete: "set null" }),
    orderId: text("order_id").references(() => orders.id, { onDelete: "set null" }),
    purchaseRequestId: text("purchase_request_id").references(
      () => purchaseRequests.id,
      { onDelete: "set null" },
    ),
    productionOrderId: text("production_order_id").references(
      () => productionOrders.id,
      { onDelete: "set null" },
    ),
    ownerUserId: text("owner_user_id").references(() => users.id, { onDelete: "set null" }),
    issueDate: timestamp("issue_date", { withTimezone: true }).notNull(),
    expectedDate: timestamp("expected_date", { withTimezone: true }),
    currency: text("currency").notNull().default("mxn"),
    paymentTerm: text("payment_term").default("net_30"),
    isUrgent: boolean("is_urgent").notNull().default(false),
    urgentReason: text("urgent_reason"),
    status: purchaseOrderStatusEnum("status").notNull().default("borrador"),
    notes: text("notes"),
    subtotal: numeric("subtotal", { precision: 14, scale: 2 }).notNull().default("0"),
    taxTotal: numeric("tax_total", { precision: 14, scale: 2 }).notNull().default("0"),
    total: numeric("total", { precision: 14, scale: 2 }).notNull().default("0"),
    isDemo: boolean("is_demo").notNull().default(false),
    createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
    updatedBy: text("updated_by").references(() => users.id, { onDelete: "set null" }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("purchase_orders_number_uidx").on(table.number),
    index("purchase_orders_status_idx").on(table.status),
    index("purchase_orders_supplier_idx").on(table.supplierId),
    index("purchase_orders_order_idx").on(table.orderId),
    index("purchase_orders_request_idx").on(table.purchaseRequestId),
  ],
);

export const purchaseOrderItems = pgTable(
  "purchase_order_items",
  {
    id: text("id").primaryKey(),
    purchaseOrderId: text("purchase_order_id")
      .notNull()
      .references(() => purchaseOrders.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    materialId: text("material_id")
      .notNull()
      .references(() => materials.id, { onDelete: "restrict" }),
    warehouseId: text("warehouse_id").references(() => warehouses.id, {
      onDelete: "set null",
    }),
    description: text("description").notNull(),
    quantity: numeric("quantity", { precision: 14, scale: 4 }).notNull(),
    receivedQty: numeric("received_qty", { precision: 14, scale: 4 })
      .notNull()
      .default("0"),
    unitPrice: numeric("unit_price", { precision: 14, scale: 4 }).notNull().default("0"),
    taxPercent: numeric("tax_percent", { precision: 5, scale: 2 }).notNull().default("16"),
    lineSubtotal: numeric("line_subtotal", { precision: 14, scale: 2 }).notNull().default("0"),
    lineTax: numeric("line_tax", { precision: 14, scale: 2 }).notNull().default("0"),
    lineTotal: numeric("line_total", { precision: 14, scale: 2 }).notNull().default("0"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("purchase_order_items_po_idx").on(table.purchaseOrderId)],
);

export const purchaseReceipts = pgTable(
  "purchase_receipts",
  {
    id: text("id").primaryKey(),
    number: text("number").notNull(),
    purchaseOrderId: text("purchase_order_id")
      .notNull()
      .references(() => purchaseOrders.id, { onDelete: "restrict" }),
    receivedAt: timestamp("received_at", { withTimezone: true }).notNull(),
    notes: text("notes"),
    createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex("purchase_receipts_number_uidx").on(table.number)],
);

export const purchaseReceiptItems = pgTable(
  "purchase_receipt_items",
  {
    id: text("id").primaryKey(),
    receiptId: text("receipt_id")
      .notNull()
      .references(() => purchaseReceipts.id, { onDelete: "cascade" }),
    purchaseOrderItemId: text("purchase_order_item_id")
      .notNull()
      .references(() => purchaseOrderItems.id, { onDelete: "restrict" }),
    quantity: numeric("quantity", { precision: 14, scale: 4 }).notNull(),
  },
);

export const supplierMaterials = pgTable(
  "supplier_materials",
  {
    id: text("id").primaryKey(),
    supplierId: text("supplier_id")
      .notNull()
      .references(() => suppliers.id, { onDelete: "cascade" }),
    position: integer("position").notNull().default(1),
    description: text("description").notNull(),
    grade: text("grade"),
    thicknessIn: numeric("thickness_in", { precision: 10, scale: 4 }),
    costPerKg: numeric("cost_per_kg", { precision: 14, scale: 4 }),
    sheetWidthIn: numeric("sheet_width_in", { precision: 10, scale: 4 }),
    sheetLengthIn: numeric("sheet_length_in", { precision: 10, scale: 4 }),
    densityGCm3: numeric("density_g_cm3", { precision: 10, scale: 4 }),
    unit: text("unit").notNull().default("kg"),
    notes: text("notes"),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("supplier_materials_supplier_idx").on(table.supplierId)],
);

export const suppliersRelations = relations(suppliers, ({ many }) => ({
  purchaseOrders: many(purchaseOrders),
  materials: many(supplierMaterials),
}));

export const purchaseRequestsRelations = relations(purchaseRequests, ({ one, many }) => ({
  order: one(orders, {
    fields: [purchaseRequests.orderId],
    references: [orders.id],
  }),
  items: many(purchaseRequestItems),
  purchaseOrders: many(purchaseOrders),
}));

export const purchaseRequestItemsRelations = relations(purchaseRequestItems, ({ one }) => ({
  request: one(purchaseRequests, {
    fields: [purchaseRequestItems.purchaseRequestId],
    references: [purchaseRequests.id],
  }),
  material: one(materials, {
    fields: [purchaseRequestItems.materialId],
    references: [materials.id],
  }),
}));

export const purchaseOrdersRelations = relations(purchaseOrders, ({ one, many }) => ({
  supplier: one(suppliers, {
    fields: [purchaseOrders.supplierId],
    references: [suppliers.id],
  }),
  order: one(orders, {
    fields: [purchaseOrders.orderId],
    references: [orders.id],
  }),
  purchaseRequest: one(purchaseRequests, {
    fields: [purchaseOrders.purchaseRequestId],
    references: [purchaseRequests.id],
  }),
  items: many(purchaseOrderItems),
}));
