import { relations, sql } from "drizzle-orm";
import {
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  jsonb,
  numeric,
} from "drizzle-orm/pg-core";
import { users } from "./auth";

export const skydropxShipmentStatusEnum = pgEnum("skydropx_shipment_status", [
  "pending",
  "quoted",
  "created",
  "in_transit",
  "delivered",
  "cancelled",
  "exception",
]);

export const skydropxShipments = pgTable(
  "skydropx_shipments",
  {
    id: text("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    skydropxId: text("skydropx_id"),
    trackingNumber: text("tracking_number"),
    carrierName: text("carrier_name"),
    carrierService: text("carrier_service"),
    status: skydropxShipmentStatusEnum("status").default("pending").notNull(),
    originAddress: jsonb("origin_address"),
    destinationAddress: jsonb("destination_address"),
    packages: jsonb("packages"),
    totalAmount: numeric("total_amount", { precision: 14, scale: 2 }),
    currency: text("currency").default("MXN"),
    labelUrl: text("label_url"),
    trackingEvents: jsonb("tracking_events"),
    quotationId: text("quotation_id"),
    rateId: text("rate_id"),
    notes: text("notes"),
    createdBy: text("created_by"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("skydropx_shipments_tracking_idx").on(table.trackingNumber),
    index("skydropx_shipments_status_idx").on(table.status),
    index("skydropx_shipments_created_at_idx").on(table.createdAt.desc()),
  ],
);

export const skydropxShipmentsRelations = relations(skydropxShipments, ({ one }) => ({
  createdByUser: one(users, {
    fields: [skydropxShipments.createdBy],
    references: [users.id],
  }),
}));

export type SkydropxShipment = typeof skydropxShipments.$inferSelect;
export type NewSkydropxShipment = typeof skydropxShipments.$inferInsert;
