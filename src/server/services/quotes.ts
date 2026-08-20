import "server-only";

import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  isNotNull,
  isNull,
  lt,
  lte,
  or,
  sql,
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
import { resolvePageSize } from "@/lib/ui/pagination";
import {
  PAYMENT_TERM_LABELS,
  type PaymentTerm,
} from "@/lib/quotes/commercial";
import {
  calculateLineTotals,
  calculateQuoteTotals,
  formatMoney,
  normalizeTaxPercent,
  parseMoney,
  taxPercentForCurrency,
} from "@/lib/quotes/money";
import { isManufacturingItem } from "@/lib/quotes/items";
import type { QuoteItemCosting } from "@/lib/quotes/costing";
import { priceQuoteItemFromErp } from "@/server/services/calculator";
import {
  engineeringEstimateFromExtract,
  extractDrawingFromPdf,
} from "@/lib/quotes/drawing-extract";
import { analyzeDxfBytes } from "@/lib/quotes/dxf-analyze";
import { inferQuoteProcesses } from "@/lib/quotes/infer-processes";
import { matchMaterialFromDrawing } from "@/lib/quotes/match-catalog";
import {
  isEngineeringReleasedForQuote,
  quoteOriginForProduction,
  type QuoteEngineeringStatus,
  type RfqType,
} from "@/lib/quotes/rfq";
import {
  canEditQuote,
  canEditQuoteItems,
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
import {
  branchSnapshotFields,
  requireActiveBranch,
} from "@/server/services/branches";
import type { Actor } from "@/server/services/customers";
import { resolveCustomerShipping } from "@/server/services/customers";
import {
  ensureEngineeringRequestForQuote,
  getActiveEngineeringByQuoteId,
} from "@/server/services/engineering";
import { nextDocumentNumber } from "@/server/services/numbering";
import { insertConvertedOrderWorkOrders } from "@/server/services/production";
import { assertAllowedDocument, uploadQuoteDocument, uploadQuoteItemDocument } from "@/server/services/documents";
import { documentObjectKey, getStorage } from "@/lib/storage";
import {
  drawingSetLabel,
  groupDrawingSets,
  isDrawingFileName,
} from "@/lib/quotes/drawing-sets";
import type { QuoteAgentWireEvent } from "@/lib/quotes/agent-console";
import {
  buildPreviewCosting,
  MARKET_PREVIEW_NOTE,
  scalePreviewItem,
  type QuoteAgentPreview,
} from "@/lib/quotes/market-preview";
import { pdfsFromUploads, runQuotePdfAgent } from "@/server/services/quote-agent";
import { listCalculatorMachines } from "@/server/services/calculator";
import { buildRatesFromMachines } from "@/lib/quotes/rates-from-machines";
import type { MachineCalculatorSpecs } from "@/lib/quotes/center-calculator";

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

async function assertCanEditQuoteItems(quote: {
  id: string;
  status: QuoteStatus;
  rfqType: string;
  engineeringStatus: string;
}) {
  assertEditable(quote.status);
  const engineering = await getActiveEngineeringByQuoteId(quote.id);
  const released = isEngineeringReleasedForQuote({
    engineeringRequestStatus: engineering?.status,
    quoteEngineeringStatus: quote.engineeringStatus,
  });
  if (
    !canEditQuoteItems({
      status: quote.status,
      rfqType: quote.rfqType as RfqType,
      engineeringReleased: released,
    })
  ) {
    throw new AppError(
      "Las partidas se habilitan cuando Ingeniería libera el plano.",
      "QUOTE_ITEMS_LOCKED",
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

function commercialSnapshot(
  branch: Parameters<typeof branchSnapshotFields>[0],
  customer: {
    address: string | null;
    city: string | null;
    state: string | null;
    country: string;
    shippingSameAsBilling: boolean;
    shippingAddress: string | null;
    shippingCity: string | null;
    shippingState: string | null;
    shippingPostalCode: string | null;
    shippingCountry: string | null;
  },
  paymentTerm: PaymentTerm,
) {
  const shipping = resolveCustomerShipping({
    shippingSameAsBilling: customer.shippingSameAsBilling,
    address: customer.address,
    city: customer.city,
    state: customer.state,
    country: customer.country,
    shippingAddress: customer.shippingAddress,
    shippingCity: customer.shippingCity,
    shippingState: customer.shippingState,
    shippingPostalCode: customer.shippingPostalCode,
    shippingCountry: customer.shippingCountry,
  });
  return {
    ...branchSnapshotFields(branch),
    paymentTerm,
    paymentTerms: PAYMENT_TERM_LABELS[paymentTerm],
    shippingAddress: shipping.shippingAddress,
    shippingCity: shipping.shippingCity,
    shippingState: shipping.shippingState,
    shippingPostalCode: shipping.shippingPostalCode,
    shippingCountry: shipping.shippingCountry,
  };
}

export async function createQuote(input: CreateQuoteInput, actor: Actor) {
  const customer = await requireCustomer(input.customerId);
  await requireContact(input.customerId, input.contactId);
  const branch = await requireActiveBranch(input.branchId);
  const id = crypto.randomUUID();
  const now = new Date();
  const issueDate = input.issueDate ?? now;
  const year = issueDate.getFullYear();
  const commercial = commercialSnapshot(branch, customer, input.paymentTerm);

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
      leadTime: input.leadTime ?? null,
      notes: input.notes ?? null,
      addresseeMode: input.addresseeMode,
      ...commercial,
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
  const customer = await requireCustomer(current.customerId);
  const branch = await requireActiveBranch(input.branchId);
  const commercial = commercialSnapshot(branch, customer, input.paymentTerm);

  const next = {
    contactId: input.contactId ?? null,
    issueDate: input.issueDate,
    validUntil: input.validUntil ?? null,
    currency: input.currency,
    leadTime: input.leadTime ?? null,
    notes: input.notes ?? null,
    addresseeMode: input.addresseeMode,
    rfqType: input.rfqType,
    requiresEngineering: input.requiresEngineering,
    engineeringType: input.engineeringType,
    ...commercial,
  };
  const changed = pickChangedFields(
    {
      contactId: current.contactId,
      currency: current.currency,
      paymentTerm: current.paymentTerm,
      branchId: current.branchId,
      addresseeMode: current.addresseeMode,
      rfqType: current.rfqType,
    },
    {
      contactId: next.contactId,
      currency: next.currency,
      paymentTerm: next.paymentTerm,
      branchId: next.branchId,
      addresseeMode: next.addresseeMode,
      rfqType: next.rfqType,
    },
  );

  await db.transaction(async (tx) => {
    await tx
      .update(quotes)
      .set({ ...next, updatedBy: actor.userId, updatedAt: new Date() })
      .where(eq(quotes.id, input.id));
    if (current.currency !== next.currency) {
      const lines = await tx
        .select()
        .from(quoteItems)
        .where(eq(quoteItems.quoteId, input.id));
      for (const line of lines) {
        const taxPercent = normalizeTaxPercent(
          parseMoney(line.taxPercent),
          next.currency,
        );
        const totals = calculateLineTotals({
          quantity: parseMoney(line.quantity),
          unitPrice: parseMoney(line.unitPrice),
          discountPercent: parseMoney(line.discountPercent),
          taxPercent,
          estimatedCost: parseMoney(line.estimatedCost),
        });
        await tx
          .update(quoteItems)
          .set({
            taxPercent: formatMoney(taxPercent),
            ...moneyFields(totals),
            updatedAt: new Date(),
          })
          .where(eq(quoteItems.id, line.id));
      }
      await persistTotals(tx, input.id);
    }
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
      "No se puede archivar una cotización convertida en orden de trabajo.",
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
  await assertCanEditQuoteItems(quote);
  const taxPercent = normalizeTaxPercent(
    input.taxPercent,
    quote.currency,
  );
  const priced = { ...input, taxPercent };
  const totals = calculateLineTotals(priced);
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
      kind: input.kind ?? "pieza",
      description: input.description,
      partNumber: input.partNumber ?? null,
      quantity: formatMoney(input.quantity, 4),
      unit: input.unit,
      unitPrice: formatMoney(input.unitPrice, 4),
      discountPercent: formatMoney(input.discountPercent),
      taxPercent: formatMoney(taxPercent),
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
  await assertCanEditQuoteItems(quote);
  const [current] = await db
    .select()
    .from(quoteItems)
    .where(and(eq(quoteItems.id, input.id), eq(quoteItems.quoteId, input.quoteId)))
    .limit(1);
  if (!current) {
    throw new AppError("La partida no existe.", "QUOTE_ITEM_NOT_FOUND", 404);
  }
  const taxPercent = normalizeTaxPercent(
    input.taxPercent,
    quote.currency,
  );
  const totals = calculateLineTotals({ ...input, taxPercent });

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
        taxPercent: formatMoney(taxPercent),
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

export async function applyQuoteItemCosting(
  input: {
    quoteId: string;
    itemId: string;
    costing: QuoteItemCosting;
  },
  actor: Actor,
) {
  const quote = await loadQuoteRow(input.quoteId);
  await assertCanEditQuoteItems(quote);
  const [current] = await db
    .select()
    .from(quoteItems)
    .where(and(eq(quoteItems.id, input.itemId), eq(quoteItems.quoteId, input.quoteId)))
    .limit(1);
  if (!current) {
    throw new AppError("La partida no existe.", "QUOTE_ITEM_NOT_FOUND", 404);
  }
  const quantity = Number(input.costing.quantity || current.quantity || 1);
  const priced = await priceQuoteItemFromErp({ ...input.costing, quantity });
  const costing: QuoteItemCosting = priced.costing;
  const breakdown = costing.breakdown!;
  const taxPercent = parseMoney(current.taxPercent);
  const totals = calculateLineTotals({
    quantity,
    unitPrice: breakdown.unit_price,
    discountPercent: parseMoney(current.discountPercent),
    taxPercent,
    estimatedCost: 0,
  });
  const nextDescription =
    current.description?.trim() && current.description !== "Nueva partida"
      ? current.description
      : costing.part_name || current.description;
  const nextPart = costing.part_number || current.partNumber;

  await db.transaction(async (tx) => {
    await tx
      .update(quoteItems)
      .set({
        description: nextDescription,
        partNumber: nextPart,
        quantity: formatMoney(quantity, 4),
        unitPrice: formatMoney(breakdown.unit_price, 4),
        estimatedCost: formatMoney(0),
        costing,
        ...moneyFields(totals),
        updatedAt: new Date(),
      })
      .where(eq(quoteItems.id, current.id));
    await persistTotals(tx, input.quoteId);
    await recordActivity(tx, {
      actorUserId: actor.userId,
      actorName: actor.name,
      action: "updated",
      entityType: "quote_item",
      entityId: current.id,
      entityLabel: `${nextDescription} · calculadora`,
      parentEntityType: "quote",
      parentEntityId: input.quoteId,
      newValue: { unitPrice: breakdown.unit_price, quantity },
    });
  });

  return { unitPrice: breakdown.unit_price, breakdown };
}

export async function recalculateQuoteItemFromDrawings(
  input: {
    quoteId: string;
    itemId: string;
    costing?: Partial<QuoteItemCosting>;
  },
  actor: Actor,
) {
  const [current] = await db
    .select()
    .from(quoteItems)
    .where(and(eq(quoteItems.id, input.itemId), eq(quoteItems.quoteId, input.quoteId)))
    .limit(1);
  if (!current) {
    throw new AppError("La partida no existe.", "QUOTE_ITEM_NOT_FOUND", 404);
  }
  const files = await db
    .select()
    .from(documents)
    .where(
      and(eq(documents.entityType, "quote_item"), eq(documents.entityId, current.id)),
    );
  const storage = getStorage();
  const pdfDoc = files.find((file) => file.originalName.toLowerCase().endsWith(".pdf"));
  const dxfDoc = files.find((file) => file.originalName.toLowerCase().endsWith(".dxf"));
  const stored = (current.costing ?? {}) as QuoteItemCosting;
  let extractedPart: string | null = stored.part_number ?? null;
  let extractedName: string | null = stored.part_name ?? null;
  let material = stored.material ?? null;
  let finish = stored.finish ?? null;
  let thickness = stored.thickness_in ?? null;
  let weight = stored.unit_weight_lb ?? null;
  let scrap = stored.scrap_weight_lb ?? null;
  let holes = stored.holes ?? 0;
  let slots = stored.slots ?? 0;
  let bends = stored.bends ?? 0;
  let hems = stored.hem_count ?? 0;
  let netArea = stored.net_area_in2 ?? null;
  let cutLength = stored.cut_length_in ?? null;
  let blankLength = stored.blank_length_in ?? null;
  let cutBasis = stored.cut_length_basis ?? null;
  let cadMeta = stored.cad ?? null;
  let blankWidth = stored.blank_width_in ?? null;

  if (pdfDoc) {
    try {
      const bytes = Buffer.from(await storage.get(pdfDoc.objectKey));
      const extracted = await extractDrawingFromPdf(bytes, pdfDoc.originalName);
      const estimate = engineeringEstimateFromExtract(extracted);
      extractedPart = extracted.part_number ?? extractedPart;
      extractedName = extracted.part_name ?? extractedName;
      material = extracted.material ?? material;
      finish = extracted.finish ?? finish;
      thickness = extracted.thickness_in ?? thickness;
      weight = extracted.unit_weight_lb ?? weight;
      scrap = estimate.scrap_weight_lb ?? scrap;
      holes = extracted.holes ?? holes;
      slots = extracted.slots ?? slots;
      bends = extracted.bends ?? bends;
      hems = extracted.hem_count ?? hems;
      netArea = estimate.net_area_in2 ?? netArea;
      cutLength = estimate.cut_length_in ?? cutLength;
      blankLength = estimate.blank_length_in ?? blankLength;
      cutBasis = estimate.cut_length_basis;
    } catch {
      cutBasis =
        cutBasis ?? "No se pudo leer el PDF. Completa peso, corte y doblez a mano.";
    }
  }
  if (dxfDoc) {
    try {
      const bytes = Buffer.from(await storage.get(dxfDoc.objectKey));
      const dxf = analyzeDxfBytes(bytes);
      if (dxf.ok && dxf.cut_length_in) {
        cutLength = dxf.cut_length_in;
        cutBasis = dxf.note ?? "DXF";
        holes = dxf.holes ?? holes;
        slots = dxf.closed_polylines ?? slots;
        blankLength = dxf.blank_length_in ?? blankLength;
        blankWidth = dxf.blank_width_in ?? blankWidth;
      }
    } catch {
      cutBasis = cutBasis ?? "No se pudo leer el DXF. Completa el corte a mano.";
    }
  }

  const catalogMatch = await matchMaterialFromDrawing({
    materialText: material,
    thicknessIn: thickness,
    blankWidthIn: blankWidth,
    blankLengthIn: blankLength,
  });
  if (catalogMatch?.costPerKg) {
    stored.cost_per_kg = catalogMatch.costPerKg;
  }
  const processes = inferQuoteProcesses({
    cutLengthIn: cutLength,
    bends,
    hemCount: hems,
    finish,
    solids: cadMeta?.solids ?? null,
    holes,
  });

  const costing: QuoteItemCosting = {
    ...stored,
    quantity: Number(input.costing?.quantity ?? current.quantity ?? 1),
    unit_weight_lb: input.costing?.unit_weight_lb ?? weight,
    scrap_weight_lb: input.costing?.scrap_weight_lb ?? scrap,
    net_area_in2: input.costing?.net_area_in2 ?? netArea,
    cut_length_in: input.costing?.cut_length_in ?? cutLength,
    holes: input.costing?.holes ?? holes,
    slots: input.costing?.slots ?? slots,
    bends: input.costing?.bends ?? bends,
    hem_count: input.costing?.hem_count ?? hems,
    thickness_in: input.costing?.thickness_in ?? thickness,
    finish: input.costing?.finish ?? finish,
    material: catalogMatch
      ? `${catalogMatch.materialCode} · ${catalogMatch.materialDescription}`
      : material,
    part_number: extractedPart,
    part_name: extractedName,
    blank_length_in: input.costing?.blank_length_in ?? blankLength,
    blank_width_in: blankWidth,
    cut_length_basis: cutBasis,
    margin_pct: input.costing?.margin_pct ?? stored.margin_pct ?? 30,
    cost_per_kg: catalogMatch?.costPerKg ?? stored.cost_per_kg,
    material_id: catalogMatch?.materialId ?? stored.material_id ?? null,
    material_code: catalogMatch?.materialCode ?? stored.material_code ?? null,
    supplier_id: catalogMatch?.supplierId ?? stored.supplier_id ?? null,
    supplier_name: catalogMatch?.supplierName ?? stored.supplier_name ?? null,
    pieces_per_stock: catalogMatch?.piecesPerStock ?? stored.pieces_per_stock ?? null,
    processes,
    cad: cadMeta,
  };

  return applyQuoteItemCosting(
    { quoteId: input.quoteId, itemId: input.itemId, costing },
    actor,
  );
}

function drawingFileKey(doc: {
  checksumSha256: string | null;
  originalName: string;
  sizeBytes: number;
}) {
  return doc.checksumSha256 || `${doc.originalName}:${doc.sizeBytes}`;
}

async function nextQuoteItemPosition(tx: Tx, quoteId: string) {
  const existing = await tx
    .select({ position: quoteItems.position })
    .from(quoteItems)
    .where(eq(quoteItems.quoteId, quoteId))
    .orderBy(desc(quoteItems.position))
    .limit(1);
  return (existing[0]?.position ?? 0) + 1;
}

async function insertPiezaForDrawings(
  tx: Tx,
  input: {
    id: string;
    quoteId: string;
    description: string;
    partNumber: string | null;
    quantity: number;
    currency: string;
    actor: Actor;
  },
) {
  const position = await nextQuoteItemPosition(tx, input.quoteId);
  const taxPercent = taxPercentForCurrency(input.currency);
  const totals = calculateLineTotals({
    quantity: input.quantity,
    unitPrice: 0,
    discountPercent: 0,
    taxPercent,
    estimatedCost: 0,
  });
  await tx.insert(quoteItems).values({
    id: input.id,
    quoteId: input.quoteId,
    position,
    kind: "pieza",
    description: input.description,
    partNumber: input.partNumber,
    quantity: formatMoney(input.quantity, 4),
    unit: "pza",
    unitPrice: formatMoney(0, 4),
    discountPercent: formatMoney(0),
    taxPercent: formatMoney(taxPercent),
    estimatedCost: formatMoney(0),
    ...moneyFields(totals),
  });
  await recordActivity(tx, {
    actorUserId: input.actor.userId,
    actorName: input.actor.name,
    action: "created",
    entityType: "quote_item",
    entityId: input.id,
    entityLabel: input.description,
    parentEntityType: "quote",
    parentEntityId: input.quoteId,
  });
}

export async function createQuoteItemFromDrawings(
  input: {
    quoteId: string;
    quantity?: number;
    files: { originalName: string; bytes: Buffer }[];
  },
  actor: Actor,
) {
  const quote = await loadQuoteRow(input.quoteId);
  await assertCanEditQuoteItems(quote);
  const files = input.files.filter((file) => file.bytes.byteLength > 0);
  if (files.length === 0) {
    throw new AppError(
      "Sube el plano PDF para generar la partida.",
      "DRAWING_REQUIRED",
      400,
    );
  }
  const quantity = Math.max(1, Number(input.quantity || 1));
  const grouped = groupDrawingSets(files);
  const label = drawingSetLabel(grouped[0] ?? { stem: "", files });
  const storage = getStorage();
  const storedFiles: {
    originalName: string;
    mimeType: string;
    stored: { objectKey: string; sizeBytes: number; checksumSha256: string; backend: "local" | "r2" };
  }[] = [];

  try {
    for (const file of files) {
      const meta = assertAllowedDocument(file.originalName, file.bytes.byteLength);
      const objectKey = documentObjectKey("quote_item", input.quoteId, file.originalName);
      const stored = await storage.put(objectKey, file.bytes);
      storedFiles.push({
        originalName: file.originalName,
        mimeType: meta.mimeType,
        stored,
      });
    }

    const id = crypto.randomUUID();
    await db.transaction(async (tx) => {
      await insertPiezaForDrawings(tx, {
        id,
        quoteId: input.quoteId,
        description: label,
        partNumber: null,
        quantity,
        currency: quote.currency,
        actor,
      });
      for (const file of storedFiles) {
        await tx.insert(documents).values({
          id: crypto.randomUUID(),
          entityType: "quote_item",
          entityId: id,
          originalName: file.originalName,
          mimeType: file.mimeType,
          sizeBytes: file.stored.sizeBytes,
          checksumSha256: file.stored.checksumSha256,
          storageBackend: file.stored.backend,
          objectKey: file.stored.objectKey,
          uploadedBy: actor.userId,
        });
      }
      await persistTotals(tx, input.quoteId);
    });

    try {
      await recalculateQuoteItemFromDrawings(
        { quoteId: input.quoteId, itemId: id, costing: { quantity } },
        actor,
      );
    } catch {
      /* La partida queda creada; el usuario puede calcular a mano. */
    }
    return { id };
  } catch (error) {
    for (const file of storedFiles) {
      await storage.remove(file.stored.objectKey).catch(() => undefined);
    }
    throw error;
  }
}

async function plantRatesForPreview() {
  const machinesForCost = await listCalculatorMachines();
  const built = buildRatesFromMachines(
    machinesForCost.map((row) => ({
      id: row.id,
      name: row.name,
      brand: row.brand,
      model: row.model,
      workCenterCode: row.workCenterCode,
      hourlyCost: row.hourlyCost,
      bendLengthMm: row.bendLengthMm,
      tonnageTon: row.tonnageTon,
      calculatorSpecs: (row.calculatorSpecs ?? null) as MachineCalculatorSpecs | null,
    })),
  );
  return built.rates;
}

function matchPdf(
  pdfs: { originalName: string; bytes: Buffer }[],
  sourceFile?: string | null,
) {
  if (!sourceFile) return pdfs[0];
  const needle = sourceFile.replace(/^.*[\\/]/, "").toLowerCase();
  return (
    pdfs.find((file) => file.originalName.toLowerCase() === needle) ||
    pdfs.find((file) => file.originalName.toLowerCase().includes(needle.replace(/\s+/g, ""))) ||
    pdfs[0]
  );
}

export async function createQuoteAgentPreview(
  input: { quoteId: string; files: { originalName: string; bytes: Buffer }[] },
  actor: Actor,
  onEvent?: (event: QuoteAgentWireEvent) => void,
): Promise<QuoteAgentPreview> {
  const quote = await loadQuoteRow(input.quoteId);
  await assertCanEditQuoteItems(quote);
  onEvent?.({
    kind: "user",
    text: `Calcular preliminar · ${input.files.map((file) => file.originalName).join(", ")}`,
  });
  onEvent?.({ kind: "status", text: "Preparando los PDF…" });
  const pdfs = await pdfsFromUploads(input.files);
  onEvent?.({
    kind: "status",
    text:
      pdfs.length === 1
        ? "1 plano listo. El agente lo está leyendo…"
        : `${pdfs.length} planos listos. El agente los está leyendo…`,
  });
  const { model, extracts } = await runQuotePdfAgent(pdfs, onEvent);
  onEvent?.({ kind: "status", text: "Armando costos de mercado…" });
  const rates = await plantRatesForPreview();
  const items: QuoteAgentPreview["items"] = [];

  for (const extract of extracts) {
    const pdf = matchPdf(pdfs, extract.source_file);
    const uploaded = pdf
      ? await uploadQuoteDocument(
          input.quoteId,
          { originalName: pdf.originalName, bytes: pdf.bytes },
          actor,
        )
      : null;
    const sourceFile = extract.source_file || pdf?.originalName || "plano.pdf";
    items.push({
      id: crypto.randomUUID(),
      sourceFile,
      description: extract.part_name || sourceFile.replace(/\.pdf$/i, ""),
      documentId: uploaded?.id ?? null,
      costing: buildPreviewCosting(extract, rates, 1),
    });
  }

  const preview: QuoteAgentPreview = {
    model,
    createdAt: new Date().toISOString(),
    note: MARKET_PREVIEW_NOTE,
    rates,
    items,
  };
  await db
    .update(quotes)
    .set({ agentPreview: preview, updatedAt: new Date(), updatedBy: actor.userId })
    .where(eq(quotes.id, input.quoteId));
  return preview;
}

export async function updateQuoteAgentPreviewQty(
  input: { quoteId: string; itemId: string; quantity: number },
  actor: Actor,
): Promise<QuoteAgentPreview> {
  const quote = await loadQuoteRow(input.quoteId);
  await assertCanEditQuoteItems(quote);
  const preview = (quote.agentPreview ?? null) as QuoteAgentPreview | null;
  if (!preview) {
    throw new AppError("No hay preliminar. Sube PDF y pulsa Calcular.", "PREVIEW_MISSING", 404);
  }
  const nextItems = preview.items.map((item) =>
    item.id === input.itemId ? scalePreviewItem(item, input.quantity, preview.rates) : item,
  );
  const next = { ...preview, items: nextItems };
  await db
    .update(quotes)
    .set({ agentPreview: next, updatedAt: new Date(), updatedBy: actor.userId })
    .where(eq(quotes.id, input.quoteId));
  return next;
}

export async function confirmQuoteAgentPreview(quoteId: string, actor: Actor) {
  const quote = await loadQuoteRow(quoteId);
  await assertCanEditQuoteItems(quote);
  const preview = (quote.agentPreview ?? null) as QuoteAgentPreview | null;
  if (!preview?.items.length) {
    throw new AppError("No hay preliminar para confirmar.", "PREVIEW_MISSING", 404);
  }

  const quoteDocs = await db
    .select()
    .from(documents)
    .where(and(eq(documents.entityType, "quote"), eq(documents.entityId, quoteId)));
  const storage = getStorage();

  for (const item of preview.items) {
    const id = crypto.randomUUID();
    const quantity = Math.max(1, Number(item.costing.quantity || 1));
    const unitPrice = Number(item.costing.breakdown?.unit_price || 0);
    await db.transaction(async (tx) => {
      await insertPiezaForDrawings(tx, {
        id,
        quoteId,
        description: item.description,
        partNumber: item.costing.part_number ?? null,
        quantity,
        currency: quote.currency,
        actor,
      });
      const taxPercent = taxPercentForCurrency(quote.currency);
      const totals = calculateLineTotals({
        quantity,
        unitPrice,
        discountPercent: 0,
        taxPercent,
        estimatedCost: 0,
      });
      await tx
        .update(quoteItems)
        .set({
          unitPrice: formatMoney(unitPrice, 4),
          costing: item.costing,
          ...moneyFields(totals),
          updatedAt: new Date(),
        })
        .where(eq(quoteItems.id, id));
      await persistTotals(tx, quoteId);
    });

    const doc =
      quoteDocs.find((row) => row.id === item.documentId) ||
      quoteDocs.find(
        (row) => row.originalName.toLowerCase() === item.sourceFile.toLowerCase(),
      );
    if (doc) {
      const bytes = Buffer.from(await storage.get(doc.objectKey));
      await uploadQuoteItemDocument(
        quoteId,
        id,
        { originalName: doc.originalName, bytes },
        actor,
      );
    }
  }

  await db
    .update(quotes)
    .set({ agentPreview: null, updatedAt: new Date(), updatedBy: actor.userId })
    .where(eq(quotes.id, quoteId));
  return { created: preview.items.length };
}

export async function discardQuoteAgentPreview(quoteId: string, actor: Actor) {
  const quote = await loadQuoteRow(quoteId);
  await assertCanEditQuoteItems(quote);
  await db
    .update(quotes)
    .set({ agentPreview: null, updatedAt: new Date(), updatedBy: actor.userId })
    .where(eq(quotes.id, quoteId));
}

export async function materializeQuoteItemsFromEngineering(
  quoteId: string,
  actor: Actor,
) {
  const quote = await loadQuoteRow(quoteId);
  if (!canEditQuote(quote.status)) {
    return { created: 0 };
  }
  await assertCanEditQuoteItems(quote);
  const engineering = await getActiveEngineeringByQuoteId(quoteId);
  if (!engineering) return { created: 0 };

  const engDocs = await db
    .select()
    .from(documents)
    .where(
      and(
        eq(documents.entityType, "engineering_request"),
        eq(documents.entityId, engineering.id),
      ),
    );
  const sets = groupDrawingSets(engDocs.filter((doc) => isDrawingFileName(doc.originalName)));
  if (sets.length === 0) return { created: 0 };

  const items = await loadItems(quoteId);
  const manufacturingIds = items
    .filter((item) => isManufacturingItem(item.kind))
    .map((item) => item.id);
  const existingDocs =
    manufacturingIds.length === 0
      ? []
      : await db
          .select()
          .from(documents)
          .where(
            and(
              eq(documents.entityType, "quote_item"),
              inArray(documents.entityId, manufacturingIds),
            ),
          );
  const usedKeys = new Set(existingDocs.map(drawingFileKey));
  let created = 0;

  for (const set of sets) {
    const keys = set.files.map(drawingFileKey);
    if (keys.some((key) => usedKeys.has(key))) continue;
    const id = crypto.randomUUID();
    await db.transaction(async (tx) => {
      await insertPiezaForDrawings(tx, {
        id,
        quoteId,
        description: drawingSetLabel(set),
        partNumber: null,
        quantity: 1,
        currency: quote.currency,
        actor,
      });
      await cloneDocumentRowsToQuoteItem(tx, id, set.files, actor);
      await persistTotals(tx, quoteId);
    });
    for (const key of keys) usedKeys.add(key);
    try {
      await recalculateQuoteItemFromDrawings(
        { quoteId, itemId: id, costing: { quantity: 1 } },
        actor,
      );
    } catch {
      /* La partida queda con el plano; se puede recalcular después. */
    }
    created += 1;
  }

  return { created };
}

async function cloneDocumentRowsToQuoteItem(
  tx: Tx,
  itemId: string,
  sourceDocs: (typeof documents.$inferSelect)[],
  actor: Actor,
) {
  for (const doc of sourceDocs) {
    await tx.insert(documents).values({
      id: crypto.randomUUID(),
      entityType: "quote_item",
      entityId: itemId,
      originalName: doc.originalName,
      mimeType: doc.mimeType,
      sizeBytes: doc.sizeBytes,
      checksumSha256: doc.checksumSha256,
      storageBackend: doc.storageBackend,
      objectKey: doc.objectKey,
      uploadedBy: actor.userId,
    });
  }
}

export async function deleteQuoteItem(
  id: string,
  quoteId: string,
  actor: Actor,
) {
  const quote = await loadQuoteRow(quoteId);
  await assertCanEditQuoteItems(quote);
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
    const engineering = await getActiveEngineeringByQuoteId(id);
    const ready = canMarkQuoteSent({
      itemCount: items.length,
      itemsHaveUnitPrice: items.every((item) => item.unitPrice !== null),
      rfqType: current.rfqType as RfqType,
      engineeringReleased: isEngineeringReleasedForQuote({
        engineeringRequestStatus: engineering?.status,
        quoteEngineeringStatus: current.engineeringStatus,
      }),
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
      "Solo una cotización aprobada puede convertirse en orden de trabajo.",
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
        "Esta RFQ requiere ingeniería liberada antes de convertir a orden de trabajo.",
        "ENGINEERING_NOT_RELEASED",
        409,
      );
    }
  }

  const orderId = crypto.randomUUID();
  const year = new Date().getFullYear();
  const origin = quoteOriginForProduction(current.requiresEngineering);
  const promisedDate =
    current.validUntil ??
    new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
  const createdItems = items.map((item) => ({
    quoteItemId: item.id,
    orderItemId: crypto.randomUUID(),
    position: item.position,
    kind: item.kind,
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
  }));

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
      status: "pendiente",
      ownerUserId: current.ownerUserId,
      projectId: current.projectId,
      notes: current.notes,
      branchId: current.branchId,
      promisedDate,
      isDemo: current.isDemo,
      createdBy: actor.userId,
      updatedBy: actor.userId,
    });
    await tx.insert(orderItems).values(
      createdItems.map((item) => ({
        id: item.orderItemId,
        orderId,
        position: item.position,
        kind: item.kind,
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
    await insertConvertedOrderWorkOrders(tx, {
      orderId,
      orderNumber: number,
      customerId: current.customerId,
      quoteId: current.id,
      engineeringRequestId:
        engineering?.status === "liberado" ? engineering.id : null,
      origin,
      isDemo: current.isDemo,
      promisedDate,
      actor,
      items: createdItems,
    });
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
      contactPhone: contacts.phone,
      contactTitle: contacts.title,
      contactDepartment: contacts.department,
      orderId: orders.id,
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
  const itemDocs =
    items.length === 0
      ? []
      : await db
          .select()
          .from(documents)
          .where(
            and(
              eq(documents.entityType, "quote_item"),
              inArray(
                documents.entityId,
                items.map((item) => item.id),
              ),
            ),
          )
          .orderBy(desc(documents.createdAt));
  const docsByItem = new Map<string, typeof itemDocs>();
  for (const doc of itemDocs) {
    const list = docsByItem.get(doc.entityId) ?? [];
    list.push(doc);
    docsByItem.set(doc.entityId, list);
  }
  const files = await db
    .select()
    .from(documents)
    .where(and(eq(documents.entityType, "quote"), eq(documents.entityId, id)))
    .orderBy(desc(documents.createdAt));
  const engineering = await getActiveEngineeringByQuoteId(id);
  const engineeringDocuments = engineering
    ? await db
        .select()
        .from(documents)
        .where(
          and(
            eq(documents.entityType, "engineering_request"),
            eq(documents.entityId, engineering.id),
          ),
        )
        .orderBy(desc(documents.createdAt))
    : [];

  return {
    ...row.quote,
    customerCode: row.customerCode,
    customerName: row.customerName,
    customerIsDemo: row.customerIsDemo,
    contactName: row.contactName,
    contactPhone: row.contactPhone,
    contactTitle: row.contactTitle,
    contactDepartment: row.contactDepartment,
    orderId: row.orderId,
    orderNumber: row.orderNumber,
    items: items.map((item) => ({
      ...item,
      documents: docsByItem.get(item.id) ?? [],
    })),
    documents: files,
    engineeringDocuments,
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
  pageSize?: number;
};

export async function listQuotes(query: QuoteListQuery) {
  await expireOverdueQuotes();
  const page = Math.max(1, query.page ?? 1);
  const pageSize = resolvePageSize(query.pageSize);
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
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  const total = Number(totalRow.value);
  return {
    rows,
    total,
    page,
    pageSize,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
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
      drawingCount: sql<number>`coalesce((
        select count(*)::int from quote_items qi
        where qi.quote_id = ${quotes.id} and qi.kind = 'pieza'
      ), 0)`,
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
