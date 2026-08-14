import { index, jsonb, pgEnum, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { users } from "./auth";

export const activityActionEnum = pgEnum("activity_action", [
  "created",
  "updated",
  "deleted",
  "primary_contact_changed",
  "status_changed",
  "sent",
  "converted",
  "expired",
  "assigned",
  "approved",
  "released",
  "cancelled",
  "hours_logged",
]);

export const activityEntityTypeEnum = pgEnum("activity_entity_type", [
  "customer",
  "contact",
  "quote",
  "quote_item",
  "document",
  "order",
  "engineering_request",
  "engineering_hours",
]);

export const activityLogs = pgTable(
  "activity_logs",
  {
    id: text("id").primaryKey(),
    actorUserId: text("actor_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    action: activityActionEnum("action").notNull(),
    entityType: activityEntityTypeEnum("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    parentEntityType: activityEntityTypeEnum("parent_entity_type"),
    parentEntityId: text("parent_entity_id"),
    previousValue: jsonb("previous_value").$type<Record<string, unknown> | null>(),
    newValue: jsonb("new_value").$type<Record<string, unknown> | null>(),
    summary: text("summary").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("activity_logs_entity_idx").on(table.entityType, table.entityId),
    index("activity_logs_parent_idx").on(
      table.parentEntityType,
      table.parentEntityId,
      table.createdAt,
    ),
    index("activity_logs_created_at_idx").on(table.createdAt),
  ],
);
