import { relations } from "drizzle-orm";
import {
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

export const inspectionTypeEnum = pgEnum("inspection_type", [
  "primera_pieza",
  "en_proceso",
  "final",
]);

export const inspectionResultEnum = pgEnum("inspection_result", [
  "pendiente",
  "aprobado",
  "aprobado_observaciones",
  "rechazado",
]);

export const ncrStatusEnum = pgEnum("ncr_status", [
  "abierta",
  "en_analisis",
  "retrabajo",
  "cerrada",
  "cancelada",
]);

export const qualityInspections = pgTable(
  "quality_inspections",
  {
    id: text("id").primaryKey(),
    number: text("number").notNull(),
    productionOrderId: text("production_order_id")
      .notNull()
      .references(() => productionOrders.id, { onDelete: "restrict" }),
    type: inspectionTypeEnum("type").notNull(),
    inspectorUserId: text("inspector_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    inspectedAt: timestamp("inspected_at", { withTimezone: true }).notNull(),
    partNumber: text("part_number"),
    qtyInspected: numeric("qty_inspected", { precision: 14, scale: 4 }).notNull(),
    qtyAccepted: numeric("qty_accepted", { precision: 14, scale: 4 }).notNull().default("0"),
    qtyRejected: numeric("qty_rejected", { precision: 14, scale: 4 }).notNull().default("0"),
    result: inspectionResultEnum("result").notNull(),
    notes: text("notes"),
    createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("quality_inspections_number_uidx").on(table.number),
    index("quality_inspections_ot_idx").on(table.productionOrderId),
  ],
);

export const ncrs = pgTable(
  "ncrs",
  {
    id: text("id").primaryKey(),
    number: text("number").notNull(),
    productionOrderId: text("production_order_id")
      .notNull()
      .references(() => productionOrders.id, { onDelete: "restrict" }),
    inspectionId: text("inspection_id").references(() => qualityInspections.id, {
      onDelete: "set null",
    }),
    status: ncrStatusEnum("status").notNull().default("abierta"),
    cause: text("cause"),
    disposition: text("disposition"),
    notes: text("notes"),
    createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
    updatedBy: text("updated_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("ncrs_number_uidx").on(table.number),
    index("ncrs_ot_idx").on(table.productionOrderId),
  ],
);

export const qualityInspectionsRelations = relations(qualityInspections, ({ one }) => ({
  productionOrder: one(productionOrders, {
    fields: [qualityInspections.productionOrderId],
    references: [productionOrders.id],
  }),
}));
