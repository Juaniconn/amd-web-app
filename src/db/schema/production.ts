import { relations, sql } from "drizzle-orm";
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
import { customers } from "./crm";
import { engineeringRequests } from "./engineering";
import { orderItems, orders, quotes } from "./quotes";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
};

export const productionOrderStatusEnum = pgEnum("production_order_status", [
  "pendiente",
  "liberada",
  "programada",
  "en_produccion",
  "pausada",
  "esperando_material",
  "calidad",
  "terminada",
  "entregada",
  "cancelada",
]);

export const productionPriorityEnum = pgEnum("production_priority", [
  "urgente",
  "compromiso_inmediato",
  "programada",
  "produccion_normal",
]);

export const machineStatusEnum = pgEnum("machine_status", [
  "disponible",
  "en_produccion",
  "ocupada",
  "mantenimiento",
  "fuera_de_servicio",
]);

export const productionRouteStepKindEnum = pgEnum("production_route_step_kind", [
  "ingenieria",
  "produccion",
  "calidad",
  "entrega",
]);

export const productionOperationStatusEnum = pgEnum(
  "production_operation_status",
  ["pendiente", "en_proceso", "terminada", "omitida"],
);

export const workCenters = pgTable(
  "work_centers",
  {
    id: text("id").primaryKey(),
    code: text("code").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    sortOrder: integer("sort_order").notNull().default(0),
    active: boolean("active").notNull().default(true),
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
    uniqueIndex("work_centers_code_uidx").on(table.code),
    index("work_centers_active_idx").on(table.active),
  ],
);

export const machines = pgTable(
  "machines",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    brand: text("brand"),
    model: text("model"),
    year: integer("year"),
    workCenterId: text("work_center_id")
      .notNull()
      .references(() => workCenters.id, { onDelete: "restrict" }),
    responsibleUserId: text("responsible_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    hoursPerShift: numeric("hours_per_shift", { precision: 6, scale: 2 })
      .notNull()
      .default("8"),
    capacity: text("capacity"),
    notes: text("notes"),
    status: machineStatusEnum("status").notNull().default("disponible"),
    active: boolean("active").notNull().default(true),
    commissionedAt: timestamp("commissioned_at", { withTimezone: true }),
    decommissionedAt: timestamp("decommissioned_at", { withTimezone: true }),
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
    index("machines_work_center_id_idx").on(table.workCenterId),
    index("machines_active_idx").on(table.active),
    index("machines_status_idx").on(table.status),
  ],
);

export const productionRoutes = pgTable(
  "production_routes",
  {
    id: text("id").primaryKey(),
    code: text("code").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    active: boolean("active").notNull().default(true),
    isOfficialSeed: boolean("is_official_seed").notNull().default(false),
    createdBy: text("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
    updatedBy: text("updated_by").references(() => users.id, {
      onDelete: "set null",
    }),
    ...timestamps,
  },
  (table) => [uniqueIndex("production_routes_code_uidx").on(table.code)],
);

export const productionRouteSteps = pgTable(
  "production_route_steps",
  {
    id: text("id").primaryKey(),
    routeId: text("route_id")
      .notNull()
      .references(() => productionRoutes.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    kind: productionRouteStepKindEnum("kind").notNull().default("produccion"),
    workCenterId: text("work_center_id").references(() => workCenters.id, {
      onDelete: "set null",
    }),
    name: text("name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("production_route_steps_route_position_uidx").on(
      table.routeId,
      table.position,
    ),
    index("production_route_steps_route_id_idx").on(table.routeId),
  ],
);

export const downtimeReasons = pgTable(
  "downtime_reasons",
  {
    id: text("id").primaryKey(),
    code: text("code").notNull(),
    name: text("name").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    active: boolean("active").notNull().default(true),
    isOfficialSeed: boolean("is_official_seed").notNull().default(false),
    ...timestamps,
  },
  (table) => [uniqueIndex("downtime_reasons_code_uidx").on(table.code)],
);

export const productionOrders = pgTable(
  "production_orders",
  {
    id: text("id").primaryKey(),
    number: text("number").notNull(),
    orderId: text("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "restrict" }),
    orderItemId: text("order_item_id").references(() => orderItems.id, {
      onDelete: "set null",
    }),
    customerId: text("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "restrict" }),
    quoteId: text("quote_id")
      .notNull()
      .references(() => quotes.id, { onDelete: "restrict" }),
    engineeringRequestId: text("engineering_request_id").references(
      () => engineeringRequests.id,
      { onDelete: "set null" },
    ),
    origin: text("origin").notNull(),
    routeId: text("route_id").references(() => productionRoutes.id, {
      onDelete: "set null",
    }),
    description: text("description").notNull(),
    partNumber: text("part_number"),
    quantity: numeric("quantity", { precision: 12, scale: 4 }).notNull(),
    unit: text("unit").notNull().default("pza"),
    promisedDate: timestamp("promised_date", { withTimezone: true }).notNull(),
    priority: productionPriorityEnum("priority")
      .notNull()
      .default("produccion_normal"),
    status: productionOrderStatusEnum("status").notNull().default("pendiente"),
    notes: text("notes"),
    workCenterId: text("work_center_id").references(() => workCenters.id, {
      onDelete: "set null",
    }),
    machineId: text("machine_id").references(() => machines.id, {
      onDelete: "set null",
    }),
    operatorUserId: text("operator_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    pauseReasonId: text("pause_reason_id").references(() => downtimeReasons.id, {
      onDelete: "set null",
    }),
    releasedAt: timestamp("released_at", { withTimezone: true }),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
    startedAt: timestamp("started_at", { withTimezone: true }),
    pausedAt: timestamp("paused_at", { withTimezone: true }),
    qualityAt: timestamp("quality_at", { withTimezone: true }),
    physicallyClosedAt: timestamp("physically_closed_at", {
      withTimezone: true,
    }),
    physicallyClosedBy: text("physically_closed_by").references(
      () => users.id,
      { onDelete: "set null" },
    ),
    administrativelyClosedAt: timestamp("administratively_closed_at", {
      withTimezone: true,
    }),
    administrativelyClosedBy: text("administratively_closed_by").references(
      () => users.id,
      { onDelete: "set null" },
    ),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
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
    uniqueIndex("production_orders_number_uidx").on(table.number),
    index("production_orders_order_id_idx").on(table.orderId),
    index("production_orders_customer_id_idx").on(table.customerId),
    index("production_orders_status_idx").on(table.status),
    index("production_orders_priority_idx").on(table.priority),
    index("production_orders_promised_date_idx").on(table.promisedDate),
    index("production_orders_work_center_id_idx").on(table.workCenterId),
    index("production_orders_machine_id_idx").on(table.machineId),
    index("production_orders_origin_idx").on(table.origin),
  ],
);

export const productionOperations = pgTable(
  "production_operations",
  {
    id: text("id").primaryKey(),
    productionOrderId: text("production_order_id")
      .notNull()
      .references(() => productionOrders.id, { onDelete: "cascade" }),
    routeStepId: text("route_step_id").references(
      () => productionRouteSteps.id,
      { onDelete: "set null" },
    ),
    position: integer("position").notNull(),
    kind: productionRouteStepKindEnum("kind").notNull().default("produccion"),
    workCenterId: text("work_center_id").references(() => workCenters.id, {
      onDelete: "set null",
    }),
    name: text("name").notNull(),
    status: productionOperationStatusEnum("status")
      .notNull()
      .default("pendiente"),
    machineId: text("machine_id").references(() => machines.id, {
      onDelete: "set null",
    }),
    operatorUserId: text("operator_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    startedAt: timestamp("started_at", { withTimezone: true }),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("production_operations_order_position_uidx").on(
      table.productionOrderId,
      table.position,
    ),
    index("production_operations_order_idx").on(table.productionOrderId),
    index("production_operations_work_center_idx").on(table.workCenterId),
  ],
);

export const machineHours = pgTable(
  "machine_hours",
  {
    id: text("id").primaryKey(),
    productionOrderId: text("production_order_id")
      .notNull()
      .references(() => productionOrders.id, { onDelete: "cascade" }),
    operationId: text("operation_id").references(
      () => productionOperations.id,
      { onDelete: "set null" },
    ),
    machineId: text("machine_id")
      .notNull()
      .references(() => machines.id, { onDelete: "restrict" }),
    operatorUserId: text("operator_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    durationMinutes: integer("duration_minutes"),
    notes: text("notes"),
    createdBy: text("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("machine_hours_order_idx").on(table.productionOrderId),
    index("machine_hours_machine_idx").on(table.machineId),
    uniqueIndex("machine_hours_open_machine_uidx")
      .on(table.machineId)
      .where(sql`${table.endedAt} is null`),
  ],
);

export const laborHours = pgTable(
  "labor_hours",
  {
    id: text("id").primaryKey(),
    productionOrderId: text("production_order_id")
      .notNull()
      .references(() => productionOrders.id, { onDelete: "cascade" }),
    operationId: text("operation_id").references(
      () => productionOperations.id,
      { onDelete: "set null" },
    ),
    operatorUserId: text("operator_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    durationMinutes: integer("duration_minutes"),
    notes: text("notes"),
    createdBy: text("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("labor_hours_order_idx").on(table.productionOrderId),
    index("labor_hours_operator_idx").on(table.operatorUserId),
    uniqueIndex("labor_hours_open_operator_uidx")
      .on(table.operatorUserId)
      .where(sql`${table.endedAt} is null`),
  ],
);

export const productionDowntime = pgTable(
  "production_downtime",
  {
    id: text("id").primaryKey(),
    productionOrderId: text("production_order_id")
      .notNull()
      .references(() => productionOrders.id, { onDelete: "cascade" }),
    machineId: text("machine_id").references(() => machines.id, {
      onDelete: "set null",
    }),
    reasonId: text("reason_id")
      .notNull()
      .references(() => downtimeReasons.id, { onDelete: "restrict" }),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    durationMinutes: integer("duration_minutes"),
    notes: text("notes"),
    createdBy: text("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("production_downtime_order_idx").on(table.productionOrderId),
    index("production_downtime_reason_idx").on(table.reasonId),
  ],
);

export const productionRework = pgTable(
  "production_rework",
  {
    id: text("id").primaryKey(),
    productionOrderId: text("production_order_id")
      .notNull()
      .references(() => productionOrders.id, { onDelete: "cascade" }),
    partNumber: text("part_number"),
    quantity: numeric("quantity", { precision: 12, scale: 4 }).notNull(),
    scrapQuantity: numeric("scrap_quantity", { precision: 12, scale: 4 })
      .notNull()
      .default("0"),
    rootCause: text("root_cause").notNull(),
    laborHours: numeric("labor_hours", { precision: 8, scale: 2 })
      .notNull()
      .default("0"),
    machineHours: numeric("machine_hours", { precision: 8, scale: 2 })
      .notNull()
      .default("0"),
    qualityReleased: boolean("quality_released").notNull().default(false),
    qualityReleasedAt: timestamp("quality_released_at", {
      withTimezone: true,
    }),
    qualityReleasedBy: text("quality_released_by").references(() => users.id, {
      onDelete: "set null",
    }),
    notes: text("notes"),
    createdBy: text("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("production_rework_order_idx").on(table.productionOrderId)],
);

export const workCentersRelations = relations(workCenters, ({ many }) => ({
  machines: many(machines),
}));

export const machinesRelations = relations(machines, ({ one, many }) => ({
  workCenter: one(workCenters, {
    fields: [machines.workCenterId],
    references: [workCenters.id],
  }),
  responsible: one(users, {
    fields: [machines.responsibleUserId],
    references: [users.id],
  }),
  productionOrders: many(productionOrders),
}));

export const productionRoutesRelations = relations(
  productionRoutes,
  ({ many }) => ({
    steps: many(productionRouteSteps),
  }),
);

export const productionRouteStepsRelations = relations(
  productionRouteSteps,
  ({ one }) => ({
    route: one(productionRoutes, {
      fields: [productionRouteSteps.routeId],
      references: [productionRoutes.id],
    }),
    workCenter: one(workCenters, {
      fields: [productionRouteSteps.workCenterId],
      references: [workCenters.id],
    }),
  }),
);

export const productionOrdersRelations = relations(
  productionOrders,
  ({ one, many }) => ({
    order: one(orders, {
      fields: [productionOrders.orderId],
      references: [orders.id],
    }),
    customer: one(customers, {
      fields: [productionOrders.customerId],
      references: [customers.id],
    }),
    quote: one(quotes, {
      fields: [productionOrders.quoteId],
      references: [quotes.id],
    }),
    route: one(productionRoutes, {
      fields: [productionOrders.routeId],
      references: [productionRoutes.id],
    }),
    workCenter: one(workCenters, {
      fields: [productionOrders.workCenterId],
      references: [workCenters.id],
    }),
    machine: one(machines, {
      fields: [productionOrders.machineId],
      references: [machines.id],
    }),
    operator: one(users, {
      fields: [productionOrders.operatorUserId],
      references: [users.id],
    }),
    operations: many(productionOperations),
  }),
);

export const productionOperationsRelations = relations(
  productionOperations,
  ({ one }) => ({
    productionOrder: one(productionOrders, {
      fields: [productionOperations.productionOrderId],
      references: [productionOrders.id],
    }),
    workCenter: one(workCenters, {
      fields: [productionOperations.workCenterId],
      references: [workCenters.id],
    }),
  }),
);
