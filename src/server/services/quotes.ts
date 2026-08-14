import "server-only";

import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  ilike,
  isNotNull,
  isNull,
  lt,
  lte,
  or,
} from "drizzle-orm";
import { db } from "@/db";
import {
  contacts,
  customers,
  documents,
  orderItems,
  orders,
  quoteItems,
  quotes,
} from "@/db/schema";
import { pickChangedFields } from "@/lib/audit/activity";
import { AppError } from "@/lib/errors";
import {
  calculateLineTotals,
  calculateQuoteTotals,
  formatMoney,
  parseMoney,
} from "@/lib/quotes/money";
import { quoteOriginForProduction } from "@/lib/quotes/rfq";
import type { QuoteEngineeringStatus, RfqType } from "@/lib/quotes/rfq";
import {
  canEditQuote,
  canMarkQuoteSent,
  canTransitionQuote,
  isQuoteExpired,
  QUOTE_STATUS_LABELS,
  type QuoteStatus,
} from "@/lib/quotes/status";
import type {
  AddQuoteItemInput,
  CreateQuoteInput,
  UpdateQuoteInput,
  UpdateQuoteItemInput,
} from "@/lib/validation/quotes";
import { recordActivity } from "@/server/services/activity";
import type { Actor } from "@/server/services/customers";
import {
  ensureEngineeringRequestForQuote,
  getActiveEngineeringByQuoteId,
} from "@/server/services/engineering";
import { nextDocumentNumber } from "@/server/services/numbering";

export const QUOTE_PAGE_SIZE = 20;

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

function moneyFields(line: ReturnType<typeof calculateLineTotals>) {
  return {
    lineSubtotal: formatMoney(line.lineSubtotal),
    lineTax: formatMoney(line.lineTax),
    lineTotal: formatMoney(line.lineTotal),
    lineEstimatedCost: formatMoney(line.lineEstimatedCost),
    lineProfit: formatMoney(line.lineProfit),
    lineMarginPercent:
      line.lineMarginPercent === null ? null : formatMoney(line.lineMarginPercent),
  };
}

async function requireCustomer(customerId: string) {
  const [customer] = await db
    .select()
    .from(customers)
    .where(and(eq(customers.id, customerId), isNull(customers.deletedAt)))
    .limit(1);
  if (!customer) {
    throw new AppError("El cliente no existe o está archivado.", "CUSTOMER_NOT_FOUND", 404);
  }
  if (customer.status !== "activo") {
    throw new AppError(
      "Solo se puede cotizar a un cliente activo.",
      "CUSTOMER_INACTIVE",
      400,
    );
  }
  return customer;
}

async function requireContact(customerId: string, contactId?: string) {
  if (!contactId) return null;
  const [contact] = await db
    .select()
    .from(contacts)
    .where(
      and(
        eq(contacts.id, contactId),
        eq(contacts.customerId, customerId),
        isNull(contacts.deletedAt),
      ),
    )
    .limit(1);
  if (!contact) {
    throw new AppError(
      "El contacto no pertenece a este cliente.",
      "CONTACT_MISMATCH",
      400,
    );
  }
  return contact;
}

async function loadQuoteRow(id: string) {
  const [quote] = await db
    .select()
    .from(quotes)
    .where(eq(quotes.id, id))
    .limit(1);
  if (!quote || quote.deletedAt) {
    throw new AppError("La cotización no existe.", "QUOTE_NOT_FOUND", 404);
  }
  return quote;
}

async function loadItems(quoteId: string) {
  return db
    .select()
    .from(quoteItems)
    .where(eq(quoteItems.quoteId, quoteId))
    .orderBy(asc(quoteItems.position));
}

async function persistTotals(tx: Tx, quoteId: string) {
  const items = await tx
    .select()
    .from(quoteItems)
    .where(eq(quoteItems.quoteId, quoteId));
  const totals = calculateQuoteTotals(
    items.map((item) =>
      calculateLineTotals({
        quantity: parseMoney(item.quantity),
        unitPrice: parseMoney(item.unitPrice),
        discountPercent: parseMoney(item.discountPercent),
        taxPercent: parseMoney(item.taxPercent),
        estimatedCost: parseMoney(item.estimatedCost),
      }),
    ),
  );
  await tx
    .update(quotes)
    .set({
      subtotal: formatMoney(totals.subtotal),
      taxTotal: formatMoney(totals.taxTotal),
      total: formatMoney(totals.total),
      estimatedCost: formatMoney(totals.estimatedCost),
      estimatedProfit: formatMoney(totals.estimatedProfit),
      marginPercent:
        totals.marginPercent === null ? null : formatMoney(totals.marginPercent),
      updatedAt: new Date(),
    })
    .where(eq(quotes.id, quoteId));
  return totals;
}

function assertEditable(status: QuoteStatus) {
  if (!canEditQuote(status)) {
    throw new AppError(
      "Esta cotización ya no se puede editar.",
      "QUOTE_LOCKED",
      409,
    );
  }
}

async function expireOverdueQuotes() {
  const now = new Date();
  const overdue = await db
    .select({
      id: quotes.id,
      number: quotes.number,
      customerId: quotes.customerId,
    })
    .from(quotes)
    .where(
      and(
        isNull(quotes.deletedAt),
        eq(quotes.status, "enviada"),
        isNotNull(quotes.validUntil),
        lt(quotes.validUntil, now),
      ),
    );

  for (const quote of overdue) {
    await db.transaction(async (tx) => {
      await tx
        .update(quotes)
        .set({ status: "expirada", updatedAt: now })
        .where(and(eq(quotes.id, quote.id), eq(quotes.status, "enviada")));
      await recordActivity(tx, {
        actorUserId: null,
        actorName: null,
        action: "expired",
        entityType: "quote",
        entityId: quote.id,
        entityLabel: quote.number,
        parentEntityType: "customer",
        parentEntityId: quote.customerId,
        previousValue: { status: "enviada" },
        newValue: { status: "expirada" },
      });
    });
  }
}

export async function createQuote(input: CreateQuoteInput, actor: Actor) {
  const customer = await requireCustomer(input.customerId);
  await requireContact(input.customerId, input.contactId);
  const id = crypto.randomUUID();
  const now = new Date();
  const issueDate = input.issueDate ?? now;
  const year = issueDate.getFullYear();

  await db.transaction(async (tx) => {
    const number = await nextDocumentNumber(tx, "quotes", `COT-${year}-`);
    await tx.insert(quotes).values({
      id,
      number,
      customerId: customer.id,
      contactId: input.contactId ?? null,
      ownerUserId: actor.userId,
      issueDate,
      validUntil: input.validUntil ?? null,
      currency: input.currency,
      paymentTerms: input.paymentTerms ?? null,
      leadTime: input.leadTime ?? null,
      notes: input.notes ?? null,
      rfqType: input.rfqType,
      requiresEngineering: input.requiresEngineering,
      engineeringType: input.engineeringType,
      engineeringStatus: input.requiresEngineering ? "pendiente" : "no_requerida",
      status: "borrador",
      isDemo: customer.isDemo,
      createdBy: actor.userId,
      updatedBy: actor.userId,
    });
    await ensureEngineeringRequestForQuote(
      tx,
      {
        id,
        customerId: customer.id,
        number,
        notes: input.notes ?? null,
        isDemo: customer.isDemo,
        requiresEngineering: input.requiresEngineering,
        engineeringType: input.engineeringType,
      },
      actor,
    );
    await recordActivity(tx, {
      actorUserId: actor.userId,
      actorName: actor.name,
      action: "created",
      entityType: "quote",
      entityId: id,
      entityLabel: number,
      parentEntityType: "customer",
      parentEntityId: customer.id,
      newValue: { number, customerId: customer.id },
    });
  });

  return { id };
}

export async function updateQuote(input: UpdateQuoteInput, actor: Actor) {
  const current = await loadQuoteRow(input.id);
  assertEditable(current.status);
  await requireContact(current.customerId, input.contactId);

  const next = {
    contactId: input.contactId ?? null,
    issueDate: input.issueDate,
    validUntil: input.validUntil ?? null,
    currency: input.currency,
    paymentTerms: input.paymentTerms ?? null,
    leadTime: input.leadTime ?? null,
    notes: input.notes ?? null,
    rfqType: input.rfqType,
    requiresEngineering: input.requiresEngineering,
    engineeringType: input.engineeringType,
  };
  const changed = pickChangedFields(
    {
      contactId: current.contactId,
      issueDate: current.issueDate.toISOString(),
      validUntil: current.validUntil?.toISOString() ?? null,
      currency: current.currency,
      paymentTerms: current.paymentTerms,
      leadTime: current.leadTime,
      notes: current.notes,
      rfqType: current.rfqType,
      requiresEngineering: current.requiresEngineering,
      engineeringType: current.engineeringType,
    },
    {
      contactId: next.contactId,
      issueDate: next.issueDate.toISOString(),
      validUntil: next.validUntil?.toISOString() ?? null,
      currency: next.currency,
      paymentTerms: next.paymentTerms,
      leadTime: next.leadTime,
      notes: next.notes,
      rfqType: next.rfqType,
      requiresEngineering: next.requiresEngineering,
      engineeringType: next.engineeringType,
    },
  );

  await db.transaction(async (tx) => {
    await tx
      .update(quotes)
      .set({ ...next, updatedBy: actor.userId, updatedAt: new Date() })
      .where(eq(quotes.id, input.id));
    await ensureEngineeringRequestForQuote(
      tx,
      {
        id: current.id,
        customerId: current.customerId,
        number: current.number,
        notes: next.notes,
        isDemo: current.isDemo,
        requiresEngineering: next.requiresEngineering,
        engineeringType: next.engineeringType,
      },
      actor,
    );
    if (Object.keys(changed.newValue).length > 0) {
      await recordActivity(tx, {
        actorUserId: actor.userId,
        actorName: actor.name,
        action: "updated",
        entityType: "quote",
        entityId: input.id,
        entityLabel: current.number,
        parentEntityType: "customer",
        parentEntityId: current.customerId,
        previousValue: changed.previousValue,
        newValue: changed.newValue,
      });
    }
  });

  return { id: input.id };
}

export async function archiveQuote(id: string, actor: Actor) {
  const current = await loadQuoteRow(id);
  if (current.status === "convertida") {
    throw new AppError(
      "No se puede archivar una cotización convertida en pedido.",
      "QUOTE_CONVERTED",
      409,
    );
  }
  const now = new Date();
  await db.transaction(async (tx) => {
    await tx
      .update(quotes)
      .set({ deletedAt: now, updatedBy: actor.userId, updatedAt: now })
      .where(eq(quotes.id, id));
    await recordActivity(tx, {
      actorUserId: actor.userId,
      actorName: actor.name,
      action: "deleted",
      entityType: "quote",
      entityId: id,
      entityLabel: current.number,
      parentEntityType: "customer",
      parentEntityId: current.customerId,
    });
  });
  return { id };
}

export async function addQuoteItem(input: AddQuoteItemInput, actor: Actor) {
  const quote = await loadQuoteRow(input.quoteId);
  assertEditable(quote.status);
  const totals = calculateLineTotals(input);
  const id = crypto.randomUUID();

  await db.transaction(async (tx) => {
    const existing = await tx
      .select({ position: quoteItems.position })
      .from(quoteItems)
      .where(eq(quoteItems.quoteId, input.quoteId))
      .orderBy(desc(quoteItems.position))
      .limit(1);
    const position = (existing[0]?.position ?? 0) + 1;
    await tx.insert(quoteItems).values({
      id,
      quoteId: input.quoteId,
      position,
      description: input.description,
      partNumber: input.partNumber ?? null,
      quantity: formatMoney(input.quantity, 4),
      unit: input.unit,
      unitPrice: formatMoney(input.unitPrice, 4),
      discountPercent: formatMoney(input.discountPercent),
      taxPercent: formatMoney(input.taxPercent),
      estimatedCost: formatMoney(input.estimatedCost, 4),
      ...moneyFields(totals),
    });
    await persistTotals(tx, input.quoteId);
    await recordActivity(tx, {
      actorUserId: actor.userId,
      actorName: actor.name,
      action: "created",
      entityType: "quote_item",
      entityId: id,
      entityLabel: input.description,
      parentEntityType: "quote",
      parentEntityId: input.quoteId,
    });
  });

  return { id };
}

export async function updateQuoteItem(input: UpdateQuoteItemInput, actor: Actor) {
  const quote = await loadQuoteRow(input.quoteId);
  assertEditable(quote.status);
  const [current] = await db
    .select()
    .from(quoteItems)
    .where(and(eq(quoteItems.id, input.id), eq(quoteItems.quoteId, input.quoteId)))
    .limit(1);
  if (!current) {
    throw new AppError("La partida no existe.", "QUOTE_ITEM_NOT_FOUND", 404);
  }
  const totals = calculateLineTotals(input);

  await db.transaction(async (tx) => {
    await tx
      .update(quoteItems)
      .set({
        description: input.description,
        partNumber: input.partNumber ?? null,
        quantity: formatMoney(input.quantity, 4),
        unit: input.unit,
        unitPrice: formatMoney(input.unitPrice, 4),
        discountPercent: formatMoney(input.discountPercent),
        taxPercent: formatMoney(input.taxPercent),
        estimatedCost: formatMoney(input.estimatedCost, 4),
        ...moneyFields(totals),
        updatedAt: new Date(),
      })
      .where(eq(quoteItems.id, input.id));
    await persistTotals(tx, input.quoteId);
    await recordActivity(tx, {
      actorUserId: actor.userId,
      actorName: actor.name,
      action: "updated",
      entityType: "quote_item",
      entityId: input.id,
      entityLabel: input.description,
      parentEntityType: "quote",
      parentEntityId: input.quoteId,
    });
  });

  return { id: input.id };
}

export async function deleteQuoteItem(
  id: string,
  quoteId: string,
  actor: Actor,
) {
  const quote = await loadQuoteRow(quoteId);
  assertEditable(quote.status);
  const [current] = await db
    .select()
    .from(quoteItems)
    .where(and(eq(quoteItems.id, id), eq(quoteItems.quoteId, quoteId)))
    .limit(1);
  if (!current) {
    throw new AppError("La partida no existe.", "QUOTE_ITEM_NOT_FOUND", 404);
  }

  await db.transaction(async (tx) => {
    await tx.delete(quoteItems).where(eq(quoteItems.id, id));
    await persistTotals(tx, quoteId);
    await recordActivity(tx, {
      actorUserId: actor.userId,
      actorName: actor.name,
      action: "deleted",
      entityType: "quote_item",
      entityId: id,
      entityLabel: current.description,
      parentEntityType: "quote",
      parentEntityId: quoteId,
    });
  });

  return { id };
}

export async function changeQuoteStatus(
  id: string,
  nextStatus: QuoteStatus,
  actor: Actor,
) {
  const current = await loadQuoteRow(id);
  if (!canTransitionQuote(current.status, nextStatus)) {
    throw new AppError(
      `No se puede cambiar de ${QUOTE_STATUS_LABELS[current.status]} a ${QUOTE_STATUS_LABELS[nextStatus]}.`,
      "INVALID_TRANSITION",
      409,
    );
  }

  if (nextStatus === "enviada") {
    const items = await loadItems(id);
    const ready = canMarkQuoteSent({
      itemCount: items.length,
      itemsHaveUnitPrice: items.every((item) => item.unitPrice !== null),
    });
    if (!ready.ok) {
      throw new AppError(ready.reason ?? "No se puede enviar.", "QUOTE_NOT_READY", 400);
    }
  }

  const action =
    nextStatus === "enviada"
      ? "sent"
      : nextStatus === "expirada"
        ? "expired"
        : "status_changed";

  await db.transaction(async (tx) => {
    await tx
      .update(quotes)
      .set({
        status: nextStatus,
        updatedBy: actor.userId,
        updatedAt: new Date(),
      })
      .where(eq(quotes.id, id));
    await recordActivity(tx, {
      actorUserId: actor.userId,
      actorName: actor.name,
      action,
      entityType: "quote",
      entityId: id,
      entityLabel: current.number,
      parentEntityType: "customer",
      parentEntityId: current.customerId,
      previousValue: { status: current.status },
      newValue: { status: nextStatus },
    });
  });

  return { id, status: nextStatus };
}

export async function convertQuoteToOrder(id: string, actor: Actor) {
  const current = await loadQuoteRow(id);
  if (!canTransitionQuote(current.status, "convertida")) {
    throw new AppError(
      "Solo una cotización aprobada puede convertirse en pedido.",
      "INVALID_TRANSITION",
      409,
    );
  }
  const items = await loadItems(id);
  if (items.length === 0) {
    throw new AppError("La cotización no tiene partidas.", "QUOTE_EMPTY", 400);
  }

  const engineering = await getActiveEngineeringByQuoteId(id);
  if (current.requiresEngineering) {
    if (!engineering || engineering.status !== "liberado") {
      throw new AppError(
        "Esta RFQ requiere ingeniería liberada antes de convertir a pedido.",
        "ENGINEERING_NOT_RELEASED",
        409,
      );
    }
  }

  const orderId = crypto.randomUUID();
  const year = new Date().getFullYear();
  const origin = quoteOriginForProduction(current.requiresEngineering);

  await db.transaction(async (tx) => {
    const number = await nextDocumentNumber(tx, "orders", `AMD-${year}-`);
    await tx.insert(orders).values({
      id: orderId,
      number,
      customerId: current.customerId,
      quoteId: current.id,
      origin,
      engineeringRequestId:
        engineering?.status === "liberado" ? engineering.id : null,
      currency: current.currency,
      total: current.total,
      status: "nuevo",
      isDemo: current.isDemo,
      createdBy: actor.userId,
      updatedBy: actor.userId,
    });
    await tx.insert(orderItems).values(
      items.map((item) => ({
        id: crypto.randomUUID(),
        orderId,
        position: item.position,
        description: item.description,
        partNumber: item.partNumber,
        quantity: item.quantity,
        unit: item.unit,
        unitPrice: item.unitPrice,
        discountPercent: item.discountPercent,
        taxPercent: item.taxPercent,
        lineSubtotal: item.lineSubtotal,
        lineTax: item.lineTax,
        lineTotal: item.lineTotal,
      })),
    );
    await tx
      .update(quotes)
      .set({
        status: "convertida",
        convertedOrderId: orderId,
        updatedBy: actor.userId,
        updatedAt: new Date(),
      })
      .where(eq(quotes.id, id));
    await recordActivity(tx, {
      actorUserId: actor.userId,
      actorName: actor.name,
      action: "converted",
      entityType: "quote",
      entityId: id,
      entityLabel: `${current.number} → ${number}`,
      parentEntityType: "customer",
      parentEntityId: current.customerId,
      previousValue: { status: current.status },
      newValue: {
        status: "convertida",
        orderId,
        orderNumber: number,
        origin,
        engineeringRequestId: engineering?.id ?? null,
      },
    });
    await recordActivity(tx, {
      actorUserId: actor.userId,
      actorName: actor.name,
      action: "created",
      entityType: "order",
      entityId: orderId,
      entityLabel: number,
      parentEntityType: "customer",
      parentEntityId: current.customerId,
    });
  });

  return { id, orderId };
}

export async function duplicateQuote(id: string, actor: Actor) {
  const current = await loadQuoteRow(id);
  const items = await loadItems(id);
  const newId = crypto.randomUUID();
  const now = new Date();
  const year = now.getFullYear();

  await db.transaction(async (tx) => {
    const number = await nextDocumentNumber(tx, "quotes", `COT-${year}-`);
    await tx.insert(quotes).values({
      id: newId,
      number,
      customerId: current.customerId,
      contactId: current.contactId,
      ownerUserId: actor.userId,
      issueDate: now,
      validUntil: current.validUntil,
      currency: current.currency,
      paymentTerms: current.paymentTerms,
      leadTime: current.leadTime,
      notes: current.notes,
      rfqType: current.rfqType,
      requiresEngineering: current.requiresEngineering,
      engineeringType: current.engineeringType,
      engineeringStatus: current.requiresEngineering ? "pendiente" : "no_requerida",
      status: "borrador",
      isDemo: current.isDemo,
      createdBy: actor.userId,
      updatedBy: actor.userId,
    });
    if (items.length > 0) {
      await tx.insert(quoteItems).values(
        items.map((item) => ({
          ...item,
          id: crypto.randomUUID(),
          quoteId: newId,
          createdAt: now,
          updatedAt: now,
        })),
      );
    }
    await persistTotals(tx, newId);
    await ensureEngineeringRequestForQuote(
      tx,
      {
        id: newId,
        customerId: current.customerId,
        number,
        notes: current.notes,
        isDemo: current.isDemo,
        requiresEngineering: current.requiresEngineering,
        engineeringType: current.engineeringType,
      },
      actor,
    );
    await recordActivity(tx, {
      actorUserId: actor.userId,
      actorName: actor.name,
      action: "created",
      entityType: "quote",
      entityId: newId,
      entityLabel: `${number} (copia de ${current.number})`,
      parentEntityType: "customer",
      parentEntityId: current.customerId,
    });
  });

  return { id: newId };
}

export async function getQuoteById(id: string) {
  await expireOverdueQuotes();
  const [row] = await db
    .select({
      quote: quotes,
      customerCode: customers.code,
      customerName: customers.legalName,
      customerIsDemo: customers.isDemo,
      contactName: contacts.name,
      orderNumber: orders.number,
    })
    .from(quotes)
    .innerJoin(customers, eq(quotes.customerId, customers.id))
    .leftJoin(contacts, eq(quotes.contactId, contacts.id))
    .leftJoin(orders, eq(quotes.convertedOrderId, orders.id))
    .where(eq(quotes.id, id))
    .limit(1);

  if (!row) return null;

  const items = await loadItems(id);
  const files = await db
    .select()
    .from(documents)
    .where(and(eq(documents.entityType, "quote"), eq(documents.entityId, id)))
    .orderBy(desc(documents.createdAt));
  const engineering = await getActiveEngineeringByQuoteId(id);

  return {
    ...row.quote,
    customerCode: row.customerCode,
    customerName: row.customerName,
    customerIsDemo: row.customerIsDemo,
    contactName: row.contactName,
    orderNumber: row.orderNumber,
    items,
    documents: files,
    engineering,
    expiredNow: isQuoteExpired(row.quote.status, row.quote.validUntil),
  };
}

export type QuoteListQuery = {
  q?: string;
  status?: QuoteStatus;
  rfqType?: RfqType;
  engineeringStatus?: QuoteEngineeringStatus;
  requiresEngineering?: boolean;
  customerId?: string;
  page?: number;
};

export async function listQuotes(query: QuoteListQuery) {
  await expireOverdueQuotes();
  const page = Math.max(1, query.page ?? 1);
  const filters = [isNull(quotes.deletedAt)];
  if (query.status) filters.push(eq(quotes.status, query.status));
  if (query.rfqType) filters.push(eq(quotes.rfqType, query.rfqType));
  if (query.engineeringStatus) {
    filters.push(eq(quotes.engineeringStatus, query.engineeringStatus));
  }
  if (query.requiresEngineering !== undefined) {
    filters.push(eq(quotes.requiresEngineering, query.requiresEngineering));
  }
  if (query.customerId) filters.push(eq(quotes.customerId, query.customerId));
  if (query.q) {
    const term = `%${query.q}%`;
    filters.push(
      or(
        ilike(quotes.number, term),
        ilike(customers.legalName, term),
        ilike(quotes.notes, term),
      )!,
    );
  }
  const where = and(...filters);

  const [totalRow] = await db
    .select({ value: count() })
    .from(quotes)
    .innerJoin(customers, eq(quotes.customerId, customers.id))
    .where(where);

  const rows = await db
    .select({
      id: quotes.id,
      number: quotes.number,
      status: quotes.status,
      currency: quotes.currency,
      total: quotes.total,
      marginPercent: quotes.marginPercent,
      issueDate: quotes.issueDate,
      validUntil: quotes.validUntil,
      isDemo: quotes.isDemo,
      customerId: quotes.customerId,
      customerName: customers.legalName,
      customerCode: customers.code,
      rfqType: quotes.rfqType,
      requiresEngineering: quotes.requiresEngineering,
      engineeringStatus: quotes.engineeringStatus,
    })
    .from(quotes)
    .innerJoin(customers, eq(quotes.customerId, customers.id))
    .where(where)
    .orderBy(desc(quotes.issueDate), desc(quotes.number))
    .limit(QUOTE_PAGE_SIZE)
    .offset((page - 1) * QUOTE_PAGE_SIZE);

  const total = Number(totalRow.value);
  return {
    rows,
    total,
    page,
    pageSize: QUOTE_PAGE_SIZE,
    pageCount: Math.max(1, Math.ceil(total / QUOTE_PAGE_SIZE)),
  };
}

export async function listQuotesByCustomer(customerId: string) {
  await expireOverdueQuotes();
  return db
    .select({
      id: quotes.id,
      number: quotes.number,
      status: quotes.status,
      total: quotes.total,
      currency: quotes.currency,
      issueDate: quotes.issueDate,
      isDemo: quotes.isDemo,
    })
    .from(quotes)
    .where(and(eq(quotes.customerId, customerId), isNull(quotes.deletedAt)))
    .orderBy(desc(quotes.issueDate));
}

export async function getQuoteDashboardStats() {
  await expireOverdueQuotes();
  const openStatuses: QuoteStatus[] = ["borrador", "en_revision", "enviada"];
  const now = new Date();
  const inSevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [openRow] = await db
    .select({ value: count() })
    .from(quotes)
    .where(
      and(
        isNull(quotes.deletedAt),
        or(...openStatuses.map((status) => eq(quotes.status, status))),
      ),
    );

  const [expiringRow] = await db
    .select({ value: count() })
    .from(quotes)
    .where(
      and(
        isNull(quotes.deletedAt),
        eq(quotes.status, "enviada"),
        isNotNull(quotes.validUntil),
        gte(quotes.validUntil, now),
        lte(quotes.validUntil, inSevenDays),
      ),
    );

  const [convertedRow] = await db
    .select({ value: count() })
    .from(quotes)
    .where(
      and(
        isNull(quotes.deletedAt),
        eq(quotes.status, "convertida"),
        gte(quotes.updatedAt, monthStart),
      ),
    );

  return {
    open: Number(openRow.value),
    expiringSoon: Number(expiringRow.value),
    convertedThisMonth: Number(convertedRow.value),
  };
}
