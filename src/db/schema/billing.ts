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
import { branches } from "./branches";
import { customers } from "./crm";
import { orders } from "./quotes";

export const invoiceStatusEnum = pgEnum("invoice_status", [
  "borrador",
  "emitida",
  "parcial",
  "pagada",
  "cancelada",
]);

export const paymentMethodEnum = pgEnum("payment_method", [
  "transferencia",
  "cheque",
  "efectivo",
  "otro",
]);

export const invoices = pgTable(
  "invoices",
  {
    id: text("id").primaryKey(),
    number: text("number").notNull(),
    orderId: text("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "restrict" }),
    customerId: text("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "restrict" }),
    branchId: text("branch_id").references(() => branches.id, { onDelete: "set null" }),
    issueDate: timestamp("issue_date", { withTimezone: true }).notNull(),
    dueDate: timestamp("due_date", { withTimezone: true }),
    currency: text("currency").notNull().default("mxn"),
    paymentTerm: text("payment_term").default("net_30"),
    status: invoiceStatusEnum("status").notNull().default("borrador"),
    subtotal: numeric("subtotal", { precision: 14, scale: 2 }).notNull().default("0"),
    taxTotal: numeric("tax_total", { precision: 14, scale: 2 }).notNull().default("0"),
    total: numeric("total", { precision: 14, scale: 2 }).notNull().default("0"),
    paidTotal: numeric("paid_total", { precision: 14, scale: 2 }).notNull().default("0"),
    notes: text("notes"),
    createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
    updatedBy: text("updated_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("invoices_number_uidx").on(table.number),
    uniqueIndex("invoices_order_uidx").on(table.orderId),
    index("invoices_status_idx").on(table.status),
    index("invoices_customer_idx").on(table.customerId),
  ],
);

export const invoiceItems = pgTable(
  "invoice_items",
  {
    id: text("id").primaryKey(),
    invoiceId: text("invoice_id")
      .notNull()
      .references(() => invoices.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    description: text("description").notNull(),
    quantity: numeric("quantity", { precision: 14, scale: 4 }).notNull(),
    unitPrice: numeric("unit_price", { precision: 14, scale: 4 }).notNull(),
    taxPercent: numeric("tax_percent", { precision: 5, scale: 2 }).notNull().default("16"),
    lineTotal: numeric("line_total", { precision: 14, scale: 2 }).notNull(),
  },
);

export const invoicePayments = pgTable(
  "invoice_payments",
  {
    id: text("id").primaryKey(),
    invoiceId: text("invoice_id")
      .notNull()
      .references(() => invoices.id, { onDelete: "cascade" }),
    paidAt: timestamp("paid_at", { withTimezone: true }).notNull(),
    amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
    method: paymentMethodEnum("method").notNull().default("transferencia"),
    reference: text("reference"),
    createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("invoice_payments_invoice_idx").on(table.invoiceId)],
);

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  order: one(orders, { fields: [invoices.orderId], references: [orders.id] }),
  customer: one(customers, { fields: [invoices.customerId], references: [customers.id] }),
  items: many(invoiceItems),
  payments: many(invoicePayments),
}));
