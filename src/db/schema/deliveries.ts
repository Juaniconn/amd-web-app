import { relations } from "drizzle-orm";
import {
  index,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { users } from "./auth";
import { branches } from "./branches";
import { orders } from "./quotes";
import { productionOrders } from "./production";

export const deliveryStatusEnum = pgEnum("delivery_status", [
  "pendiente",
  "preparando",
  "enviado",
  "entregado",
  "incidencia",
]);

export const deliveries = pgTable(
  "deliveries",
  {
    id: text("id").primaryKey(),
    number: text("number").notNull(),
    orderId: text("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "restrict" }),
    productionOrderId: text("production_order_id").references(
      () => productionOrders.id,
      { onDelete: "set null" },
    ),
    branchId: text("branch_id").references(() => branches.id, { onDelete: "set null" }),
    status: deliveryStatusEnum("status").notNull().default("pendiente"),
    scheduledDate: timestamp("scheduled_date", { withTimezone: true }),
    shippedAt: timestamp("shipped_at", { withTimezone: true }),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
    carrier: text("carrier"),
    trackingNumber: text("tracking_number"),
    quantity: numeric("quantity", { precision: 14, scale: 4 }),
    shippingAddress: text("shipping_address"),
    shippingCity: text("shipping_city"),
    shippingState: text("shipping_state"),
    shippingCountry: text("shipping_country"),
    notes: text("notes"),
    createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
    updatedBy: text("updated_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("deliveries_number_uidx").on(table.number),
    index("deliveries_order_idx").on(table.orderId),
    index("deliveries_status_idx").on(table.status),
  ],
);

export const deliveriesRelations = relations(deliveries, ({ one }) => ({
  order: one(orders, { fields: [deliveries.orderId], references: [orders.id] }),
}));
