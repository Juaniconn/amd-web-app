import { relations, sql } from "drizzle-orm";
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

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
};

export const branchStatusEnum = pgEnum("branch_status", ["activo", "inactivo"]);

export const branches = pgTable(
  "branches",
  {
    id: text("id").primaryKey(),
    code: text("code").notNull(),
    name: text("name").notNull(),
    address: text("address"),
    city: text("city"),
    state: text("state"),
    country: text("country").notNull().default("México"),
    postalCode: text("postal_code"),
    phone: text("phone"),
    email: text("email"),
    rfc: text("rfc"),
    status: branchStatusEnum("status").notNull().default("activo"),
    isOfficialSeed: boolean("is_official_seed").notNull().default(false),
    isDemo: boolean("is_demo").notNull().default(false),
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
    uniqueIndex("branches_code_uidx").on(table.code),
    index("branches_status_idx").on(table.status),
    index("branches_deleted_at_idx").on(table.deletedAt),
  ],
);

export const branchesRelations = relations(branches, ({ one }) => ({
  createdByUser: one(users, {
    fields: [branches.createdBy],
    references: [users.id],
  }),
}));
