import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { users } from "./auth";
import { customers } from "./crm";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
};

export const projectStatusEnum = pgEnum("project_status", [
  "planeacion",
  "activo",
  "pausado",
  "completado",
  "cancelado",
]);

export const projects = pgTable(
  "projects",
  {
    id: text("id").primaryKey(),
    code: text("code").notNull(),
    name: text("name").notNull(),
    customerId: text("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "restrict" }),
    description: text("description"),
    ownerUserId: text("owner_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    status: projectStatusEnum("status").notNull().default("planeacion"),
    startDate: timestamp("start_date", { withTimezone: true }),
    estimatedEndDate: timestamp("estimated_end_date", { withTimezone: true }),
    notes: text("notes"),
    isDemo: boolean("is_demo").default(false).notNull(),
    createdBy: text("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
    updatedBy: text("updated_by").references(() => users.id, {
      onDelete: "set null",
    }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("projects_code_uidx").on(table.code),
    index("projects_customer_id_idx").on(table.customerId),
    index("projects_status_idx").on(table.status),
    index("projects_owner_user_id_idx").on(table.ownerUserId),
    index("projects_estimated_end_date_idx").on(table.estimatedEndDate),
  ],
);

export const projectsRelations = relations(projects, ({ one }) => ({
  customer: one(customers, {
    fields: [projects.customerId],
    references: [customers.id],
  }),
  owner: one(users, {
    fields: [projects.ownerUserId],
    references: [users.id],
  }),
}));
