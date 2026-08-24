import "server-only";

import { and, desc, eq, ilike, ne, or, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  branches,
  customers,
  deliveries,
  invoiceItems,
  invoicePayments,
  invoices,
  orderItems,
  orders,
  quotes,
} from "@/db/schema";
import { invoiceStatusFromPaid, type InvoiceStatus } from "@/lib/billing/catalog";
import { AppError } from "@/lib/errors";
import {
  PAYMENT_TERM_DAYS,
  PAYMENT_TERM_LABELS,
  type PaymentTerm,
} from "@/lib/quotes/commercial";
import { formatMoney, parseMoney, roundMoney } from "@/lib/quotes/money";
import type {
  CreateInvoiceFromOrderInput,
  RegisterPaymentInput,
} from "@/lib/validation/billing";
import { recordActivity } from "@/server/services/activity";
import type { Actor } from "@/server/services/customers";
import { nextDocumentNumber } from "@/server/services/numbering";
import { resolvePageSize } from "@/lib/ui/pagination";

function yearPrefix(prefix: string) {
  return `${prefix}${new Date().getFullYear()}-`;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export async function listPendingToInvoice() {
  // OTs entregadas que aún no tienen borrador de facturación
  const invoiced = await db.select({ orderId: invoices.orderId }).from(invoices);
  const invoicedIds = new Set(invoiced.map((row) => row.orderId));
  const rows = await db
    .select({
      id: orders.id,
      number: orders.number,
      customerName: customers.legalName,
      customerRfc: customers.rfc,
      total: orders.total,
      currency: orders.currency,
      status: orders.status,
      deliveryNumber: deliveries.number,
      deliveredAt: deliveries.deliveredAt,
      branchCode: branches.code,
    })
    .from(orders)
    .innerJoin(customers, eq(customers.id, orders.customerId))
    .innerJoin(
      deliveries,
      and(eq(deliveries.orderId, orders.id), eq(deliveries.status, "entregado")),
    )
    .leftJoin(branches, eq(branches.id, orders.branchId))
    .where(ne(orders.status, "cancelado"))
    .orderBy(desc(deliveries.deliveredAt))
    .limit(100);
  const seen = new Set<string>();
  return rows.filter((row) => {
    if (invoicedIds.has(row.id) || seen.has(row.id)) return false;
    seen.add(row.id);
    return true;
  });
}

export async function listInvoices(input?: {
  q?: string;
  status?: InvoiceStatus;
  page?: number;
  pageSize?: number;
}) {
  const page = Math.max(1, input?.page ?? 1);
  const pageSize = resolvePageSize(input?.pageSize);
  const filters = [];
  if (input?.status) filters.push(eq(invoices.status, input.status));
  if (input?.q) {
    const term = `%${input.q}%`;
    filters.push(
      or(
        ilike(invoices.number, term),
        ilike(orders.number, term),
        ilike(quotes.number, term),
        ilike(customers.legalName, term),
      ),
    );
  }
  const where = filters.length ? and(...filters) : undefined;
  const [countRow] = await db
    .select({ value: sql<number>`count(*)::int` })
    .from(invoices)
    .innerJoin(orders, eq(orders.id, invoices.orderId))
    .innerJoin(customers, eq(customers.id, invoices.customerId))
    .innerJoin(quotes, eq(quotes.id, orders.quoteId))
    .where(where);
  const rows = await db
    .select({
      id: invoices.id,
      number: invoices.number,
      status: invoices.status,
      currency: invoices.currency,
      total: invoices.total,
      paidTotal: invoices.paidTotal,
      issueDate: invoices.issueDate,
      dueDate: invoices.dueDate,
      orderId: invoices.orderId,
      orderNumber: orders.number,
      quoteId: quotes.id,
      quoteNumber: quotes.number,
      customerName: customers.legalName,
      branchCode: branches.code,
    })
    .from(invoices)
    .innerJoin(orders, eq(orders.id, invoices.orderId))
    .innerJoin(customers, eq(customers.id, invoices.customerId))
    .innerJoin(quotes, eq(quotes.id, orders.quoteId))
    .leftJoin(branches, eq(branches.id, invoices.branchId))
    .where(where)
    .orderBy(desc(invoices.createdAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize);
  const total = Number(countRow?.value ?? 0);
  return {
    rows,
    total,
    page,
    pageSize,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function getInvoiceById(id: string) {
  const [row] = await db
    .select({
      invoice: invoices,
      orderNumber: orders.number,
      quoteId: quotes.id,
      quoteNumber: quotes.number,
      customerName: customers.legalName,
      customerRfc: customers.rfc,
      branchName: branches.name,
      branchCode: branches.code,
    })
    .from(invoices)
    .innerJoin(orders, eq(orders.id, invoices.orderId))
    .innerJoin(customers, eq(customers.id, invoices.customerId))
    .innerJoin(quotes, eq(quotes.id, orders.quoteId))
    .leftJoin(branches, eq(branches.id, invoices.branchId))
    .where(eq(invoices.id, id))
    .limit(1);
  if (!row) return null;
  const items = await db
    .select()
    .from(invoiceItems)
    .where(eq(invoiceItems.invoiceId, id))
    .orderBy(invoiceItems.position);
  const payments = await db
    .select()
    .from(invoicePayments)
    .where(eq(invoicePayments.invoiceId, id))
    .orderBy(desc(invoicePayments.paidAt));
  return {
    ...row.invoice,
    orderNumber: row.orderNumber,
    quoteId: row.quoteId,
    quoteNumber: row.quoteNumber,
    customerName: row.customerName,
    customerRfc: row.customerRfc,
    branchName: row.branchName,
    branchCode: row.branchCode,
    items,
    payments,
    balance: formatMoney(parseMoney(row.invoice.total) - parseMoney(row.invoice.paidTotal)),
  };
}

export async function createInvoiceFromOrder(
  input: Pick<CreateInvoiceFromOrderInput, "orderId"> &
    Partial<CreateInvoiceFromOrderInput>,
  actor: Actor,
) {
  const [existing] = await db
    .select({ id: invoices.id, number: invoices.number })
    .from(invoices)
    .where(eq(invoices.orderId, input.orderId))
    .limit(1);
  if (existing) {
    throw new AppError(
      `Esta orden de trabajo ya tiene la factura ${existing.number}.`,
      "INVOICE_EXISTS",
      409,
    );
  }

  const [orderRow] = await db
    .select({
      order: orders,
      customerName: customers.legalName,
      paymentTerm: quotes.paymentTerm,
    })
    .from(orders)
    .innerJoin(customers, eq(customers.id, orders.customerId))
    .innerJoin(quotes, eq(quotes.id, orders.quoteId))
    .where(eq(orders.id, input.orderId))
    .limit(1);
  if (!orderRow) {
    throw new AppError("La orden de trabajo no existe.", "ORDER_NOT_FOUND", 404);
  }
  if (orderRow.order.status === "cancelado") {
    throw new AppError("No se puede facturar una orden de trabajo cancelada.", "ORDER_CANCELLED", 409);
  }

  const items = await db
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, input.orderId))
    .orderBy(orderItems.position);
  if (items.length === 0) {
    throw new AppError("La orden de trabajo no tiene partidas para facturar.", "ORDER_EMPTY", 409);
  }

  const paymentTerm = (input.paymentTerm ??
    orderRow.paymentTerm ??
    "net_30") as PaymentTerm;
  const issueDate = input.issueDate ? new Date(input.issueDate) : new Date();
  const dueDate = addDays(issueDate, PAYMENT_TERM_DAYS[paymentTerm] ?? 30);
  const subtotal = roundMoney(items.reduce((sum, item) => sum + parseMoney(item.lineSubtotal), 0));
  const taxTotal = roundMoney(items.reduce((sum, item) => sum + parseMoney(item.lineTax), 0));
  const total = roundMoney(subtotal + taxTotal);
  const id = crypto.randomUUID();

  return db.transaction(async (tx) => {
    const number = await nextDocumentNumber(tx, "invoices", yearPrefix("FAC-"));
    await tx.insert(invoices).values({
      id,
      number,
      orderId: orderRow.order.id,
      customerId: orderRow.order.customerId,
      branchId: orderRow.order.branchId,
      issueDate,
      dueDate,
      currency: orderRow.order.currency,
      paymentTerm,
      status: "borrador",
      subtotal: formatMoney(subtotal),
      taxTotal: formatMoney(taxTotal),
      total: formatMoney(total),
      notes: input.notes ?? null,
      createdBy: actor.userId,
      updatedBy: actor.userId,
    });
    await tx.insert(invoiceItems).values(
      items.map((item, index) => ({
        id: crypto.randomUUID(),
        invoiceId: id,
        position: index + 1,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        taxPercent: item.taxPercent,
        lineTotal: item.lineTotal,
      })),
    );
    await recordActivity(tx, {
      actorUserId: actor.userId,
      actorName: actor.name,
      action: "created",
      entityType: "invoice",
      entityId: id,
      entityLabel: `${number} · ${orderRow.order.number} · ${orderRow.customerName} · ${PAYMENT_TERM_LABELS[paymentTerm]}`,
      parentEntityType: "order",
      parentEntityId: orderRow.order.id,
    });
    return { id, number };
  });
}

export async function issueInvoice(id: string, actor: Actor) {
  const invoice = await getInvoiceById(id);
  if (!invoice) {
    throw new AppError("La factura no existe.", "INVOICE_NOT_FOUND", 404);
  }
  if (invoice.status !== "borrador") {
    throw new AppError("Solo se emite una factura en borrador.", "INVOICE_NOT_DRAFT", 409);
  }
  await db
    .update(invoices)
    .set({ status: "emitida", updatedBy: actor.userId, updatedAt: new Date() })
    .where(eq(invoices.id, id));
  await recordActivity(db, {
    actorUserId: actor.userId,
    actorName: actor.name,
    action: "status_changed",
    entityType: "invoice",
    entityId: id,
    entityLabel: `${invoice.number} (Borrador → Emitida)`,
    parentEntityType: "order",
    parentEntityId: invoice.orderId,
  });
}

export async function cancelInvoice(id: string, actor: Actor, notes?: string) {
  const invoice = await getInvoiceById(id);
  if (!invoice) {
    throw new AppError("La factura no existe.", "INVOICE_NOT_FOUND", 404);
  }
  if (invoice.status === "pagada") {
    throw new AppError("No se puede cancelar una factura pagada.", "INVOICE_PAID", 409);
  }
  if (parseMoney(invoice.paidTotal) > 0) {
    throw new AppError(
      "No se puede cancelar una factura con pagos registrados.",
      "INVOICE_HAS_PAYMENTS",
      409,
    );
  }
  await db
    .update(invoices)
    .set({
      status: "cancelada",
      notes: notes ?? invoice.notes,
      updatedBy: actor.userId,
      updatedAt: new Date(),
    })
    .where(eq(invoices.id, id));
  await recordActivity(db, {
    actorUserId: actor.userId,
    actorName: actor.name,
    action: "cancelled",
    entityType: "invoice",
    entityId: id,
    entityLabel: invoice.number,
    parentEntityType: "order",
    parentEntityId: invoice.orderId,
  });
}

export async function registerPayment(input: RegisterPaymentInput, actor: Actor) {
  const invoice = await getInvoiceById(input.invoiceId);
  if (!invoice) {
    throw new AppError("La factura no existe.", "INVOICE_NOT_FOUND", 404);
  }
  if (invoice.status === "borrador" || invoice.status === "cancelada") {
    throw new AppError(
      "Emite la factura antes de registrar un pago.",
      "INVOICE_NOT_ISSUED",
      409,
    );
  }
  if (invoice.status === "pagada") {
    throw new AppError("La factura ya está pagada.", "INVOICE_PAID", 409);
  }
  const nextPaid = roundMoney(parseMoney(invoice.paidTotal) + input.amount);
  const total = parseMoney(invoice.total);
  if (nextPaid - total > 0.009) {
    throw new AppError(
      "El pago excede el saldo de la factura.",
      "PAYMENT_EXCEEDS_BALANCE",
      409,
    );
  }
  const status = invoiceStatusFromPaid(nextPaid, total);
  await db.insert(invoicePayments).values({
    id: crypto.randomUUID(),
    invoiceId: invoice.id,
    paidAt: input.paidAt ? new Date(input.paidAt) : new Date(),
    amount: formatMoney(input.amount),
    method: input.method,
    reference: input.reference ?? null,
    createdBy: actor.userId,
  });
  await db
    .update(invoices)
    .set({
      paidTotal: formatMoney(nextPaid),
      status,
      updatedBy: actor.userId,
      updatedAt: new Date(),
    })
    .where(eq(invoices.id, invoice.id));
  await recordActivity(db, {
    actorUserId: actor.userId,
    actorName: actor.name,
    action: "closed",
    entityType: "invoice",
    entityId: invoice.id,
    entityLabel: `${invoice.number} · ${formatMoney(input.amount)} ${invoice.currency.toUpperCase()}`,
    parentEntityType: "order",
    parentEntityId: invoice.orderId,
  });
}
