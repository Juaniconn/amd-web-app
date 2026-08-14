import { relations, sql } from "drizzle-orm";
import {
  index,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  boolean,
} from "drizzle-orm/pg-core";
import { users } from "./auth";
import { customers } from "./crm";
import { quotes } from "./quotes";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
};

export const engineeringRequestStatusEnum = pgEnum("engineering_request_status", [
  "pendiente",
  "asignado",
  "disenando",
  "revision_interna",
  "esperando_cliente",
  "correcciones",
  "aprobado",
  "liberado",
  "cancelado",
]);

export const engineeringPriorityEnum = pgEnum("engineering_priority", [
  "baja",
  "media",
  "alta",
]);

export const engineeringRequests = pgTable(
  "engineering_requests",
  {
    id: text("id").primaryKey(),
    number: text("number").notNull(),
    customerId: text("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "restrict" }),
    quoteId: text("quote_id")
      .notNull()
      .references(() => quotes.id, { onDelete: "restrict" }),
    assigneeUserId: text("assignee_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    description: text("description").notNull(),
    notes: text("notes"),
    projectType: text("project_type").notNull(),
    priority: engineeringPriorityEnum("priority").notNull().default("media"),
    dueDate: timestamp("due_date", { withTimezone: true }),
    status: engineeringRequestStatusEnum("status").notNull().default("pendiente"),
    hoursLogged: numeric("hours_logged", { precision: 10, scale: 2 })
      .notNull()
      .default("0"),
    assignedAt: timestamp("assigned_at", { withTimezone: true }),
    designStartedAt: timestamp("design_started_at", { withTimezone: true }),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    releasedAt: timestamp("released_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    releasedBy: text("released_by").references(() => users.id, {
      onDelete: "set null",
    }),
    isDemo: boolean("is_demo").default(false).notNull(),
    createdBy: text("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
    updatedBy: text("updated_by").references(() => users.id, {
      onDelete: "set null",
    }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("engineering_requests_number_uidx").on(table.number),
    uniqueIndex("engineering_requests_quote_active_uidx")
      .on(table.quoteId)
      .where(sql`${table.deletedAt} is null`),
    index("engineering_requests_customer_id_idx").on(table.customerId),
    index("engineering_requests_status_idx").on(table.status),
    index("engineering_requests_assignee_idx").on(table.assigneeUserId),
    index("engineering_requests_due_date_idx").on(table.dueDate),
    index("engineering_requests_deleted_at_idx").on(table.deletedAt),
  ],
);

export const engineeringHours = pgTable(
  "engineering_hours",
  {
    id: text("id").primaryKey(),
    engineeringRequestId: text("engineering_request_id")
      .notNull()
      .references(() => engineeringRequests.id, { onDelete: "cascade" }),
    userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
    hours: numeric("hours", { precision: 8, scale: 2 }).notNull(),
    note: text("note"),
    workedOn: timestamp("worked_on", { withTimezone: true }).notNull(),
    createdBy: text("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("engineering_hours_request_idx").on(table.engineeringRequestId),
    index("engineering_hours_user_idx").on(table.userId),
  ],
);

export const engineeringRequestsRelations = relations(
  engineeringRequests,
  ({ one, many }) => ({
    customer: one(customers, {
      fields: [engineeringRequests.customerId],
      references: [customers.id],
    }),
    quote: one(quotes, {
      fields: [engineeringRequests.quoteId],
      references: [quotes.id],
    }),
    assignee: one(users, {
      fields: [engineeringRequests.assigneeUserId],
      references: [users.id],
    }),
    hours: many(engineeringHours),
  }),
);

export const engineeringHoursRelations = relations(engineeringHours, ({ one }) => ({
  request: one(engineeringRequests, {
    fields: [engineeringHours.engineeringRequestId],
    references: [engineeringRequests.id],
  }),
}));
