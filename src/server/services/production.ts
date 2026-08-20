import "server-only";

import {
  and,
  asc,
  count,
  desc,
  eq,
  ilike,
  inArray,
  lt,
  ne,
  or,
} from "drizzle-orm";
import { db } from "@/db";
import {
  customers,
  documents,
  downtimeReasons,
  engineeringRequests,
  machines,
  materials,
  orderItems,
  orders,
  productionDowntime,
  productionOperations,
  productionOrderMaterials,
  productionOrders,
  productionRouteSteps,
  quoteItems,
  quotes,
  users,
  workCenters,
} from "@/db/schema";
import { pickChangedFields } from "@/lib/audit/activity";
import { canIssueOtFromOrderStatus, type OrderStatus } from "@/lib/orders/status";
import { AppError } from "@/lib/errors";
import { resolvePageSize } from "@/lib/ui/pagination";
import type { EngineeringStatus } from "@/lib/engineering/status";
import {
  productionMonitoring,
  type ProductionPriority,
  type ProductionRouteStepKind,
} from "@/lib/production/catalog";
import { canCreateProductionOrder, type OrderOrigin } from "@/lib/production/gates";
import { isManufacturingItem } from "@/lib/quotes/items";
import type { QuoteItemCosting } from "@/lib/quotes/costing";
import { formatQty } from "@/lib/inventory/catalog";
import { nextOtNumberForPartida, otNumberForPartida } from "@/lib/production/ot-number";
import type { RfqType } from "@/lib/quotes/rfq";
import {
  assertProductionTransition,
  canAssignProduction,
  canEditProduction,
  permissionForProductionTransition,
  PRODUCTION_STATUS_LABELS,
  requiresDowntimeReason,
  type ProductionStatus,
} from "@/lib/production/status";
import type {
  AssignProductionInput,
  CreateProductionOrderInput,
  UpdateProductionOrderInput,
} from "@/lib/validation/production";
import { recordActivity } from "@/server/services/activity";
import type { Actor } from "@/server/services/customers";
import {
  orderHasUncoveredMaterial,
  receiveFinishedGoodsForOrder,
  releaseReservationsForOrder,
} from "@/server/services/inventory";
import { attachDocumentsToProductionOrder } from "@/server/services/documents";
import { assertMachineBelongsToCenter } from "@/server/services/production-catalogs";
import { assertCanPhysicallyClose, ensureInspectionDraft } from "@/server/services/quality";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function uniqueOtNumberForPartida(
  tx: Tx,
  orderNumber: string,
  position: number,
) {
  const base = otNumberForPartida(orderNumber, position);
  const rows = await tx
    .select({ number: productionOrders.number })
    .from(productionOrders)
    .where(ilike(productionOrders.number, `${base}%`));
  return nextOtNumberForPartida(
    orderNumber,
    position,
    rows.map((row) => row.number),
  );
}

async function cloneDocumentsOntoOt(
  tx: Tx,
  otId: string,
  sourceDocs: (typeof documents.$inferSelect)[],
  actor: Actor,
) {
  for (const doc of sourceDocs) {
    await tx.insert(documents).values({
      id: crypto.randomUUID(),
      entityType: "production_order",
      entityId: otId,
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

async function loadOrderRow(id: string) {
  const [row] = await db
    .select()
    .from(productionOrders)
    .where(eq(productionOrders.id, id))
    .limit(1);
  if (!row) {
    throw new AppError("El número de parte no existe.", "OP_NOT_FOUND", 404);
  }
  return row;
}

async function loadCommercialOrder(orderId: string) {
  const [row] = await db
    .select({
      id: orders.id,
      number: orders.number,
      customerId: orders.customerId,
      customerName: customers.legalName,
      quoteId: orders.quoteId,
      quoteNumber: quotes.number,
      rfqType: quotes.rfqType,
      origin: orders.origin,
      status: orders.status,
      engineeringRequestId: orders.engineeringRequestId,
      engineeringStatus: engineeringRequests.status,
      engineeringNumber: engineeringRequests.number,
      isDemo: orders.isDemo,
    })
    .from(orders)
    .innerJoin(customers, eq(orders.customerId, customers.id))
    .innerJoin(quotes, eq(orders.quoteId, quotes.id))
    .leftJoin(
      engineeringRequests,
      eq(orders.engineeringRequestId, engineeringRequests.id),
    )
    .where(eq(orders.id, orderId))
    .limit(1);
  if (!row) {
    throw new AppError("La orden de trabajo no existe.", "ORDER_NOT_FOUND", 404);
  }
  return row;
}

async function instantiateRoute(
  tx: Tx,
  productionOrderId: string,
  routeId: string,
) {
  const steps = await tx
    .select()
    .from(productionRouteSteps)
    .where(eq(productionRouteSteps.routeId, routeId))
    .orderBy(asc(productionRouteSteps.position));

  if (steps.length === 0) return;

  await tx.insert(productionOperations).values(
    steps.map((step) => ({
      id: crypto.randomUUID(),
      productionOrderId,
      routeStepId: step.id,
      position: step.position,
      kind: step.kind,
      workCenterId: step.workCenterId,
      name: step.name,
      status:
        step.kind === "ingenieria"
          ? ("omitida" as const)
          : step.kind === "entrega"
            ? ("pendiente" as const)
            : ("pendiente" as const),
    })),
  );
}

export async function listOrdersEligibleForProduction() {
  const rows = await db
    .select({
      id: orders.id,
      number: orders.number,
      customerId: orders.customerId,
      customerName: customers.legalName,
      quoteId: orders.quoteId,
      quoteNumber: quotes.number,
      rfqType: quotes.rfqType,
      origin: orders.origin,
      status: orders.status,
      engineeringRequestId: orders.engineeringRequestId,
      engineeringStatus: engineeringRequests.status,
      engineeringNumber: engineeringRequests.number,
    })
    .from(orders)
    .innerJoin(customers, eq(orders.customerId, customers.id))
    .innerJoin(quotes, eq(orders.quoteId, quotes.id))
    .leftJoin(
      engineeringRequests,
      eq(orders.engineeringRequestId, engineeringRequests.id),
    )
    .orderBy(desc(orders.createdAt));

  return rows.filter((row) => {
    if (!canIssueOtFromOrderStatus(row.status as OrderStatus)) return false;
    return canCreateProductionOrder({
      origin: row.origin as OrderOrigin,
      rfqType: row.rfqType as RfqType,
      engineeringStatus: (row.engineeringStatus as EngineeringStatus | null) ?? null,
    }).ok;
  });
}

export async function listOrderItems(orderId: string) {
  return db
    .select({
      id: orderItems.id,
      position: orderItems.position,
      kind: orderItems.kind,
      description: orderItems.description,
      partNumber: orderItems.partNumber,
      quantity: orderItems.quantity,
      unit: orderItems.unit,
    })
    .from(orderItems)
    .where(eq(orderItems.orderId, orderId))
    .orderBy(asc(orderItems.position));
}

async function loadOrderItemForOt(orderId: string, orderItemId: string) {
  const [item] = await db
    .select()
    .from(orderItems)
    .where(and(eq(orderItems.id, orderItemId), eq(orderItems.orderId, orderId)))
    .limit(1);
  if (!item) {
    throw new AppError("La partida no pertenece a esta orden de trabajo.", "ORDER_ITEM_NOT_FOUND", 404);
  }
  if (!isManufacturingItem(item.kind)) {
    throw new AppError(
      "El servicio de ingeniería no genera OT. Se cobra en la cotización.",
      "ENGINEERING_SERVICE_NO_OT",
      409,
    );
  }
  const [existing] = await db
    .select({ id: productionOrders.id, status: productionOrders.status })
    .from(productionOrders)
    .where(
      and(
        eq(productionOrders.orderItemId, item.id),
        ne(productionOrders.status, "cancelada"),
      ),
    )
    .limit(1);
  if (existing) {
    throw new AppError(
      "Esta partida ya tiene una OT. Una pieza = una orden de trabajo.",
      "ORDER_ITEM_HAS_OT",
      409,
    );
  }
  return item;
}

export async function createProductionOrder(
  input: CreateProductionOrderInput,
  actor: Actor,
) {
  const commercial = await loadCommercialOrder(input.orderId);
  const gate = canCreateProductionOrder({
    origin: commercial.origin as OrderOrigin,
    rfqType: commercial.rfqType as RfqType,
    engineeringStatus:
      (commercial.engineeringStatus as EngineeringStatus | null) ?? null,
  });
  if (!gate.ok) {
    throw new AppError(gate.message, gate.code, 409);
  }
  if (!canIssueOtFromOrderStatus(commercial.status as OrderStatus)) {
    throw new AppError(
      "Solo una orden de trabajo aprobada o en producción puede generar números de parte.",
      "ORDER_NOT_APPROVED",
      409,
    );
  }

  const item = await loadOrderItemForOt(input.orderId, input.orderItemId);

  if (input.machineId) {
    if (!input.workCenterId) {
      throw new AppError(
        "Asigna un centro de trabajo antes de la máquina.",
        "WORK_CENTER_REQUIRED",
        409,
      );
    }
    await assertMachineBelongsToCenter(input.machineId, input.workCenterId);
  }

  const created = await db.transaction(async (tx) => {
    const number = await uniqueOtNumberForPartida(tx, commercial.number, item.position);
    const id = crypto.randomUUID();
    await tx.insert(productionOrders).values({
      id,
      number,
      orderId: commercial.id,
      orderItemId: item.id,
      customerId: commercial.customerId,
      quoteId: commercial.quoteId,
      engineeringRequestId: commercial.engineeringRequestId,
      origin: commercial.origin,
      routeId: input.routeId ?? null,
      description: input.description || item.description,
      partNumber: input.partNumber ?? item.partNumber,
      quantity: String(input.quantity || item.quantity),
      unit: input.unit || item.unit,
      promisedDate: input.promisedDate,
      priority: input.priority,
      notes: input.notes ?? null,
      workCenterId: input.workCenterId ?? null,
      machineId: input.machineId ?? null,
      operatorUserId: input.operatorUserId ?? null,
      isDemo: commercial.isDemo,
      createdBy: actor.userId,
      updatedBy: actor.userId,
    });
    if (input.routeId) {
      await instantiateRoute(tx, id, input.routeId);
    }
    const [quoteItem] = await tx
      .select({ id: quoteItems.id })
      .from(quoteItems)
      .where(
        and(
          eq(quoteItems.quoteId, commercial.quoteId),
          eq(quoteItems.position, item.position),
        ),
      )
      .limit(1);
    if (quoteItem) {
      const itemDocs = await tx
        .select()
        .from(documents)
        .where(
          and(
            eq(documents.entityType, "quote_item"),
            eq(documents.entityId, quoteItem.id),
          ),
        );
      await cloneDocumentsOntoOt(tx, id, itemDocs, actor);
    }
    await attachDocumentsToProductionOrder(
      tx,
      id,
      input.documentIds ?? [],
      actor,
      {
        quoteId: commercial.quoteId,
        orderId: commercial.id,
        engineeringRequestId: commercial.engineeringRequestId,
        quoteItemIds: quoteItem ? [quoteItem.id] : [],
      },
    );
    if (input.machineId && input.operatorUserId) {
      await tx
        .update(machines)
        .set({ status: "en_produccion", updatedAt: new Date() })
        .where(eq(machines.id, input.machineId));
    }
    await recordActivity(tx, {
      actorUserId: actor.userId,
      actorName: actor.name,
      action: "created",
      entityType: "production_order",
      entityId: id,
      entityLabel: number,
      parentEntityType: "order",
      parentEntityId: commercial.id,
      newValue: {
        number,
        orderNumber: commercial.number,
        origin: commercial.origin,
        promisedDate: input.promisedDate.toISOString(),
      },
    });
    if (commercial.status === "aprobado") {
      await tx
        .update(orders)
        .set({
          status: "en_produccion",
          updatedBy: actor.userId,
          updatedAt: new Date(),
        })
        .where(eq(orders.id, commercial.id));
      await recordActivity(tx, {
        actorUserId: actor.userId,
        actorName: actor.name,
        action: "status_changed",
        entityType: "order",
        entityId: commercial.id,
        entityLabel: `${commercial.number} → En producción`,
        parentEntityType: "customer",
        parentEntityId: commercial.customerId,
        previousValue: { status: "aprobado" },
        newValue: { status: "en_produccion" },
      });
    }
    return { id, number };
  });

  return created;
}

export async function insertConvertedOrderWorkOrders(
  tx: Tx,
  input: {
    orderId: string;
    orderNumber: string;
    customerId: string;
    quoteId: string;
    engineeringRequestId: string | null;
    origin: string;
    isDemo: boolean;
    promisedDate: Date;
    actor: Actor;
    items: {
      orderItemId: string;
      quoteItemId: string;
      position: number;
      kind: string | null;
      description: string;
      partNumber: string | null;
      quantity: string;
      unit: string;
    }[];
  },
) {
  for (const item of input.items) {
    if (!isManufacturingItem(item.kind)) continue;
    const id = crypto.randomUUID();
    const number = otNumberForPartida(input.orderNumber, item.position);
    await tx.insert(productionOrders).values({
      id,
      number,
      orderId: input.orderId,
      orderItemId: item.orderItemId,
      customerId: input.customerId,
      quoteId: input.quoteId,
      engineeringRequestId: input.engineeringRequestId,
      origin: input.origin,
      description: item.description,
      partNumber: item.partNumber,
      quantity: item.quantity,
      unit: item.unit,
      promisedDate: input.promisedDate,
      isDemo: input.isDemo,
      createdBy: input.actor.userId,
      updatedBy: input.actor.userId,
    });
    const itemDocs = await tx
      .select()
      .from(documents)
      .where(
        and(
          eq(documents.entityType, "quote_item"),
          eq(documents.entityId, item.quoteItemId),
        ),
      );
    const sourceDocs =
      itemDocs.length > 0
        ? itemDocs
        : input.engineeringRequestId
          ? await tx
              .select()
              .from(documents)
              .where(
                and(
                  eq(documents.entityType, "engineering_request"),
                  eq(documents.entityId, input.engineeringRequestId),
                ),
              )
          : [];
    await cloneDocumentsOntoOt(tx, id, sourceDocs, input.actor);
    const [quoteItem] = await tx
      .select({
        costing: quoteItems.costing,
        quantity: quoteItems.quantity,
      })
      .from(quoteItems)
      .where(eq(quoteItems.id, item.quoteItemId))
      .limit(1);
    const costing = (quoteItem?.costing ?? null) as QuoteItemCosting | null;
    if (costing?.processes && costing.processes.length > 0) {
      const centers = await tx
        .select({ id: workCenters.id, code: workCenters.code })
        .from(workCenters);
      const centerId = new Map(centers.map((center) => [center.code, center.id]));
      await tx.insert(productionOperations).values(
        costing.processes.map((step) => {
          const kind: ProductionRouteStepKind =
            step.workCenterCode === "calidad" ? "calidad" : "produccion";
          return {
            id: crypto.randomUUID(),
            productionOrderId: id,
            position: step.position,
            kind,
            workCenterId: step.workCenterCode
              ? (centerId.get(step.workCenterCode) ?? null)
              : null,
            name: step.name,
          };
        }),
      );
    }
    if (costing?.material_id) {
      const already = await tx
        .select({ id: productionOrderMaterials.id })
        .from(productionOrderMaterials)
        .where(
          and(
            eq(productionOrderMaterials.orderId, input.orderId),
            eq(productionOrderMaterials.materialId, costing.material_id),
          ),
        )
        .limit(1);
      if (!already[0]) {
        const [mat] = await tx
          .select({ warehouseId: materials.warehouseId })
          .from(materials)
          .where(eq(materials.id, costing.material_id))
          .limit(1);
        if (mat) {
          const qty = Number(item.quantity || 1);
          const yieldN = Number(costing.pieces_per_stock || 0);
          const required = yieldN > 0 ? Math.ceil(qty / yieldN) : 1;
          await tx.insert(productionOrderMaterials).values({
            id: crypto.randomUUID(),
            orderId: input.orderId,
            productionOrderId: id,
            materialId: costing.material_id,
            warehouseId: mat.warehouseId,
            requiredQty: formatQty(required),
            createdBy: input.actor.userId,
            updatedBy: input.actor.userId,
          });
        }
      }
    }
    await recordActivity(tx, {
      actorUserId: input.actor.userId,
      actorName: input.actor.name,
      action: "created",
      entityType: "production_order",
      entityId: id,
      entityLabel: number,
      parentEntityType: "order",
      parentEntityId: input.orderId,
      newValue: {
        number,
        orderNumber: input.orderNumber,
        origin: input.origin,
        fromQuoteItem: item.quoteItemId,
      },
    });
  }
}

export async function updateProductionOrder(
  input: UpdateProductionOrderInput,
  actor: Actor,
) {
  const row = await loadOrderRow(input.id);
  if (!canEditProduction(row.status as ProductionStatus)) {
    throw new AppError(
      "No se puede editar un número de parte entregado o cancelado.",
      "OP_LOCKED",
      409,
    );
  }

  const previous = {
    description: row.description,
    partNumber: row.partNumber,
    quantity: row.quantity,
    unit: row.unit,
    promisedDate: row.promisedDate.toISOString(),
    priority: row.priority,
    notes: row.notes,
    routeId: row.routeId,
    workCenterId: row.workCenterId,
    machineId: row.machineId,
    operatorUserId: row.operatorUserId,
  };
  const next = {
    description: input.description,
    partNumber: input.partNumber ?? null,
    quantity: String(input.quantity),
    unit: input.unit,
    promisedDate: input.promisedDate.toISOString(),
    priority: input.priority,
    notes: input.notes ?? null,
    routeId: input.routeId ?? null,
    workCenterId: input.workCenterId ?? null,
    machineId: input.machineId ?? null,
    operatorUserId: input.operatorUserId ?? null,
  };

  if (input.machineId) {
    const centerId = input.workCenterId ?? row.workCenterId;
    if (!centerId) {
      throw new AppError(
        "Asigna un centro de trabajo antes de la máquina.",
        "WORK_CENTER_REQUIRED",
        409,
      );
    }
    await assertMachineBelongsToCenter(input.machineId, centerId);
  }

  await db
    .update(productionOrders)
    .set({
      description: input.description,
      partNumber: input.partNumber ?? null,
      quantity: String(input.quantity),
      unit: input.unit,
      promisedDate: input.promisedDate,
      priority: input.priority,
      notes: input.notes ?? null,
      routeId: input.routeId ?? null,
      workCenterId: input.workCenterId ?? null,
      machineId: input.machineId ?? null,
      operatorUserId: input.operatorUserId ?? null,
      updatedBy: actor.userId,
      updatedAt: new Date(),
    })
    .where(eq(productionOrders.id, row.id));

  await recordActivity(db, {
    actorUserId: actor.userId,
    actorName: actor.name,
    action: "updated",
    entityType: "production_order",
    entityId: row.id,
    entityLabel: row.number,
    ...pickChangedFields(previous, next),
  });
}

export async function assignProduction(
  input: AssignProductionInput,
  actor: Actor,
) {
  const row = await loadOrderRow(input.id);
  if (!canAssignProduction(row.status as ProductionStatus)) {
    throw new AppError(
      "La OT aún no está liberada o ya está cerrada.",
      "OP_NOT_ASSIGNABLE",
      409,
    );
  }

  if (input.machineId) {
    const centerId = input.workCenterId ?? row.workCenterId;
    if (!centerId) {
      throw new AppError(
        "Asigna un centro de trabajo antes de la máquina.",
        "WORK_CENTER_REQUIRED",
        409,
      );
    }
    await assertMachineBelongsToCenter(input.machineId, centerId);
  }

  const now = new Date();
  const nextCenterId = input.workCenterId ?? row.workCenterId;
  const nextMachineId = input.machineId ?? row.machineId;
  const nextOperatorId = input.operatorUserId ?? row.operatorUserId;
  const assignmentComplete = Boolean(nextCenterId && nextMachineId && nextOperatorId);
  const uncovered = assignmentComplete
    ? await orderHasUncoveredMaterial(row.id)
    : false;
  const shouldProgram =
    assignmentComplete &&
    !uncovered &&
    (row.status === "liberada" || row.status === "esperando_material");

  await db.transaction(async (tx) => {
    await tx
      .update(productionOrders)
      .set({
        workCenterId: nextCenterId,
        machineId: nextMachineId,
        operatorUserId: nextOperatorId,
        status: shouldProgram ? "programada" : row.status,
        scheduledAt: shouldProgram ? now : row.scheduledAt,
        updatedBy: actor.userId,
        updatedAt: now,
      })
      .where(eq(productionOrders.id, row.id));

    if (row.machineId && row.machineId !== nextMachineId) {
      await tx
        .update(machines)
        .set({ status: "disponible", updatedAt: now })
        .where(eq(machines.id, row.machineId));
    }
    if (nextMachineId && nextOperatorId) {
      await tx
        .update(machines)
        .set({ status: "en_produccion", updatedAt: now })
        .where(eq(machines.id, nextMachineId));
    }
  });

  await recordActivity(db, {
    actorUserId: actor.userId,
    actorName: actor.name,
    action: "assigned",
    entityType: "production_order",
    entityId: row.id,
    entityLabel: row.number,
    previousValue: {
      workCenterId: row.workCenterId,
      machineId: row.machineId,
      operatorUserId: row.operatorUserId,
    },
    newValue: {
      workCenterId: nextCenterId,
      machineId: nextMachineId,
      operatorUserId: nextOperatorId,
      status: shouldProgram ? "programada" : row.status,
    },
  });

  if (shouldProgram) {
    await recordActivity(db, {
      actorUserId: actor.userId,
      actorName: actor.name,
      action: "scheduled",
      entityType: "production_order",
      entityId: row.id,
      entityLabel: row.number,
      parentEntityType: "order",
      parentEntityId: row.orderId,
      previousValue: { status: row.status },
      newValue: { status: "programada" },
    });
  }

  return { programmed: shouldProgram, waitingMaterial: uncovered };
}

export async function changeProductionStatus(
  id: string,
  status: ProductionStatus,
  actor: Actor,
  pauseReasonId?: string,
) {
  const row = await loadOrderRow(id);
  const from = row.status as ProductionStatus;
  try {
    assertProductionTransition(from, status);
  } catch (error) {
    throw new AppError(
      error instanceof Error ? error.message : "Transición no permitida.",
      "INVALID_TRANSITION",
      409,
    );
  }

  if (requiresDowntimeReason(status) && !pauseReasonId) {
    throw new AppError(
      "Pausar una OT requiere un motivo de tiempo muerto del catálogo oficial.",
      "DOWNTIME_REASON_REQUIRED",
      409,
    );
  }

  if (
    (status === "programada" || status === "en_produccion") &&
    (!row.workCenterId || !row.machineId || !row.operatorUserId)
  ) {
    throw new AppError(
      "Asigna centro, máquina y operador antes de programar o iniciar el número de parte.",
      "SCHEDULE_INCOMPLETE",
      409,
    );
  }

  if (status === "programada" || status === "en_produccion") {
    if (await orderHasUncoveredMaterial(row.id)) {
      throw new AppError(
        "Hay material requerido sin reservar. Complétalo en la orden de trabajo o espera a que el número de parte pase a Esperando Material.",
        "MATERIAL_SHORTAGE",
        409,
      );
    }
  }

  if (status === "terminada") {
    await assertCanPhysicallyClose(row.id);
  }

  if (pauseReasonId) {
    const [reason] = await db
      .select({ id: downtimeReasons.id, active: downtimeReasons.active })
      .from(downtimeReasons)
      .where(eq(downtimeReasons.id, pauseReasonId))
      .limit(1);
    if (!reason || !reason.active) {
      throw new AppError(
        "El motivo de tiempo muerto no es válido.",
        "DOWNTIME_REASON_INVALID",
        409,
      );
    }
  }

  const now = new Date();
  const patch: Partial<typeof productionOrders.$inferInsert> = {
    status,
    updatedBy: actor.userId,
    updatedAt: now,
  };

  if (status === "liberada") patch.releasedAt = now;
  if (status === "programada") patch.scheduledAt = now;
  if (status === "en_produccion") {
    patch.startedAt = row.startedAt ?? now;
    patch.pausedAt = null;
    patch.pauseReasonId = null;
  }
  if (status === "pausada") {
    patch.pausedAt = now;
    patch.pauseReasonId = pauseReasonId ?? null;
  }
  if (status === "calidad") patch.qualityAt = now;
  if (status === "terminada") {
    patch.physicallyClosedAt = now;
    patch.physicallyClosedBy = actor.userId;
  }
  if (status === "entregada") {
    if (!row.physicallyClosedAt) {
      throw new AppError(
        "El cierre administrativo requiere el cierre físico de Calidad.",
        "PHYSICAL_CLOSE_REQUIRED",
        409,
      );
    }
    patch.administrativelyClosedAt = now;
    patch.administrativelyClosedBy = actor.userId;
    patch.deliveredAt = now;
  }
  if (status === "cancelada") patch.cancelledAt = now;

  await db.transaction(async (tx) => {
    await tx
      .update(productionOrders)
      .set(patch)
      .where(eq(productionOrders.id, row.id));

    if (row.machineId && (status === "en_produccion" || status === "pausada")) {
      await tx
        .update(machines)
        .set({
          status: status === "en_produccion" ? "en_produccion" : "disponible",
          updatedAt: now,
        })
        .where(eq(machines.id, row.machineId));
    }
    if (
      row.machineId &&
      (status === "calidad" ||
        status === "terminada" ||
        status === "entregada" ||
        status === "cancelada" ||
        status === "esperando_material")
    ) {
      await tx
        .update(machines)
        .set({ status: "disponible", updatedAt: now })
        .where(eq(machines.id, row.machineId));
    }

    if (status === "pausada" && pauseReasonId) {
      await tx.insert(productionDowntime).values({
        id: crypto.randomUUID(),
        productionOrderId: row.id,
        machineId: row.machineId,
        reasonId: pauseReasonId,
        startedAt: now,
        createdBy: actor.userId,
      });
    }

    if (status === "cancelada") {
      await releaseReservationsForOrder(tx, row.id, actor);
    }

    if (status === "terminada") {
      await receiveFinishedGoodsForOrder(tx, row.id, actor);
    }

    await recordActivity(tx, {
      actorUserId: actor.userId,
      actorName: actor.name,
      action:
        status === "cancelada"
          ? "cancelled"
          : status === "programada"
            ? "scheduled"
            : status === "liberada"
              ? "released"
              : status === "entregada" || status === "terminada"
                ? "closed"
                : "status_changed",
      entityType: "production_order",
      entityId: row.id,
      entityLabel: `${row.number} (${PRODUCTION_STATUS_LABELS[from]} → ${PRODUCTION_STATUS_LABELS[status]})`,
      previousValue: { status: from },
      newValue: { status, pauseReasonId: pauseReasonId ?? null },
    });
  });

  if (status === "calidad") {
    await ensureInspectionDraft(row.id, actor);
  }
}

export function requiredPermissionForStatus(to: ProductionStatus) {
  return permissionForProductionTransition(to);
}

export async function listProductionOrders(input: {
  q?: string;
  status?: ProductionStatus;
  delayed?: boolean;
  operatorUserId?: string;
  page?: number;
  pageSize?: number;
}) {
  const page = Math.max(1, input.page ?? 1);
  const pageSize = resolvePageSize(input.pageSize);
  const filters = [];
  if (input.status) filters.push(eq(productionOrders.status, input.status));
  if (input.operatorUserId) {
    filters.push(eq(productionOrders.operatorUserId, input.operatorUserId));
  }
  if (input.q) {
    const term = `%${input.q}%`;
    filters.push(
      or(
        ilike(productionOrders.number, term),
        ilike(productionOrders.partNumber, term),
        ilike(productionOrders.description, term),
        ilike(customers.legalName, term),
        ilike(orders.number, term),
        ilike(quotes.number, term),
      ),
    );
  }
  if (input.delayed) {
    filters.push(
      lt(productionOrders.promisedDate, new Date()),
      inArray(productionOrders.status, [
        "pendiente",
        "liberada",
        "programada",
        "en_produccion",
        "pausada",
        "esperando_material",
        "calidad",
      ]),
    );
  }

  const where = filters.length ? and(...filters) : undefined;
  const [totalRow] = await db
    .select({ value: count() })
    .from(productionOrders)
    .innerJoin(customers, eq(productionOrders.customerId, customers.id))
    .innerJoin(orders, eq(productionOrders.orderId, orders.id))
    .innerJoin(quotes, eq(productionOrders.quoteId, quotes.id))
    .where(where);

  const total = Number(totalRow.value);
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const rows = await db
    .select({
      id: productionOrders.id,
      number: productionOrders.number,
      partNumber: productionOrders.partNumber,
      orderId: productionOrders.orderId,
      orderNumber: orders.number,
      customerId: productionOrders.customerId,
      customerName: customers.legalName,
      quoteId: productionOrders.quoteId,
      quoteNumber: quotes.number,
      origin: productionOrders.origin,
      description: productionOrders.description,
      quantity: productionOrders.quantity,
      promisedDate: productionOrders.promisedDate,
      priority: productionOrders.priority,
      status: productionOrders.status,
      workCenterName: workCenters.name,
      machineName: machines.name,
      operatorName: users.name,
      isDemo: productionOrders.isDemo,
    })
    .from(productionOrders)
    .innerJoin(customers, eq(productionOrders.customerId, customers.id))
    .innerJoin(orders, eq(productionOrders.orderId, orders.id))
    .innerJoin(quotes, eq(productionOrders.quoteId, quotes.id))
    .leftJoin(workCenters, eq(productionOrders.workCenterId, workCenters.id))
    .leftJoin(machines, eq(productionOrders.machineId, machines.id))
    .leftJoin(users, eq(productionOrders.operatorUserId, users.id))
    .where(where)
    .orderBy(asc(productionOrders.priority), asc(productionOrders.promisedDate))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  return {
    rows: rows.map((row) => ({
      ...row,
      monitoring: productionMonitoring(row.promisedDate, row.status),
    })),
    total,
    page,
    pageSize,
    pageCount,
  };
}

export async function getProductionOrderById(id: string) {
  const [row] = await db
    .select({
      id: productionOrders.id,
      number: productionOrders.number,
      orderId: productionOrders.orderId,
      orderNumber: orders.number,
      orderItemId: productionOrders.orderItemId,
      customerId: productionOrders.customerId,
      customerName: customers.legalName,
      quoteId: productionOrders.quoteId,
      quoteNumber: quotes.number,
      rfqType: quotes.rfqType,
      engineeringRequestId: productionOrders.engineeringRequestId,
      engineeringNumber: engineeringRequests.number,
      engineeringStatus: engineeringRequests.status,
      origin: productionOrders.origin,
      routeId: productionOrders.routeId,
      description: productionOrders.description,
      partNumber: productionOrders.partNumber,
      quantity: productionOrders.quantity,
      unit: productionOrders.unit,
      promisedDate: productionOrders.promisedDate,
      priority: productionOrders.priority,
      status: productionOrders.status,
      notes: productionOrders.notes,
      workCenterId: productionOrders.workCenterId,
      workCenterName: workCenters.name,
      machineId: productionOrders.machineId,
      machineName: machines.name,
      operatorUserId: productionOrders.operatorUserId,
      operatorName: users.name,
      pauseReasonId: productionOrders.pauseReasonId,
      releasedAt: productionOrders.releasedAt,
      scheduledAt: productionOrders.scheduledAt,
      startedAt: productionOrders.startedAt,
      pausedAt: productionOrders.pausedAt,
      qualityAt: productionOrders.qualityAt,
      physicallyClosedAt: productionOrders.physicallyClosedAt,
      administrativelyClosedAt: productionOrders.administrativelyClosedAt,
      cancelledAt: productionOrders.cancelledAt,
      deliveredAt: productionOrders.deliveredAt,
      isDemo: productionOrders.isDemo,
      createdAt: productionOrders.createdAt,
      updatedAt: productionOrders.updatedAt,
    })
    .from(productionOrders)
    .innerJoin(customers, eq(productionOrders.customerId, customers.id))
    .innerJoin(orders, eq(productionOrders.orderId, orders.id))
    .innerJoin(quotes, eq(productionOrders.quoteId, quotes.id))
    .leftJoin(
      engineeringRequests,
      eq(productionOrders.engineeringRequestId, engineeringRequests.id),
    )
    .leftJoin(workCenters, eq(productionOrders.workCenterId, workCenters.id))
    .leftJoin(machines, eq(productionOrders.machineId, machines.id))
    .leftJoin(users, eq(productionOrders.operatorUserId, users.id))
    .where(eq(productionOrders.id, id))
    .limit(1);

  if (!row) return null;

  const operations = await db
    .select({
      id: productionOperations.id,
      position: productionOperations.position,
      kind: productionOperations.kind,
      name: productionOperations.name,
      status: productionOperations.status,
      workCenterId: productionOperations.workCenterId,
      workCenterName: workCenters.name,
      machineId: productionOperations.machineId,
      operatorUserId: productionOperations.operatorUserId,
      startedAt: productionOperations.startedAt,
      finishedAt: productionOperations.finishedAt,
    })
    .from(productionOperations)
    .leftJoin(workCenters, eq(productionOperations.workCenterId, workCenters.id))
    .where(eq(productionOperations.productionOrderId, id))
    .orderBy(asc(productionOperations.position));

  return {
    ...row,
    priority: row.priority as ProductionPriority,
    status: row.status as ProductionStatus,
    origin: row.origin as OrderOrigin,
    monitoring: productionMonitoring(row.promisedDate, row.status),
    operations,
  };
}

export async function listProductionByCustomer(customerId: string) {
  const rows = await db
    .select({
      id: productionOrders.id,
      number: productionOrders.number,
      partNumber: productionOrders.partNumber,
      status: productionOrders.status,
      promisedDate: productionOrders.promisedDate,
      priority: productionOrders.priority,
      orderId: productionOrders.orderId,
      orderNumber: orders.number,
    })
    .from(productionOrders)
    .innerJoin(orders, eq(productionOrders.orderId, orders.id))
    .where(eq(productionOrders.customerId, customerId))
    .orderBy(desc(productionOrders.createdAt));
  return rows.map((row) => ({
    ...row,
    monitoring: productionMonitoring(row.promisedDate, row.status),
  }));
}

export async function engineeringRequestHasProductionOrder(
  engineeringRequestId: string,
) {
  const [row] = await db
    .select({ id: productionOrders.id })
    .from(productionOrders)
    .where(eq(productionOrders.engineeringRequestId, engineeringRequestId))
    .limit(1);
  return Boolean(row);
}

export async function quoteHasProductionOrder(quoteId: string) {
  const [row] = await db
    .select({ id: productionOrders.id })
    .from(productionOrders)
    .where(eq(productionOrders.quoteId, quoteId))
    .limit(1);
  return Boolean(row);
}

export async function listUsersForProduction() {
  return db
    .select({ id: users.id, name: users.name, email: users.email })
    .from(users)
    .orderBy(asc(users.name));
}

export async function listDowntimeReasons(activeOnly = true) {
  return db
    .select()
    .from(downtimeReasons)
    .where(activeOnly ? eq(downtimeReasons.active, true) : undefined)
    .orderBy(asc(downtimeReasons.sortOrder));
}
