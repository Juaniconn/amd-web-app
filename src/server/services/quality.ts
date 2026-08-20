import "server-only";

import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  customers,
  ncrs,
  productionOrders,
  qualityInspections,
} from "@/db/schema";
import { AppError } from "@/lib/errors";
import { formatQty } from "@/lib/inventory/catalog";
import {
  canTransitionNcr,
  INSPECTION_RESULT_LABELS,
  INSPECTION_TYPE_LABELS,
  NCR_STATUS_LABELS,
  type InspectionResult,
  type NcrStatus,
} from "@/lib/quality/catalog";
import { qualityPhysicalCloseState } from "@/lib/quality/gate";
import type {
  ChangeNcrStatusInput,
  CreateInspectionInput,
  CreateNcrInput,
} from "@/lib/validation/quality";
import { recordActivity } from "@/server/services/activity";
import type { Actor } from "@/server/services/customers";
import { nextDocumentNumber } from "@/server/services/numbering";
import { resolvePageSize } from "@/lib/ui/pagination";

function yearPrefix(prefix: string) {
  return `${prefix}${new Date().getFullYear()}-`;
}

export async function listProductionOrdersForQuality() {
  return db
    .select({
      id: productionOrders.id,
      number: productionOrders.number,
      partNumber: productionOrders.partNumber,
      status: productionOrders.status,
      customerName: customers.legalName,
    })
    .from(productionOrders)
    .innerJoin(customers, eq(customers.id, productionOrders.customerId))
    .orderBy(desc(productionOrders.createdAt))
    .limit(200);
}

export async function listInspectionOptions() {
  return db
    .select({
      id: qualityInspections.id,
      number: qualityInspections.number,
      productionOrderId: qualityInspections.productionOrderId,
    })
    .from(qualityInspections)
    .orderBy(desc(qualityInspections.inspectedAt))
    .limit(200);
}

export async function listInspections(input?: { q?: string; page?: number; pageSize?: number }) {
  const page = Math.max(1, input?.page ?? 1);
  const pageSize = resolvePageSize(input?.pageSize);
  const filters = [];
  if (input?.q) {
    const term = `%${input.q}%`;
    filters.push(
      or(
        ilike(qualityInspections.number, term),
        ilike(productionOrders.number, term),
        ilike(productionOrders.partNumber, term),
        ilike(customers.legalName, term),
      ),
    );
  }
  const where = filters.length ? and(...filters) : undefined;
  const [countRow] = await db
    .select({ value: sql<number>`count(*)::int` })
    .from(qualityInspections)
    .innerJoin(
      productionOrders,
      eq(productionOrders.id, qualityInspections.productionOrderId),
    )
    .innerJoin(customers, eq(customers.id, productionOrders.customerId))
    .where(where);
  const rows = await db
    .select({
      id: qualityInspections.id,
      number: qualityInspections.number,
      type: qualityInspections.type,
      result: qualityInspections.result,
      inspectedAt: qualityInspections.inspectedAt,
      qtyInspected: qualityInspections.qtyInspected,
      qtyRejected: qualityInspections.qtyRejected,
      productionOrderId: qualityInspections.productionOrderId,
      otNumber: productionOrders.number,
      partNumber: productionOrders.partNumber,
      customerName: customers.legalName,
    })
    .from(qualityInspections)
    .innerJoin(
      productionOrders,
      eq(productionOrders.id, qualityInspections.productionOrderId),
    )
    .innerJoin(customers, eq(customers.id, productionOrders.customerId))
    .where(where)
    .orderBy(
      sql`case when ${qualityInspections.result} = 'pendiente' then 0 else 1 end`,
      desc(qualityInspections.createdAt),
    )
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

export async function listInspectionsForOrder(productionOrderId: string) {
  return db
    .select()
    .from(qualityInspections)
    .where(eq(qualityInspections.productionOrderId, productionOrderId))
    .orderBy(desc(qualityInspections.inspectedAt));
}

export async function getQualityCloseState(productionOrderId: string) {
  const finals = await db
    .select({
      inspectedAt: qualityInspections.inspectedAt,
      result: qualityInspections.result,
    })
    .from(qualityInspections)
    .where(
      and(
        eq(qualityInspections.productionOrderId, productionOrderId),
        eq(qualityInspections.type, "final"),
      ),
    );
  return qualityPhysicalCloseState(finals);
}

export async function assertCanPhysicallyClose(productionOrderId: string) {
  const state = await getQualityCloseState(productionOrderId);
  if (state.blocked) {
    throw new AppError(
      state.warning ?? "La inspección final está rechazada.",
      "QUALITY_FINAL_REJECTED",
      409,
    );
  }
}

export async function getInspectionById(id: string) {
  const [row] = await db
    .select({
      inspection: qualityInspections,
      otNumber: productionOrders.number,
      productionPartNumber: productionOrders.partNumber,
      customerName: customers.legalName,
    })
    .from(qualityInspections)
    .innerJoin(
      productionOrders,
      eq(productionOrders.id, qualityInspections.productionOrderId),
    )
    .innerJoin(customers, eq(customers.id, productionOrders.customerId))
    .where(eq(qualityInspections.id, id))
    .limit(1);
  if (!row) return null;
  return {
    ...row.inspection,
    otNumber: row.otNumber,
    partNumber: row.inspection.partNumber || row.productionPartNumber,
    customerName: row.customerName,
  };
}

export async function createInspection(
  input: Pick<
    CreateInspectionInput,
    | "productionOrderId"
    | "type"
    | "result"
    | "qtyInspected"
    | "qtyAccepted"
    | "qtyRejected"
  > &
    Partial<CreateInspectionInput>,
  actor: Actor,
) {
  const [ot] = await db
    .select({
      id: productionOrders.id,
      number: productionOrders.number,
      partNumber: productionOrders.partNumber,
    })
    .from(productionOrders)
    .where(eq(productionOrders.id, input.productionOrderId))
    .limit(1);
  if (!ot) {
    throw new AppError("La orden de trabajo no existe.", "OT_NOT_FOUND", 404);
  }
  const id = crypto.randomUUID();
  const created = await db.transaction(async (tx) => {
    const number = await nextDocumentNumber(
      tx,
      "quality_inspections",
      yearPrefix("INSP-"),
    );
    await tx.insert(qualityInspections).values({
      id,
      number,
      productionOrderId: ot.id,
      type: input.type,
      inspectorUserId: actor.userId,
      inspectedAt: input.inspectedAt ? new Date(input.inspectedAt) : new Date(),
      partNumber: input.partNumber ?? ot.partNumber,
      qtyInspected: formatQty(input.qtyInspected),
      qtyAccepted: formatQty(input.qtyAccepted),
      qtyRejected: formatQty(input.qtyRejected),
      result: input.result,
      notes: input.notes ?? null,
      createdBy: actor.userId,
    });
    await recordActivity(tx, {
      actorUserId: actor.userId,
      actorName: actor.name,
      action: "created",
      entityType: "quality_inspection",
      entityId: id,
      entityLabel: `${number} · ${ot.number} · ${INSPECTION_TYPE_LABELS[input.type]} · ${INSPECTION_RESULT_LABELS[input.result as InspectionResult]}`,
      parentEntityType: "production_order",
      parentEntityId: ot.id,
    });
    return { id, number };
  });
  return created;
}

export async function ensureInspectionDraft(
  productionOrderId: string,
  actor: Actor,
) {
  const [existing] = await db
    .select({ id: qualityInspections.id, result: qualityInspections.result })
    .from(qualityInspections)
    .where(eq(qualityInspections.productionOrderId, productionOrderId))
    .orderBy(desc(qualityInspections.createdAt))
    .limit(1);
  if (existing && existing.result === "pendiente") {
    return { id: existing.id, created: false };
  }
  const [ot] = await db
    .select({
      id: productionOrders.id,
      number: productionOrders.number,
      partNumber: productionOrders.partNumber,
      quantity: productionOrders.quantity,
    })
    .from(productionOrders)
    .where(eq(productionOrders.id, productionOrderId))
    .limit(1);
  if (!ot) return { id: null, created: false };
  return createInspection(
    {
      productionOrderId: ot.id,
      type: "final",
      partNumber: ot.partNumber ?? undefined,
      qtyInspected: Number(ot.quantity || 1),
      qtyAccepted: 0,
      qtyRejected: 0,
      result: "pendiente",
      notes: "Solicitud automática al enviar el número de parte a Calidad.",
    },
    actor,
  ).then((created) => ({ id: created.id, created: true }));
}

export async function resolveInspection(
  input: { id: string; result: "aprobado" | "rechazado"; notes?: string },
  actor: Actor,
) {
  const inspection = await getInspectionById(input.id);
  if (!inspection) {
    throw new AppError("La inspección no existe.", "INSPECTION_NOT_FOUND", 404);
  }
  if (inspection.result !== "pendiente") {
    throw new AppError("Esta inspección ya tiene veredicto.", "INSPECTION_CLOSED", 409);
  }
  const qty = Number(inspection.qtyInspected || 0);
  await db
    .update(qualityInspections)
    .set({
      result: input.result,
      qtyAccepted: formatQty(input.result === "aprobado" ? qty : 0),
      qtyRejected: formatQty(input.result === "rechazado" ? qty : 0),
      notes: input.notes ?? inspection.notes,
      inspectorUserId: actor.userId,
      inspectedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(qualityInspections.id, input.id));
  await recordActivity(db, {
    actorUserId: actor.userId,
    actorName: actor.name,
    action: "updated",
    entityType: "quality_inspection",
    entityId: input.id,
    entityLabel: `${inspection.number} · ${INSPECTION_RESULT_LABELS[input.result]}`,
    parentEntityType: "production_order",
    parentEntityId: inspection.productionOrderId,
  });

  const nextProductionStatus =
    input.result === "aprobado" ? "terminada" : "en_produccion";
  const moved = await db
    .update(productionOrders)
    .set({
      status: nextProductionStatus,
      updatedBy: actor.userId,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(productionOrders.id, inspection.productionOrderId),
        eq(productionOrders.status, "calidad"),
      ),
    )
    .returning({ id: productionOrders.id });
  if (moved.length > 0) {
    await recordActivity(db, {
      actorUserId: actor.userId,
      actorName: actor.name,
      action: input.result === "aprobado" ? "closed" : "status_changed",
      entityType: "production_order",
      entityId: inspection.productionOrderId,
      entityLabel: `${inspection.otNumber} (${input.result === "aprobado" ? "Calidad → Terminada" : "Calidad → Retrabajo"})`,
      previousValue: { status: "calidad" },
      newValue: { status: nextProductionStatus, inspectionId: input.id },
    });
  }
  return { id: input.id };
}

export async function listNcrs(input?: { q?: string; page?: number; pageSize?: number }) {
  const page = Math.max(1, input?.page ?? 1);
  const pageSize = resolvePageSize(input?.pageSize);
  const filters = [];
  if (input?.q) {
    const term = `%${input.q}%`;
    filters.push(
      or(
        ilike(ncrs.number, term),
        ilike(productionOrders.number, term),
        ilike(productionOrders.partNumber, term),
        ilike(customers.legalName, term),
      ),
    );
  }
  const where = filters.length ? and(...filters) : undefined;
  const [countRow] = await db
    .select({ value: sql<number>`count(*)::int` })
    .from(ncrs)
    .innerJoin(productionOrders, eq(productionOrders.id, ncrs.productionOrderId))
    .innerJoin(customers, eq(customers.id, productionOrders.customerId))
    .where(where);
  const rows = await db
    .select({
      id: ncrs.id,
      number: ncrs.number,
      status: ncrs.status,
      cause: ncrs.cause,
      createdAt: ncrs.createdAt,
      productionOrderId: ncrs.productionOrderId,
      otNumber: productionOrders.number,
      partNumber: productionOrders.partNumber,
      customerName: customers.legalName,
      inspectionNumber: qualityInspections.number,
    })
    .from(ncrs)
    .innerJoin(productionOrders, eq(productionOrders.id, ncrs.productionOrderId))
    .innerJoin(customers, eq(customers.id, productionOrders.customerId))
    .leftJoin(qualityInspections, eq(qualityInspections.id, ncrs.inspectionId))
    .where(where)
    .orderBy(desc(ncrs.createdAt))
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

export async function getNcrById(id: string) {
  const [row] = await db
    .select({
      ncr: ncrs,
      otNumber: productionOrders.number,
      partNumber: productionOrders.partNumber,
      customerName: customers.legalName,
      inspectionNumber: qualityInspections.number,
    })
    .from(ncrs)
    .innerJoin(productionOrders, eq(productionOrders.id, ncrs.productionOrderId))
    .innerJoin(customers, eq(customers.id, productionOrders.customerId))
    .leftJoin(qualityInspections, eq(qualityInspections.id, ncrs.inspectionId))
    .where(eq(ncrs.id, id))
    .limit(1);
  if (!row) return null;
  return {
    ...row.ncr,
    otNumber: row.otNumber,
    partNumber: row.partNumber,
    customerName: row.customerName,
    inspectionNumber: row.inspectionNumber,
  };
}

export async function createNcr(input: CreateNcrInput, actor: Actor) {
  const [ot] = await db
    .select({ id: productionOrders.id, number: productionOrders.number })
    .from(productionOrders)
    .where(eq(productionOrders.id, input.productionOrderId))
    .limit(1);
  if (!ot) {
    throw new AppError("La orden de trabajo no existe.", "OT_NOT_FOUND", 404);
  }
  const id = crypto.randomUUID();
  return db.transaction(async (tx) => {
    const number = await nextDocumentNumber(tx, "ncrs", yearPrefix("NCR-"));
    await tx.insert(ncrs).values({
      id,
      number,
      productionOrderId: ot.id,
      inspectionId: input.inspectionId ?? null,
      cause: input.cause ?? null,
      disposition: input.disposition ?? null,
      notes: input.notes ?? null,
      createdBy: actor.userId,
      updatedBy: actor.userId,
    });
    await recordActivity(tx, {
      actorUserId: actor.userId,
      actorName: actor.name,
      action: "created",
      entityType: "ncr",
      entityId: id,
      entityLabel: `${number} · ${ot.number}`,
      parentEntityType: "production_order",
      parentEntityId: ot.id,
    });
    return { id, number };
  });
}

export async function changeNcrStatus(input: ChangeNcrStatusInput, actor: Actor) {
  const existing = await getNcrById(input.id);
  if (!existing) {
    throw new AppError("El NCR no existe.", "NCR_NOT_FOUND", 404);
  }
  const from = existing.status as NcrStatus;
  if (!canTransitionNcr(from, input.status)) {
    throw new AppError(
      `No se puede pasar de ${NCR_STATUS_LABELS[from]} a ${NCR_STATUS_LABELS[input.status]}.`,
      "NCR_INVALID_TRANSITION",
      409,
    );
  }
  await db
    .update(ncrs)
    .set({
      status: input.status,
      cause: input.cause ?? existing.cause,
      disposition: input.disposition ?? existing.disposition,
      notes: input.notes ?? existing.notes,
      updatedBy: actor.userId,
      updatedAt: new Date(),
    })
    .where(eq(ncrs.id, input.id));
  await recordActivity(db, {
    actorUserId: actor.userId,
    actorName: actor.name,
    action:
      input.status === "cerrada"
        ? "closed"
        : input.status === "cancelada"
          ? "cancelled"
          : "status_changed",
    entityType: "ncr",
    entityId: input.id,
    entityLabel: `${existing.number} (${NCR_STATUS_LABELS[from]} → ${NCR_STATUS_LABELS[input.status]})`,
    parentEntityType: "production_order",
    parentEntityId: existing.productionOrderId,
  });
}
