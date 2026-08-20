import { relations, sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  boolean,
} from "drizzle-orm/pg-core";
import { users } from "./auth";
import { branches } from "./branches";
import { contacts, customers } from "./crm";
import { projects } from "./projects";
import type { QuoteItemCosting } from "@/lib/quotes/costing";
import type { QuoteAgentPreview } from "@/lib/quotes/market-preview";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
};

export const quoteStatusEnum = pgEnum("quote_status", [
  "borrador",
  "en_revision",
  "enviada",
  "aprobada",
  "rechazada",
  "expirada",
  "convertida",
]);

export const quoteCurrencyEnum = pgEnum("quote_currency", ["mxn", "usd"]);

export const quoteItemKindEnum = pgEnum("quote_item_kind", [
  "pieza",
  "servicio_ingenieria",
]);

export const orderStatusEnum = pgEnum("order_status", [
  "borrador",
  "pendiente",
  "aprobado",
  "en_produccion",
  "completado",
  "cancelado",
]);

export const quoteRfqTypeEnum = pgEnum("quote_rfq_type", [
  "solo_fabricacion",
  "diseno_fabricacion",
  "diseno_solamente",
  "reverse_engineering",
]);

export const quoteEngineeringTypeEnum = pgEnum("quote_engineering_type", [
  "diseno_nuevo",
  "modificacion",
  "reverse_engineering",
  "manufacturabilidad",
]);

export const quoteEngineeringStatusEnum = pgEnum("quote_engineering_status", [
  "no_requerida",
  "pendiente",
  "en_proceso",
  "esperando_cliente",
  "aprobada",
  "liberada",
]);

export const orderOriginEnum = pgEnum("order_origin", [
  "rfq_directa",
  "rfq_ingenieria",
]);

export const quoteAddresseeModeEnum = pgEnum("quote_addressee_mode", [
  "nombre",
  "departamento",
]);

export const paymentTermEnum = pgEnum("payment_term", [
  "net_15",
  "net_30",
  "net_45",
  "net_60",
  "net_90",
  "net_120",
]);

export const quotes = pgTable(
  "quotes",
  {
    id: text("id").primaryKey(),
    number: text("number").notNull(),
    customerId: text("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "restrict" }),
    contactId: text("contact_id").references(() => contacts.id, {
      onDelete: "set null",
    }),
    ownerUserId: text("owner_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    issueDate: timestamp("issue_date", { withTimezone: true }).notNull(),
    validUntil: timestamp("valid_until", { withTimezone: true }),
    currency: quoteCurrencyEnum("currency").notNull().default("mxn"),
    paymentTerms: text("payment_terms"),
    paymentTerm: paymentTermEnum("payment_term").default("net_30"),
    leadTime: text("lead_time"),
    notes: text("notes"),
    addresseeMode: quoteAddresseeModeEnum("addressee_mode")
      .notNull()
      .default("nombre"),
    branchId: text("branch_id").references(() => branches.id, {
      onDelete: "restrict",
    }),
    branchName: text("branch_name"),
    branchCode: text("branch_code"),
    branchAddress: text("branch_address"),
    branchCity: text("branch_city"),
    branchState: text("branch_state"),
    branchCountry: text("branch_country"),
    branchPostalCode: text("branch_postal_code"),
    branchPhone: text("branch_phone"),
    branchEmail: text("branch_email"),
    branchRfc: text("branch_rfc"),
    shippingAddress: text("shipping_address"),
    shippingCity: text("shipping_city"),
    shippingState: text("shipping_state"),
    shippingPostalCode: text("shipping_postal_code"),
    shippingCountry: text("shipping_country"),
    rfqType: quoteRfqTypeEnum("rfq_type").notNull().default("solo_fabricacion"),
    requiresEngineering: boolean("requires_engineering").notNull().default(false),
    engineeringType: quoteEngineeringTypeEnum("engineering_type"),
    engineeringStatus: quoteEngineeringStatusEnum("engineering_status")
      .notNull()
      .default("no_requerida"),
    status: quoteStatusEnum("status").notNull().default("borrador"),
    subtotal: numeric("subtotal", { precision: 14, scale: 2 })
      .notNull()
      .default("0"),
    taxTotal: numeric("tax_total", { precision: 14, scale: 2 })
      .notNull()
      .default("0"),
    total: numeric("total", { precision: 14, scale: 2 }).notNull().default("0"),
    estimatedCost: numeric("estimated_cost", { precision: 14, scale: 2 })
      .notNull()
      .default("0"),
    estimatedProfit: numeric("estimated_profit", { precision: 14, scale: 2 })
      .notNull()
      .default("0"),
    marginPercent: numeric("margin_percent", { precision: 7, scale: 2 }),
    projectId: text("project_id").references(() => projects.id, {
      onDelete: "set null",
    }),
    convertedOrderId: text("converted_order_id").references(
      (): AnyPgColumn => orders.id,
      { onDelete: "set null" },
    ),
    isDemo: boolean("is_demo").default(false).notNull(),
    agentPreview: jsonb("agent_preview").$type<QuoteAgentPreview | null>(),
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
    uniqueIndex("quotes_number_uidx").on(table.number),
    index("quotes_customer_id_idx").on(table.customerId),
    index("quotes_status_idx").on(table.status),
    index("quotes_rfq_type_idx").on(table.rfqType),
    index("quotes_engineering_status_idx").on(table.engineeringStatus),
    index("quotes_deleted_at_idx").on(table.deletedAt),
    index("quotes_valid_until_idx").on(table.validUntil),
    index("quotes_branch_id_idx").on(table.branchId),
    uniqueIndex("quotes_converted_order_uidx")
      .on(table.convertedOrderId)
      .where(sql`${table.convertedOrderId} is not null`),
    index("quotes_project_id_idx").on(table.projectId),
  ],
);

export const quoteItems = pgTable(
  "quote_items",
  {
    id: text("id").primaryKey(),
    quoteId: text("quote_id")
      .notNull()
      .references(() => quotes.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    kind: quoteItemKindEnum("kind").notNull().default("pieza"),
    description: text("description").notNull(),
    partNumber: text("part_number"),
    quantity: numeric("quantity", { precision: 12, scale: 4 }).notNull(),
    unit: text("unit").notNull().default("pza"),
    unitPrice: numeric("unit_price", { precision: 14, scale: 4 })
      .notNull()
      .default("0"),
    discountPercent: numeric("discount_percent", { precision: 5, scale: 2 })
      .notNull()
      .default("0"),
    taxPercent: numeric("tax_percent", { precision: 5, scale: 2 })
      .notNull()
      .default("16"),
    estimatedCost: numeric("estimated_cost", { precision: 14, scale: 4 })
      .notNull()
      .default("0"),
    lineSubtotal: numeric("line_subtotal", { precision: 14, scale: 2 })
      .notNull()
      .default("0"),
    lineTax: numeric("line_tax", { precision: 14, scale: 2 })
      .notNull()
      .default("0"),
    lineTotal: numeric("line_total", { precision: 14, scale: 2 })
      .notNull()
      .default("0"),
    lineEstimatedCost: numeric("line_estimated_cost", {
      precision: 14,
      scale: 2,
    })
      .notNull()
      .default("0"),
    lineProfit: numeric("line_profit", { precision: 14, scale: 2 })
      .notNull()
      .default("0"),
    lineMarginPercent: numeric("line_margin_percent", {
      precision: 7,
      scale: 2,
    }),
    costing: jsonb("costing").$type<QuoteItemCosting | null>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("quote_items_quote_id_idx").on(table.quoteId),
    uniqueIndex("quote_items_quote_position_uidx").on(
      table.quoteId,
      table.position,
    ),
  ],
);

export const orders = pgTable(
  "orders",
  {
    id: text("id").primaryKey(),
    number: text("number").notNull(),
    customerId: text("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "restrict" }),
    quoteId: text("quote_id")
      .notNull()
      .references(() => quotes.id, { onDelete: "restrict" }),
    origin: orderOriginEnum("origin").notNull().default("rfq_directa"),
    engineeringRequestId: text("engineering_request_id"),
    projectId: text("project_id").references(() => projects.id, {
      onDelete: "set null",
    }),
    ownerUserId: text("owner_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    promisedDate: timestamp("promised_date", { withTimezone: true }),
    notes: text("notes"),
    currency: quoteCurrencyEnum("currency").notNull().default("mxn"),
    total: numeric("total", { precision: 14, scale: 2 }).notNull().default("0"),
    status: orderStatusEnum("status").notNull().default("pendiente"),
    branchId: text("branch_id").references(() => branches.id, {
      onDelete: "set null",
    }),
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
    uniqueIndex("orders_number_uidx").on(table.number),
    uniqueIndex("orders_quote_id_uidx").on(table.quoteId),
    index("orders_customer_id_idx").on(table.customerId),
    index("orders_origin_idx").on(table.origin),
    index("orders_engineering_request_id_idx").on(table.engineeringRequestId),
    index("orders_project_id_idx").on(table.projectId),
    index("orders_status_idx").on(table.status),
    index("orders_promised_date_idx").on(table.promisedDate),
    index("orders_branch_id_idx").on(table.branchId),
  ],
);

export const orderItems = pgTable(
  "order_items",
  {
    id: text("id").primaryKey(),
    orderId: text("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    kind: quoteItemKindEnum("kind").notNull().default("pieza"),
    description: text("description").notNull(),
    partNumber: text("part_number"),
    quantity: numeric("quantity", { precision: 12, scale: 4 }).notNull(),
    unit: text("unit").notNull().default("pza"),
    unitPrice: numeric("unit_price", { precision: 14, scale: 4 })
      .notNull()
      .default("0"),
    discountPercent: numeric("discount_percent", { precision: 5, scale: 2 })
      .notNull()
      .default("0"),
    taxPercent: numeric("tax_percent", { precision: 5, scale: 2 })
      .notNull()
      .default("16"),
    lineSubtotal: numeric("line_subtotal", { precision: 14, scale: 2 })
      .notNull()
      .default("0"),
    lineTax: numeric("line_tax", { precision: 14, scale: 2 })
      .notNull()
      .default("0"),
    lineTotal: numeric("line_total", { precision: 14, scale: 2 })
      .notNull()
      .default("0"),
  },
  (table) => [index("order_items_order_id_idx").on(table.orderId)],
);

export const quotesRelations = relations(quotes, ({ one, many }) => ({
  customer: one(customers, {
    fields: [quotes.customerId],
    references: [customers.id],
  }),
  contact: one(contacts, {
    fields: [quotes.contactId],
    references: [contacts.id],
  }),
  owner: one(users, {
    fields: [quotes.ownerUserId],
    references: [users.id],
  }),
  items: many(quoteItems),
  project: one(projects, {
    fields: [quotes.projectId],
    references: [projects.id],
  }),
  branch: one(branches, {
    fields: [quotes.branchId],
    references: [branches.id],
  }),
  convertedOrder: one(orders, {
    fields: [quotes.convertedOrderId],
    references: [orders.id],
  }),
}));

export const quoteItemsRelations = relations(quoteItems, ({ one }) => ({
  quote: one(quotes, {
    fields: [quoteItems.quoteId],
    references: [quotes.id],
  }),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  customer: one(customers, {
    fields: [orders.customerId],
    references: [customers.id],
  }),
  quote: one(quotes, {
    fields: [orders.quoteId],
    references: [quotes.id],
  }),
  project: one(projects, {
    fields: [orders.projectId],
    references: [projects.id],
  }),
  owner: one(users, {
    fields: [orders.ownerUserId],
    references: [users.id],
  }),
  items: many(orderItems),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
}));
