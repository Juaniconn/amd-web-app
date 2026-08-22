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
  or,
  sql,
} from "drizzle-orm";
import { db } from "@/db";
import {
  customers,
  documents,
  engineeringRequests,
  machines,
  orderItems,
  orders,
  productionOperations,
  productionOrders,
  projects,
  quotes,
  users,
  workCenters,
} from "@/db/schema";
import { pickChangedFields } from "@/lib/audit/activity";
import { AppError } from "@/lib/errors";
import {
  canEditOrder,
  canIssueOtFromOrderStatus,
  canTransitionOrder,
  isActiveOrderStatus,
  ORDER_STATUS_LABELS,
  type OrderStatus,
} from "@/lib/orders/status";
import { ACTIVE_PRODUCTION_STATUSES, type ProductionStatus } from "@/lib/production/status";
import { isManufacturingItem } from "@/lib/quotes/items";
import type { UpdateOrderInput } from "@/lib/validation/orders";
import { resolvePageSize } from "@/lib/ui/pagination";
import { workOrderNumber } from "@/lib/production/ot-number";
import { recordActivity } from "@/server/services/activity";
import type { Actor } from "@/server/services/customers";

async function loadOrderRow(id: string) {
  const [row] = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
  if (!row) {
    throw new AppError("La orden de trabajo no existe.", "ORDER_NOT_FOUND", 404);
  }
  return row;
}

async function countOpenProductionOrders(orderId: string) {
  const [row] = await db
    .select({ value: count() })
    .from(productionOrders)
    .where(
      and(
        eq(productionOrders.orderId, orderId),
        inArray(productionOrders.status, [...ACTIVE_PRODUCTION_STATUSES]),
      ),
    );
  return row?.value ?? 0;
}

export async function listOrders(query: {
  q?: string;
  status?: OrderStatus;
  delayed?: boolean;
  customerId?: string;
  projectId?: string;
  page?: number;
  pageSize?: number;
}) {
  const page = Math.max(1, query.page ?? 1);
  const pageSize = resolvePageSize(query.pageSize);
  const filters = [];
  if (query.status) filters.push(eq(orders.status, query.status));
  if (query.customerId) filters.push(eq(orders.customerId, query.customerId));
  if (query.projectId) filters.push(eq(orders.projectId, query.projectId));
  if (query.q) {
    const term = `%${query.q}%`;
    filters.push(
      or(
        ilike(orders.number, term),
        ilike(customers.legalName, term),
        ilike(quotes.number, term),
        ilike(orders.notes, term),
        sql`('OT-' || ${orders.number}) ilike ${term}`,
        sql`exists (
          select 1 from order_items
          where order_items.order_id = ${orders.id}
            and order_items.part_number ilike ${term}
        )`,
      ),
    );
  }
  if (query.delayed) {
    filters.push(
      and(
        inArray(orders.status, ["pendiente", "aprobado", "en_produccion"]),
        lt(orders.promisedDate, new Date()),
      ),
    );
  }

  const where = filters.length > 0 ? and(...filters) : undefined;
  const [totalRow] = await db
    .select({ value: count() })
    .from(orders)
    .innerJoin(customers, eq(orders.customerId, customers.id))
    .innerJoin(quotes, eq(orders.quoteId, quotes.id))
    .where(where);

  const rows = await db
    .select({
      id: orders.id,
      number: orders.number,
      drawingCount: sql<number>`coalesce((
        select count(*)::int from order_items
        where order_items.order_id = ${orders.id}
          and order_items.kind <> 'servicio_ingenieria'
      ), 0)`,
      partsTotal: sql<number>`coalesce((
        select count(*)::int from production_orders
        where production_orders.order_id = ${orders.id}
      ), 0)`,
      partsDone: sql<number>`coalesce((
        select count(*)::int from production_orders
        where production_orders.order_id = ${orders.id}
          and production_orders.status in ('terminada','entregada')
      ), 0)`,
      partsInProduction: sql<number>`coalesce((
        select count(*)::int from production_orders
        where production_orders.order_id = ${orders.id}
          and production_orders.status = 'en_produccion'
      ), 0)`,
      opsTotal: sql<number>`coalesce((
        select count(*)::int from production_operations po
        join production_orders pr on pr.id = po.production_order_id
        where pr.order_id = ${orders.id}
          and po.status <> 'omitida'
      ), 0)`,
      opsDone: sql<number>`coalesce((
        select count(*)::int from production_operations po
        join production_orders pr on pr.id = po.production_order_id
        where pr.order_id = ${orders.id}
          and po.status = 'terminada'
      ), 0)`,
      status: orders.status,
      origin: orders.origin,
      total: orders.total,
      currency: orders.currency,
      promisedDate: orders.promisedDate,
      createdAt: orders.createdAt,
      isDemo: orders.isDemo,
      customerId: orders.customerId,
      customerName: customers.legalName,
      quoteId: orders.quoteId,
      quoteNumber: quotes.number,
      rfqType: quotes.rfqType,
      requiresEngineering: quotes.requiresEngineering,
      projectId: orders.projectId,
      projectCode: projects.code,
      projectName: projects.name,
      ownerName: users.name,
    })
    .from(orders)
    .innerJoin(customers, eq(orders.customerId, customers.id))
    .innerJoin(quotes, eq(orders.quoteId, quotes.id))
    .leftJoin(projects, eq(orders.projectId, projects.id))
    .leftJoin(users, eq(orders.ownerUserId, users.id))
    .where(where)
    .orderBy(desc(orders.createdAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  const total = totalRow?.value ?? 0;
  return {
    rows: rows.map((row) => ({
      ...row,
      drawingCount: Number(row.drawingCount ?? 0),
      partsTotal: Number(row.partsTotal ?? 0),
      partsDone: Number(row.partsDone ?? 0),
      partsInProduction: Number(row.partsInProduction ?? 0),
      opsTotal: Number(row.opsTotal ?? 0),
      opsDone: Number(row.opsDone ?? 0),
      workOrderNumber: workOrderNumber(row.number),
    })),
    total,
    page,
    pageSize,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function listWorkOrders(query: {
  q?: string;
  status?: ProductionStatus;
  delayed?: boolean;
  customerId?: string;
  page?: number;
  pageSize?: number;
}) {
  const page = Math.max(1, query.page ?? 1);
  const pageSize = resolvePageSize(query.pageSize);
  const filters = [];
  if (query.status) filters.push(eq(productionOrders.status, query.status));
  if (query.customerId) filters.push(eq(productionOrders.customerId, query.customerId));
  if (query.q) {
    const term = `%${query.q}%`;
    filters.push(
      or(
        ilike(productionOrders.number, term),
        ilike(productionOrders.partNumber, term),
        ilike(orderItems.partNumber, term),
        ilike(customers.legalName, term),
        ilike(quotes.number, term),
        ilike(orders.number, term),
      )!,
    );
  }
  if (query.delayed) {
    filters.push(
      and(
        inArray(productionOrders.status, [...ACTIVE_PRODUCTION_STATUSES]),
        lt(productionOrders.promisedDate, new Date()),
      )!,
    );
  }

  const where = filters.length > 0 ? and(...filters) : undefined;
  const [totalRow] = await db
    .select({ value: count() })
    .from(productionOrders)
    .innerJoin(customers, eq(productionOrders.customerId, customers.id))
    .innerJoin(orders, eq(productionOrders.orderId, orders.id))
    .innerJoin(quotes, eq(productionOrders.quoteId, quotes.id))
    .leftJoin(orderItems, eq(orderItems.id, productionOrders.orderItemId))
    .where(where);

  const rows = await db
    .select({
      id: productionOrders.id,
      number: productionOrders.number,
      partNumber: sql<string | null>`coalesce(${productionOrders.partNumber}, ${orderItems.partNumber})`,
      status: productionOrders.status,
      origin: orders.origin,
      total: sql<string>`coalesce(${orderItems.lineTotal}, ${orders.total})`,
      currency: orders.currency,
      promisedDate: productionOrders.promisedDate,
      isDemo: productionOrders.isDemo,
      customerId: productionOrders.customerId,
      customerName: customers.legalName,
      quoteId: productionOrders.quoteId,
      quoteNumber: quotes.number,
      rfqType: quotes.rfqType,
      orderId: orders.id,
      orderNumber: orders.number,
    })
    .from(productionOrders)
    .innerJoin(customers, eq(productionOrders.customerId, customers.id))
    .innerJoin(orders, eq(productionOrders.orderId, orders.id))
    .innerJoin(quotes, eq(productionOrders.quoteId, quotes.id))
    .leftJoin(orderItems, eq(orderItems.id, productionOrders.orderItemId))
    .where(where)
    .orderBy(desc(productionOrders.createdAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  const total = totalRow?.value ?? 0;
  return {
    rows,
    total,
    page,
    pageSize,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function resolveOrdersModuleId(id: string) {
  const [ot] = await db
    .select({
      workOrderId: productionOrders.id,
      orderId: productionOrders.orderId,
    })
    .from(productionOrders)
    .where(eq(productionOrders.id, id))
    .limit(1);
  if (ot) return ot;
  const [order] = await db
    .select({ orderId: orders.id })
    .from(orders)
    .where(eq(orders.id, id))
    .limit(1);
  if (!order) return null;
  return { workOrderId: null as string | null, orderId: order.orderId };
}

export async function listOrdersByCustomer(customerId: string) {
  const rows = await db
    .select({
      id: orders.id,
      number: orders.number,
      drawingCount: sql<number>`coalesce((
        select count(*)::int from order_items
        where order_items.order_id = ${orders.id}
          and order_items.kind <> 'servicio_ingenieria'
      ), 0)`,
      status: orders.status,
      currency: orders.currency,
      promisedDate: orders.promisedDate,
      createdAt: orders.createdAt,
      quoteId: orders.quoteId,
      quoteNumber: quotes.number,
    })
    .from(orders)
    .innerJoin(quotes, eq(orders.quoteId, quotes.id))
    .where(eq(orders.customerId, customerId))
    .orderBy(desc(orders.createdAt));
  return rows.map((row) => ({
    ...row,
    drawingCount: Number(row.drawingCount ?? 0),
    workOrderNumber: workOrderNumber(row.number),
  }));
}

export async function getOrderById(id: string) {
  const [row] = await db
    .select({
      order: orders,
      customerName: customers.legalName,
      customerCode: customers.code,
      quoteNumber: quotes.number,
      rfqType: quotes.rfqType,
      requiresEngineering: quotes.requiresEngineering,
      quoteEngineeringType: quotes.engineeringType,
      ownerName: users.name,
      projectCode: projects.code,
      projectName: projects.name,
      engineeringNumber: engineeringRequests.number,
      engineeringStatus: engineeringRequests.status,
    })
    .from(orders)
    .innerJoin(customers, eq(orders.customerId, customers.id))
    .innerJoin(quotes, eq(orders.quoteId, quotes.id))
    .leftJoin(users, eq(orders.ownerUserId, users.id))
    .leftJoin(projects, eq(orders.projectId, projects.id))
    .leftJoin(
      engineeringRequests,
      eq(orders.engineeringRequestId, engineeringRequests.id),
    )
    .where(eq(orders.id, id))
    .limit(1);

  if (!row) return null;

  const items = await db
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, id))
    .orderBy(asc(orderItems.position));

  const ots = await db
    .select({
      id: productionOrders.id,
      number: productionOrders.number,
      description: productionOrders.description,
      partNumber: productionOrders.partNumber,
      quantity: productionOrders.quantity,
      unit: productionOrders.unit,
      priority: productionOrders.priority,
      status: productionOrders.status,
      promisedDate: productionOrders.promisedDate,
      workCenterName: workCenters.name,
      machineName: machines.name,
      operatorName: users.name,
      orderItemId: productionOrders.orderItemId,
    })
    .from(productionOrders)
    .leftJoin(workCenters, eq(productionOrders.workCenterId, workCenters.id))
    .leftJoin(machines, eq(productionOrders.machineId, machines.id))
    .leftJoin(users, eq(productionOrders.operatorUserId, users.id))
    .where(eq(productionOrders.orderId, id))
    .orderBy(desc(productionOrders.createdAt));

  const otsWithOps = await Promise.all(
    ots.map(async (ot) => {
      const [totalOp] = await db
        .select({ value: sql<number>`count(*)::int` })
        .from(productionOperations)
        .where(eq(productionOperations.productionOrderId, ot.id));
      const [doneOp] = await db
        .select({ value: sql<number>`count(*)::int` })
        .from(productionOperations)
        .where(
          and(
            eq(productionOperations.productionOrderId, ot.id),
            eq(productionOperations.status, "terminada"),
          ),
        );
      return {
        ...ot,
        operationsTotal: totalOp?.value ?? 0,
        operationsDone: doneOp?.value ?? 0,
      };
    }),
  );

  const files = await db
    .select()
    .from(documents)
    .where(and(eq(documents.entityType, "order"), eq(documents.entityId, id)))
    .orderBy(desc(documents.createdAt));

  const openOtCount = otsWithOps.filter((ot) =>
    ACTIVE_PRODUCTION_STATUSES.includes(
      ot.status as (typeof ACTIVE_PRODUCTION_STATUSES)[number],
    ),
  ).length;

  return {
    ...row.order,
    customerName: row.customerName,
    customerCode: row.customerCode,
    quoteNumber: row.quoteNumber,
    rfqType: row.rfqType,
    requiresEngineering: row.requiresEngineering,
    quoteEngineeringType: row.quoteEngineeringType,
    ownerName: row.ownerName,
    projectCode: row.projectCode,
    projectName: row.projectName,
    engineeringNumber: row.engineeringNumber,
    engineeringStatus: row.engineeringStatus,
    items,
    productionOrders: otsWithOps,
    documents: files,
    openOtCount,
    drawingCount: items.filter((item) => isManufacturingItem(item.kind)).length,
  };
}

export async function updateOrder(input: UpdateOrderInput, actor: Actor) {
  const current = await loadOrderRow(input.id);
  if (!canEditOrder(current.status as OrderStatus)) {
    throw new AppError(
      "Esta orden de trabajo ya no se puede editar.",
      "ORDER_LOCKED",
      409,
    );
  }

  if (input.projectId) {
    const [project] = await db
      .select({ id: projects.id, customerId: projects.customerId })
      .from(projects)
      .where(eq(projects.id, input.projectId))
      .limit(1);
    if (!project) {
      throw new AppError("El proyecto no existe.", "PROJECT_NOT_FOUND", 404);
    }
    if (project.customerId !== current.customerId) {
      throw new AppError(
        "El proyecto debe pertenecer al mismo cliente de la orden de trabajo.",
        "PROJECT_CUSTOMER_MISMATCH",
        409,
      );
    }
  }

  const next = {
    ownerUserId: input.ownerUserId ?? null,
    promisedDate: input.promisedDate ?? null,
    notes: input.notes ?? null,
    projectId: input.projectId ?? null,
    updatedBy: actor.userId,
    updatedAt: new Date(),
  };
  const changed = pickChangedFields(
    {
      ownerUserId: current.ownerUserId,
      promisedDate: current.promisedDate?.toISOString() ?? null,
      notes: current.notes,
      projectId: current.projectId,
    },
    {
      ownerUserId: next.ownerUserId,
      promisedDate: next.promisedDate?.toISOString() ?? null,
      notes: next.notes,
      projectId: next.projectId,
    },
  );

  await db.transaction(async (tx) => {
    await tx.update(orders).set(next).where(eq(orders.id, input.id));
    if (Object.keys(changed.newValue).length > 0) {
      await recordActivity(tx, {
        actorUserId: actor.userId,
        actorName: actor.name,
        action: "updated",
        entityType: "order",
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

export async function changeOrderStatus(
  id: string,
  nextStatus: OrderStatus,
  actor: Actor,
) {
  const current = await loadOrderRow(id);
  const from = current.status as OrderStatus;
  if (!canTransitionOrder(from, nextStatus)) {
    throw new AppError(
      `No se puede cambiar una orden de trabajo de ${ORDER_STATUS_LABELS[from]} a ${ORDER_STATUS_LABELS[nextStatus]}.`,
      "INVALID_TRANSITION",
      409,
    );
  }

  if (nextStatus === "completado" || nextStatus === "cancelado") {
    const open = await countOpenProductionOrders(id);
    if (open > 0) {
      throw new AppError(
        nextStatus === "completado"
          ? "No se puede completar la orden de trabajo mientras existan números de parte abiertos."
          : "No se puede cancelar la orden de trabajo mientras existan números de parte abiertos.",
        "ORDER_HAS_OPEN_OT",
        409,
      );
    }
  }

  const action =
    nextStatus === "aprobado"
      ? ("approved" as const)
      : nextStatus === "cancelado"
        ? ("cancelled" as const)
        : nextStatus === "completado"
          ? ("closed" as const)
          : ("status_changed" as const);

  await db.transaction(async (tx) => {
    await tx
      .update(orders)
      .set({
        status: nextStatus,
        updatedBy: actor.userId,
        updatedAt: new Date(),
      })
      .where(eq(orders.id, id));
    await recordActivity(tx, {
      actorUserId: actor.userId,
      actorName: actor.name,
      action,
      entityType: "order",
      entityId: id,
      entityLabel: `${current.number} → ${ORDER_STATUS_LABELS[nextStatus]}`,
      parentEntityType: "customer",
      parentEntityId: current.customerId,
      previousValue: { status: from },
      newValue: { status: nextStatus },
    });
  });

  return { id, status: nextStatus };
}

export async function markOrderInProductionIfApproved(
  orderId: string,
  actor: Actor,
) {
  const current = await loadOrderRow(orderId);
  if (current.status !== "aprobado") return;
  await changeOrderStatus(orderId, "en_produccion", actor);
}

export function assertOrderEligibleForOt(status: OrderStatus) {
  if (!canIssueOtFromOrderStatus(status)) {
    throw new AppError(
      "Solo una orden de trabajo aprobada o en producción puede generar números de parte.",
      "ORDER_NOT_APPROVED",
      409,
    );
  }
}

export async function listUsersForOrders() {
  return db
    .select({ id: users.id, name: users.name, email: users.email })
    .from(users)
    .orderBy(asc(users.name));
}

export { isActiveOrderStatus };
