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

export const customerTypeEnum = pgEnum("customer_type", [
  "industrial",
  "maquiladora",
  "comercial",
  "otro",
]);

export const customerStatusEnum = pgEnum("customer_status", [
  "activo",
  "inactivo",
]);

export const customers = pgTable(
  "customers",
  {
    id: text("id").primaryKey(),
    code: text("code").notNull(),
    legalName: text("legal_name").notNull(),
    tradeName: text("trade_name"),
    rfc: text("rfc"),
    phone: text("phone"),
    email: text("email"),
    address: text("address"),
    city: text("city"),
    state: text("state"),
    country: text("country").default("México").notNull(),
    shippingSameAsBilling: boolean("shipping_same_as_billing")
      .default(false)
      .notNull(),
    shippingAddress: text("shipping_address"),
    shippingCity: text("shipping_city"),
    shippingState: text("shipping_state"),
    shippingPostalCode: text("shipping_postal_code"),
    shippingCountry: text("shipping_country"),
    type: customerTypeEnum("type").notNull(),
    status: customerStatusEnum("status").notNull().default("activo"),
    notes: text("notes"),
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
    uniqueIndex("customers_code_uidx").on(table.code),
    uniqueIndex("customers_rfc_active_uidx")
      .on(table.rfc)
      .where(sql`${table.rfc} is not null and ${table.deletedAt} is null`),
    index("customers_legal_name_idx").on(table.legalName),
    index("customers_status_idx").on(table.status),
    index("customers_type_idx").on(table.type),
    index("customers_deleted_at_idx").on(table.deletedAt),
  ],
);

export const contacts = pgTable(
  "contacts",
  {
    id: text("id").primaryKey(),
    customerId: text("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    title: text("title"),
    email: text("email"),
    phone: text("phone"),
    whatsapp: text("whatsapp"),
    department: text("department"),
    isPrimary: boolean("is_primary").default(false).notNull(),
    notes: text("notes"),
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
    index("contacts_customer_id_idx").on(table.customerId),
    uniqueIndex("contacts_one_primary_uidx")
      .on(table.customerId)
      .where(sql`${table.isPrimary} = true and ${table.deletedAt} is null`),
    index("contacts_deleted_at_idx").on(table.deletedAt),
  ],
);

export const customersRelations = relations(customers, ({ many }) => ({
  contacts: many(contacts),
}));

export const contactsRelations = relations(contacts, ({ one }) => ({
  customer: one(customers, {
    fields: [contacts.customerId],
    references: [customers.id],
  }),
}));
