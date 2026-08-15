import "server-only";

import {
  and,
  asc,
  avg,
  count,
  desc,
  eq,
  gte,
  inArray,
  isNotNull,
  isNull,
  lt,
  or,
  sql,
  sum,
} from "drizzle-orm";
import { db } from "@/db";
import {
  customers,
  engineeringHours,
  engineeringRequests,
  quoteItems,
  quotes,
  users,
} from "@/db/schema";
import { pickChangedFields } from "@/lib/audit/activity";
import {
  canEditEngineering,
  canLogEngineeringHours,
  canTransitionEngineering,
  ENGINEERING_STATUS_LABELS,
  isOpenEngineeringStatus,
  quoteEngineeringStatusFromRequest,
  type EngineeringStatus,
} from "@/lib/engineering/status";
import { AppError } from "@/lib/errors";
import { durationMinutes } from "@/lib/production/catalog";
import {
  ENGINEERING_SERVICE_DESCRIPTION,
  ENGINEERING_SERVICE_UNIT,
} from "@/lib/quotes/items";
import {
  calculateLineTotals,
  calculateQuoteTotals,
  formatMoney,
  parseMoney,
  taxPercentForCurrency,
} from "@/lib/quotes/money";
import type { QuoteEngineeringType } from "@/lib/quotes/rfq";
import type {
  AssignEngineeringInput,
  CreateEngineeringRequestInput,
  LogEngineeringHoursInput,
  StartEngineeringHoursInput,
  StopEngineeringHoursInput,
  UpdateEngineeringRequestInput,
} from "@/lib/validation/engineering";
import { recordActivity } from "@/server/services/activity";
import type { Actor } from "@/server/services/customers";
import { listEngineeringDocuments } from "@/server/services/documents";
import { nextDocumentNumber } from "@/server/services/numbering";

export const ENGINEERING_PAGE_SIZE = 20;

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function loadRequestRow(id: string) {
  const [row] = await db
    .select()
    .from(engineeringRequests)
    .where(eq(engineeringRequests.id, id))
    .limit(1);
  if (!row || row.deletedAt) {
    throw new AppError(
      "La solicitud de ingeniería no existe.",
      "ENGINEERING_NOT_FOUND",
      404,
    );
  }
  return row;
}

export async function getActiveEngineeringByQuoteId(
  quoteId: string,
  executor: Pick<typeof db, "select"> = db,
) {
  const [row] = await executor
    .select()
    .from(engineeringRequests)
    .where(
      and(
        eq(engineeringRequests.quoteId, quoteId),
        isNull(engineeringRequests.deletedAt),
      ),
    )
    .limit(1);
  return row ?? null;
}

async function syncQuoteEngineeringStatus(
  tx: Tx,
  quoteId: string,
  status: EngineeringStatus | "no_requerida",
) {
  await tx
    .update(quotes)
    .set({
      engineeringStatus:
        status === "no_requerida"
          ? "no_requerida"
          : quoteEngineeringStatusFromRequest(status),
      updatedAt: new Date(),
    })
    .where(eq(quotes.id, quoteId));
}

async function insertEngineeringRequest(
  tx: Tx,
  input: {
    id: string;
    quoteId: string;
    customerId: string;
    description: string;
    notes?: string | null;
    projectType: QuoteEngineeringType;
    priority: "baja" | "media" | "alta";
    dueDate?: Date | null;
    assigneeUserId?: string | null;
    isDemo: boolean;
  },
  actor: Actor,
) {
  const year = new Date().getFullYear();
  const number = await nextDocumentNumber(tx, "engineering_requests", `ING-${year}-`);
  const now = new Date();
  const assigned = Boolean(input.assigneeUserId);
  await tx.insert(engineeringRequests).values({
    id: input.id,
    number,
    customerId: input.customerId,
    quoteId: input.quoteId,
    assigneeUserId: input.assigneeUserId ?? null,
    description: input.description,
    notes: input.notes ?? null,
    projectType: input.projectType,
    priority: input.priority,
    dueDate: input.dueDate ?? null,
    status: assigned ? "asignado" : "pendiente",
    assignedAt: assigned ? now : null,
    isDemo: input.isDemo,
    createdBy: actor.userId,
    updatedBy: actor.userId,
  });
  await tx
    .update(quotes)
    .set({
      requiresEngineering: true,
      engineeringType: input.projectType,
      engineeringStatus: assigned ? "en_proceso" : "pendiente",
      updatedAt: now,
    })
    .where(eq(quotes.id, input.quoteId));
  await recordActivity(tx, {
    actorUserId: actor.userId,
    actorName: actor.name,
    action: "created",
    entityType: "engineering_request",
    entityId: input.id,
    entityLabel: number,
    parentEntityType: "quote",
    parentEntityId: input.quoteId,
    newValue: { number, quoteId: input.quoteId },
  });
  await ensureEngineeringServiceLine(tx, input.quoteId);
  return number;
}

async function ensureEngineeringServiceLine(tx: Tx, quoteId: string) {
  const [quote] = await tx
    .select()
    .from(quotes)
    .where(eq(quotes.id, quoteId))
    .limit(1);
  if (!quote) return;
  const existing = await tx
    .select({ id: quoteItems.id })
    .from(quoteItems)
    .where(
      and(
        eq(quoteItems.quoteId, quoteId),
        eq(quoteItems.kind, "servicio_ingenieria"),
      ),
    )
    .limit(1);
  if (existing[0]) return;

  const last = await tx
    .select({ position: quoteItems.position })
    .from(quoteItems)
    .where(eq(quoteItems.quoteId, quoteId))
    .orderBy(desc(quoteItems.position))
    .limit(1);
  const taxPercent = taxPercentForCurrency(quote.currency);
  const totals = calculateLineTotals({
    quantity: 1,
    unitPrice: 0,
    discountPercent: 0,
    taxPercent,
    estimatedCost: 0,
  });
  await tx.insert(quoteItems).values({
    id: crypto.randomUUID(),
    quoteId,
    position: (last[0]?.position ?? 0) + 1,
    kind: "servicio_ingenieria",
    description: ENGINEERING_SERVICE_DESCRIPTION,
    quantity: formatMoney(1, 4),
    unit: ENGINEERING_SERVICE_UNIT,
    unitPrice: formatMoney(0, 4),
    discountPercent: formatMoney(0),
    taxPercent: formatMoney(taxPercent),
    estimatedCost: formatMoney(0, 4),
    lineSubtotal: formatMoney(totals.lineSubtotal),
    lineTax: formatMoney(totals.lineTax),
    lineTotal: formatMoney(totals.lineTotal),
    lineEstimatedCost: formatMoney(totals.lineEstimatedCost),
    lineProfit: formatMoney(totals.lineProfit),
    lineMarginPercent:
      totals.lineMarginPercent === null ? null : formatMoney(totals.lineMarginPercent),
  });
  const items = await tx
    .select()
    .from(quoteItems)
    .where(eq(quoteItems.quoteId, quoteId));
  const header = calculateQuoteTotals(
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
      subtotal: formatMoney(header.subtotal),
      taxTotal: formatMoney(header.taxTotal),
      total: formatMoney(header.total),
      estimatedCost: formatMoney(header.estimatedCost),
      estimatedProfit: formatMoney(header.estimatedProfit),
      marginPercent:
        header.marginPercent === null ? null : formatMoney(header.marginPercent),
      updatedAt: new Date(),
    })
    .where(eq(quotes.id, quoteId));
}

export async function ensureEngineeringRequestForQuote(
  tx: Tx,
  quote: {
    id: string;
    customerId: string;
    number: string;
    notes: string | null;
    isDemo: boolean;
    requiresEngineering: boolean;
    engineeringType: QuoteEngineeringType | null;
  },
  actor: Actor,
) {
  const existing = await getActiveEngineeringByQuoteId(quote.id, tx);
  if (!quote.requiresEngineering) {
    if (existing && existing.status === "pendiente") {
      await tx
        .update(engineeringRequests)
        .set({
          status: "cancelado",
          cancelledAt: new Date(),
          updatedBy: actor.userId,
          updatedAt: new Date(),
        })
        .where(eq(engineeringRequests.id, existing.id));
      await syncQuoteEngineeringStatus(tx, quote.id, "no_requerida");
      await recordActivity(tx, {
        actorUserId: actor.userId,
        actorName: actor.name,
        action: "cancelled",
        entityType: "engineering_request",
        entityId: existing.id,
        entityLabel: existing.number,
        parentEntityType: "quote",
        parentEntityId: quote.id,
        previousValue: { status: existing.status },
        newValue: { status: "cancelado" },
      });
    } else if (existing && isOpenEngineeringStatus(existing.status as EngineeringStatus)) {
      throw new AppError(
        "No se puede quitar ingeniería mientras la solicitud está en proceso. Cancélala primero.",
        "ENGINEERING_IN_PROGRESS",
        409,
      );
    } else {
      await syncQuoteEngineeringStatus(tx, quote.id, "no_requerida");
    }
    return existing;
  }

  if (existing) {
    if (quote.engineeringType && existing.projectType !== quote.engineeringType) {
      await tx
        .update(engineeringRequests)
        .set({
          projectType: quote.engineeringType,
          updatedBy: actor.userId,
          updatedAt: new Date(),
        })
        .where(eq(engineeringRequests.id, existing.id));
    }
    await syncQuoteEngineeringStatus(
      tx,
      quote.id,
      existing.status as EngineeringStatus,
    );
    return existing;
  }

  const id = crypto.randomUUID();
  await insertEngineeringRequest(
    tx,
    {
      id,
      quoteId: quote.id,
      customerId: quote.customerId,
      description:
        quote.notes?.trim() ||
        `Ingeniería requerida por la RFQ ${quote.number}.`,
      projectType: quote.engineeringType ?? "diseno_nuevo",
      priority: "media",
      isDemo: quote.isDemo,
    },
    actor,
  );
  return { id };
}

export async function createEngineeringRequest(
  input: CreateEngineeringRequestInput,
  actor: Actor,
) {
  const [quote] = await db
    .select()
    .from(quotes)
    .where(eq(quotes.id, input.quoteId))
    .limit(1);
  if (!quote || quote.deletedAt) {
    throw new AppError("La cotización no existe.", "QUOTE_NOT_FOUND", 404);
  }
  const existing = await getActiveEngineeringByQuoteId(quote.id);
  if (quote.rfqType === "solo_fabricacion") {
    throw new AppError(
      "Solo fabricación no abre ingeniería. El cliente entrega el plano en la cotización.",
      "ENGINEERING_BLOCKED",
      409,
    );
  }
  if (existing) {
    throw new AppError(
      "Esta RFQ ya tiene una solicitud de ingeniería.",
      "ENGINEERING_EXISTS",
      409,
    );
  }

  const id = crypto.randomUUID();
  await db.transaction(async (tx) => {
    await insertEngineeringRequest(
      tx,
      {
        id,
        quoteId: quote.id,
        customerId: quote.customerId,
        description: input.description,
        notes: input.notes,
        projectType: input.projectType,
        priority: input.priority,
        dueDate: input.dueDate,
        assigneeUserId: input.assigneeUserId,
        isDemo: quote.isDemo,
      },
      actor,
    );
  });
  return { id };
}

export async function updateEngineeringRequest(
  input: UpdateEngineeringRequestInput,
  actor: Actor,
) {
  const current = await loadRequestRow(input.id);
  if (!canEditEngineering(current.status as EngineeringStatus)) {
    throw new AppError(
      "Esta solicitud ya no se puede editar.",
      "ENGINEERING_LOCKED",
      409,
    );
  }

  const next = {
    description: input.description,
    notes: input.notes ?? null,
    projectType: input.projectType,
    priority: input.priority,
    dueDate: input.dueDate ?? null,
  };
  const changed = pickChangedFields(
    {
      description: current.description,
      notes: current.notes,
      projectType: current.projectType,
      priority: current.priority,
      dueDate: current.dueDate?.toISOString() ?? null,
    },
    {
      description: next.description,
      notes: next.notes,
      projectType: next.projectType,
      priority: next.priority,
      dueDate: next.dueDate?.toISOString() ?? null,
    },
  );

  await db.transaction(async (tx) => {
    await tx
      .update(engineeringRequests)
      .set({ ...next, updatedBy: actor.userId, updatedAt: new Date() })
      .where(eq(engineeringRequests.id, input.id));
    await tx
      .update(quotes)
      .set({ engineeringType: input.projectType, updatedAt: new Date() })
      .where(eq(quotes.id, current.quoteId));
    if (Object.keys(changed.newValue).length > 0) {
      await recordActivity(tx, {
        actorUserId: actor.userId,
        actorName: actor.name,
        action: "updated",
        entityType: "engineering_request",
        entityId: input.id,
        entityLabel: current.number,
        parentEntityType: "quote",
        parentEntityId: current.quoteId,
        previousValue: changed.previousValue,
        newValue: changed.newValue,
      });
    }
  });
  return { id: input.id };
}

export async function assignEngineeringRequest(
  input: AssignEngineeringInput,
  actor: Actor,
) {
  const current = await loadRequestRow(input.id);
  if (current.status !== "pendiente" && current.status !== "asignado") {
    throw new AppError(
      "Solo se puede asignar una solicitud pendiente o ya asignada.",
      "INVALID_TRANSITION",
      409,
    );
  }
  const [assignee] = await db
    .select({ id: users.id, name: users.name })
    .from(users)
    .where(eq(users.id, input.assigneeUserId))
    .limit(1);
  if (!assignee) {
    throw new AppError("El responsable no existe.", "USER_NOT_FOUND", 404);
  }

  const now = new Date();
  const nextStatus: EngineeringStatus =
    current.status === "pendiente" ? "asignado" : (current.status as EngineeringStatus);

  await db.transaction(async (tx) => {
    await tx
      .update(engineeringRequests)
      .set({
        assigneeUserId: assignee.id,
        status: nextStatus,
        assignedAt: current.assignedAt ?? now,
        updatedBy: actor.userId,
        updatedAt: now,
      })
      .where(eq(engineeringRequests.id, input.id));
    await syncQuoteEngineeringStatus(tx, current.quoteId, nextStatus);
    await recordActivity(tx, {
      actorUserId: actor.userId,
      actorName: actor.name,
      action: "assigned",
      entityType: "engineering_request",
      entityId: input.id,
      entityLabel: `${current.number} → ${assignee.name}`,
      parentEntityType: "quote",
      parentEntityId: current.quoteId,
      previousValue: { assigneeUserId: current.assigneeUserId, status: current.status },
      newValue: { assigneeUserId: assignee.id, status: nextStatus },
    });
  });
  return { id: input.id };
}

export async function changeEngineeringStatus(
  id: string,
  nextStatus: EngineeringStatus,
  actor: Actor,
) {
  const current = await loadRequestRow(id);
  if (!canTransitionEngineering(current.status as EngineeringStatus, nextStatus)) {
    throw new AppError(
      `No se puede cambiar de ${ENGINEERING_STATUS_LABELS[current.status as EngineeringStatus]} a ${ENGINEERING_STATUS_LABELS[nextStatus]}.`,
      "INVALID_TRANSITION",
      409,
    );
  }
  if (nextStatus === "asignado" && !current.assigneeUserId) {
    throw new AppError(
      "Asigna un responsable antes de marcar Asignado.",
      "ASSIGNEE_REQUIRED",
      400,
    );
  }

  const now = new Date();
  const extra: Record<string, Date | string | null> = {};
  if (nextStatus === "disenando" && !current.designStartedAt) {
    extra.designStartedAt = now;
  }
  if (nextStatus === "aprobado") extra.approvedAt = now;
  if (nextStatus === "liberado") {
    extra.releasedAt = now;
    extra.releasedBy = actor.userId;
  }
  if (nextStatus === "cancelado") extra.cancelledAt = now;

  const action =
    nextStatus === "liberado"
      ? "released"
      : nextStatus === "aprobado"
        ? "approved"
        : nextStatus === "cancelado"
          ? "cancelled"
          : nextStatus === "asignado"
            ? "assigned"
            : "status_changed";

  await db.transaction(async (tx) => {
    await tx
      .update(engineeringRequests)
      .set({
        status: nextStatus,
        ...extra,
        updatedBy: actor.userId,
        updatedAt: now,
      })
      .where(eq(engineeringRequests.id, id));
    await syncQuoteEngineeringStatus(tx, current.quoteId, nextStatus);
    await recordActivity(tx, {
      actorUserId: actor.userId,
      actorName: actor.name,
      action,
      entityType: "engineering_request",
      entityId: id,
      entityLabel: current.number,
      parentEntityType: "quote",
      parentEntityId: current.quoteId,
      previousValue: { status: current.status },
      newValue: { status: nextStatus },
    });
  });
  return { id, status: nextStatus };
}

export async function archiveEngineeringRequest(id: string, actor: Actor) {
  const current = await loadRequestRow(id);
  if (current.status === "liberado") {
    throw new AppError(
      "No se puede eliminar una solicitud liberada.",
      "ENGINEERING_RELEASED",
      409,
    );
  }
  if (
    current.status !== "pendiente" &&
    current.status !== "cancelado"
  ) {
    throw new AppError(
      "Solo se pueden eliminar solicitudes pendientes o canceladas.",
      "ENGINEERING_LOCKED",
      409,
    );
  }
  const now = new Date();
  await db.transaction(async (tx) => {
    await tx
      .update(engineeringRequests)
      .set({
        deletedAt: now,
        updatedBy: actor.userId,
        updatedAt: now,
      })
      .where(eq(engineeringRequests.id, id));
    await tx
      .update(quotes)
      .set({
        engineeringStatus: "pendiente",
        updatedAt: now,
      })
      .where(eq(quotes.id, current.quoteId));
    await recordActivity(tx, {
      actorUserId: actor.userId,
      actorName: actor.name,
      action: "deleted",
      entityType: "engineering_request",
      entityId: id,
      entityLabel: current.number,
      parentEntityType: "quote",
      parentEntityId: current.quoteId,
    });
  });
  return { id };
}

export async function logEngineeringHours(
  input: LogEngineeringHoursInput,
  actor: Actor,
) {
  const current = await loadRequestRow(input.engineeringRequestId);
  if (!canLogEngineeringHours(current.status as EngineeringStatus)) {
    throw new AppError(
      "No se pueden registrar horas en este estado.",
      "ENGINEERING_LOCKED",
      409,
    );
  }
  const id = crypto.randomUUID();
  const hours = input.hours.toFixed(2);
  await db.transaction(async (tx) => {
    await tx.insert(engineeringHours).values({
      id,
      engineeringRequestId: current.id,
      userId: actor.userId,
      hours,
      note: input.note ?? null,
      workedOn: input.workedOn ?? new Date(),
      createdBy: actor.userId,
    });
    await tx
      .update(engineeringRequests)
      .set({
        hoursLogged: sql`${engineeringRequests.hoursLogged} + ${hours}`,
        updatedBy: actor.userId,
        updatedAt: new Date(),
      })
      .where(eq(engineeringRequests.id, current.id));
    await recordActivity(tx, {
      actorUserId: actor.userId,
      actorName: actor.name,
      action: "hours_logged",
      entityType: "engineering_hours",
      entityId: id,
      entityLabel: `${hours} h · ${current.number}`,
      parentEntityType: "engineering_request",
      parentEntityId: current.id,
      newValue: { hours },
    });
  });
  return { id };
}

export async function startEngineeringHours(
  input: StartEngineeringHoursInput,
  actor: Actor,
) {
  const current = await loadRequestRow(input.engineeringRequestId);
  if (!canLogEngineeringHours(current.status as EngineeringStatus)) {
    throw new AppError(
      "No se pueden registrar horas en este estado.",
      "ENGINEERING_LOCKED",
      409,
    );
  }
  const startedAt = new Date();
  const id = crypto.randomUUID();
  try {
    await db.insert(engineeringHours).values({
      id,
      engineeringRequestId: current.id,
      userId: actor.userId,
      hours: "0",
      note: input.note ?? null,
      workedOn: startedAt,
      startedAt,
      createdBy: actor.userId,
    });
  } catch {
    throw new AppError(
      "Ya tienes un registro de horas abierto en esta solicitud.",
      "ENGINEERING_HOURS_OPEN",
      409,
    );
  }
  await recordActivity(db, {
    actorUserId: actor.userId,
    actorName: actor.name,
    action: "hours_logged",
    entityType: "engineering_hours",
    entityId: id,
    entityLabel: `${current.number} · iniciado`,
    parentEntityType: "engineering_request",
    parentEntityId: current.id,
  });
  return { id };
}

export async function stopEngineeringHours(
  input: StopEngineeringHoursInput,
  actor: Actor,
) {
  const [row] = await db
    .select()
    .from(engineeringHours)
    .where(eq(engineeringHours.id, input.id))
    .limit(1);
  if (!row) {
    throw new AppError("El registro de horas no existe.", "HOURS_NOT_FOUND", 404);
  }
  if (row.endedAt) {
    throw new AppError("Ese registro ya está cerrado.", "HOURS_CLOSED", 409);
  }
  if (!row.startedAt) {
    throw new AppError("Ese registro no es un cronómetro.", "HOURS_NOT_TIMER", 409);
  }
  const endedAt = new Date();
  const minutes = durationMinutes(row.startedAt, endedAt);
  const hours = (minutes / 60).toFixed(2);
  await db.transaction(async (tx) => {
    await tx
      .update(engineeringHours)
      .set({
        endedAt,
        durationMinutes: minutes,
        hours,
      })
      .where(eq(engineeringHours.id, row.id));
    await tx
      .update(engineeringRequests)
      .set({
        hoursLogged: sql`${engineeringRequests.hoursLogged} + ${hours}`,
        updatedBy: actor.userId,
        updatedAt: new Date(),
      })
      .where(eq(engineeringRequests.id, row.engineeringRequestId));
  });
  void actor;
  return { id: row.id };
}

export async function getEngineeringRequestById(id: string) {
  const [row] = await db
    .select({
      request: engineeringRequests,
      customerName: customers.legalName,
      customerCode: customers.code,
      quoteNumber: quotes.number,
      quoteStatus: quotes.status,
      quoteEngineeringStatus: quotes.engineeringStatus,
      assigneeName: users.name,
    })
    .from(engineeringRequests)
    .innerJoin(customers, eq(engineeringRequests.customerId, customers.id))
    .innerJoin(quotes, eq(engineeringRequests.quoteId, quotes.id))
    .leftJoin(users, eq(engineeringRequests.assigneeUserId, users.id))
    .where(eq(engineeringRequests.id, id))
    .limit(1);
  if (!row) return null;

  const hours = await db
    .select({
      id: engineeringHours.id,
      hours: engineeringHours.hours,
      note: engineeringHours.note,
      workedOn: engineeringHours.workedOn,
      startedAt: engineeringHours.startedAt,
      endedAt: engineeringHours.endedAt,
      durationMinutes: engineeringHours.durationMinutes,
      createdAt: engineeringHours.createdAt,
      userName: users.name,
    })
    .from(engineeringHours)
    .leftJoin(users, eq(engineeringHours.userId, users.id))
    .where(eq(engineeringHours.engineeringRequestId, id))
    .orderBy(desc(engineeringHours.workedOn));

  return {
    ...row.request,
    customerName: row.customerName,
    customerCode: row.customerCode,
    quoteNumber: row.quoteNumber,
    quoteStatus: row.quoteStatus,
    quoteEngineeringStatus: row.quoteEngineeringStatus,
    assigneeName: row.assigneeName,
    hoursEntries: hours,
    documents: await listEngineeringDocuments(id),
  };
}

export type EngineeringListQuery = {
  q?: string;
  status?: EngineeringStatus;
  customerId?: string;
  overdue?: boolean;
  page?: number;
};

export async function listEngineeringRequests(query: EngineeringListQuery) {
  const page = Math.max(1, query.page ?? 1);
  const filters = [isNull(engineeringRequests.deletedAt)];
  if (query.status) filters.push(eq(engineeringRequests.status, query.status));
  if (query.customerId) {
    filters.push(eq(engineeringRequests.customerId, query.customerId));
  }
  if (query.overdue) {
    filters.push(
      and(
        isNotNull(engineeringRequests.dueDate),
        lt(engineeringRequests.dueDate, new Date()),
        inArray(engineeringRequests.status, [
          "pendiente",
          "asignado",
          "disenando",
          "revision_interna",
          "esperando_cliente",
          "correcciones",
        ]),
      )!,
    );
  }
  if (query.q) {
    const term = `%${query.q}%`;
    filters.push(
      or(
        sql`${engineeringRequests.number} ilike ${term}`,
        sql`${customers.legalName} ilike ${term}`,
        sql`${quotes.number} ilike ${term}`,
        sql`${engineeringRequests.description} ilike ${term}`,
      )!,
    );
  }
  const where = and(...filters);

  const [totalRow] = await db
    .select({ value: count() })
    .from(engineeringRequests)
    .innerJoin(customers, eq(engineeringRequests.customerId, customers.id))
    .innerJoin(quotes, eq(engineeringRequests.quoteId, quotes.id))
    .where(where);

  const rows = await db
    .select({
      id: engineeringRequests.id,
      number: engineeringRequests.number,
      status: engineeringRequests.status,
      priority: engineeringRequests.priority,
      projectType: engineeringRequests.projectType,
      dueDate: engineeringRequests.dueDate,
      hoursLogged: engineeringRequests.hoursLogged,
      isDemo: engineeringRequests.isDemo,
      customerId: engineeringRequests.customerId,
      customerName: customers.legalName,
      quoteId: engineeringRequests.quoteId,
      quoteNumber: quotes.number,
      assigneeName: users.name,
    })
    .from(engineeringRequests)
    .innerJoin(customers, eq(engineeringRequests.customerId, customers.id))
    .innerJoin(quotes, eq(engineeringRequests.quoteId, quotes.id))
    .leftJoin(users, eq(engineeringRequests.assigneeUserId, users.id))
    .where(where)
    .orderBy(desc(engineeringRequests.createdAt), desc(engineeringRequests.number))
    .limit(ENGINEERING_PAGE_SIZE)
    .offset((page - 1) * ENGINEERING_PAGE_SIZE);

  const total = Number(totalRow.value);
  return {
    rows,
    total,
    page,
    pageSize: ENGINEERING_PAGE_SIZE,
    pageCount: Math.max(1, Math.ceil(total / ENGINEERING_PAGE_SIZE)),
  };
}

export async function listEngineeringByCustomer(customerId: string) {
  return db
    .select({
      id: engineeringRequests.id,
      number: engineeringRequests.number,
      status: engineeringRequests.status,
      quoteId: engineeringRequests.quoteId,
      quoteNumber: quotes.number,
      dueDate: engineeringRequests.dueDate,
      isDemo: engineeringRequests.isDemo,
    })
    .from(engineeringRequests)
    .innerJoin(quotes, eq(engineeringRequests.quoteId, quotes.id))
    .where(
      and(
        eq(engineeringRequests.customerId, customerId),
        isNull(engineeringRequests.deletedAt),
      ),
    )
    .orderBy(desc(engineeringRequests.createdAt));
}

export async function listQuotesEligibleForEngineering() {
  const existing = await db
    .select({ quoteId: engineeringRequests.quoteId })
    .from(engineeringRequests)
    .where(isNull(engineeringRequests.deletedAt));
  const taken = existing.map((row) => row.quoteId);

  const filters = [
    isNull(quotes.deletedAt),
    eq(quotes.requiresEngineering, true),
  ];
  if (taken.length > 0) {
    filters.push(
      sql`${quotes.id} not in (${sql.join(
        taken.map((id) => sql`${id}`),
        sql`, `,
      )})`,
    );
  }

  return db
    .select({
      id: quotes.id,
      number: quotes.number,
      customerId: quotes.customerId,
      customerName: customers.legalName,
      engineeringType: quotes.engineeringType,
    })
    .from(quotes)
    .innerJoin(customers, eq(quotes.customerId, customers.id))
    .where(and(...filters))
    .orderBy(desc(quotes.issueDate));
}

export async function listUsersForAssignment() {
  return db
    .select({ id: users.id, name: users.name, email: users.email })
    .from(users)
    .orderBy(asc(users.name));
}

export async function getEngineeringDashboardStats() {
  const openStatuses = [
    "pendiente",
    "asignado",
    "disenando",
    "revision_interna",
    "esperando_cliente",
    "correcciones",
  ] as const;
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const base = and(isNull(engineeringRequests.deletedAt));

  const [openRow] = await db
    .select({ value: count() })
    .from(engineeringRequests)
    .where(and(base, inArray(engineeringRequests.status, [...openStatuses])));

  const [overdueRow] = await db
    .select({ value: count() })
    .from(engineeringRequests)
    .where(
      and(
        base,
        inArray(engineeringRequests.status, [...openStatuses]),
        isNotNull(engineeringRequests.dueDate),
        lt(engineeringRequests.dueDate, now),
      ),
    );

  const [approvedRow] = await db
    .select({ value: count() })
    .from(engineeringRequests)
    .where(
      and(
        base,
        isNotNull(engineeringRequests.approvedAt),
        gte(engineeringRequests.approvedAt, monthStart),
      ),
    );

  const [rejectedRow] = await db
    .select({ value: count() })
    .from(engineeringRequests)
    .where(and(base, eq(engineeringRequests.status, "cancelado")));

  const [releasedRow] = await db
    .select({ value: count() })
    .from(engineeringRequests)
    .where(and(base, eq(engineeringRequests.status, "liberado")));

  const [hoursRow] = await db
    .select({ value: sum(engineeringRequests.hoursLogged) })
    .from(engineeringRequests)
    .where(base);

  const [avgRow] = await db
    .select({
      value: avg(
        sql`extract(epoch from coalesce(${engineeringRequests.releasedAt}, ${engineeringRequests.approvedAt}) - ${engineeringRequests.createdAt}) / 86400.0`,
      ),
    })
    .from(engineeringRequests)
    .where(
      and(
        base,
        or(
          isNotNull(engineeringRequests.releasedAt),
          isNotNull(engineeringRequests.approvedAt),
        ),
      ),
    );

  return {
    open: Number(openRow.value),
    overdue: Number(overdueRow.value),
    approvedThisMonth: Number(approvedRow.value),
    rejected: Number(rejectedRow.value),
    released: Number(releasedRow.value),
    hoursLogged: Number(hoursRow.value ?? 0),
    averageDesignDays:
      avgRow.value === null ? null : Number(Number(avgRow.value).toFixed(1)),
  };
}

export async function getQuoteEngineeringStats() {
  const [requiredRow] = await db
    .select({ value: count() })
    .from(quotes)
    .where(and(isNull(quotes.deletedAt), eq(quotes.requiresEngineering, true)));
  const [pendingRow] = await db
    .select({ value: count() })
    .from(quotes)
    .where(
      and(isNull(quotes.deletedAt), eq(quotes.engineeringStatus, "pendiente")),
    );
  const [inProcessRow] = await db
    .select({ value: count() })
    .from(quotes)
    .where(
      and(isNull(quotes.deletedAt), eq(quotes.engineeringStatus, "en_proceso")),
    );
  const [releasedRow] = await db
    .select({ value: count() })
    .from(quotes)
    .where(
      and(isNull(quotes.deletedAt), eq(quotes.engineeringStatus, "liberada")),
    );
  return {
    requiringEngineering: Number(requiredRow.value),
    engineeringPending: Number(pendingRow.value),
    engineeringInProcess: Number(inProcessRow.value),
    engineeringReleased: Number(releasedRow.value),
  };
}
