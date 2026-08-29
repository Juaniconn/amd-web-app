import { relations, sql } from "drizzle-orm";
import {
  boolean,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { users } from "./auth";

export const notificationTypeEnum = pgEnum("notification_type", [
  "ot_status_changed",
  "part_assigned",
  "material_missing",
  "inspection_pending",
  "ot_created",
  "part_completed",
]);

export const notificationSeverityEnum = pgEnum("notification_severity", [
  "info",
  "warning",
  "success",
  "error",
]);

export const notifications = pgTable(
  "notifications",
  {
    id: text("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: text("user_id").notNull(),
    type: notificationTypeEnum("type").notNull(),
    severity: notificationSeverityEnum("severity").default("info").notNull(),
    title: text("title").notNull(),
    message: text("message").notNull(),
    entityType: text("entity_type"),
    entityId: text("entity_id"),
    isRead: boolean("is_read").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("notifications_user_id_idx").on(table.userId),
    index("notifications_created_at_idx").on(table.createdAt.desc()),
    index("notifications_is_read_idx").on(table.isRead),
  ],
);

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));

export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;
