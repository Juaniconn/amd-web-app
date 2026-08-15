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
  orderItems,
  orders,
  productionOrders,
  projects,
  quotes,
  users,
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
import { ACTIVE_PRODUCTION_STATUSES } from "@/lib/production/status";
import type { UpdateOrderInput } from "@/lib/validation/orders";
import { recordActivity } from "@/server/services/activity";
import type { Actor } from "@/server/services/customers";

const PAGE_SIZE = 20;

async function loadOrderRow(id: string) {
  const [row] = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
  if (!row) {
    throw new AppError("El pedido no existe.", "ORDER_NOT_FOUND", 404);
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
}) {
  const page = Math.max(1, query.page ?? 1);
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
    .limit(PAGE_SIZE)
    .offset((page - 1) * PAGE_SIZE);

  const total = totalRow?.value ?? 0;
  return {
    rows,
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  };
}

export async function listOrdersByCustomer(customerId: string) {
  return db
    .select({
      id: orders.id,
      number: orders.number,
      status: orders.status,
      total: orders.total,
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
      status: productionOrders.status,
      promisedDate: productionOrders.promisedDate,
      partNumber: productionOrders.partNumber,
      quantity: productionOrders.quantity,
      orderItemId: productionOrders.orderItemId,
    })
    .from(productionOrders)
    .where(eq(productionOrders.orderId, id))
    .orderBy(desc(productionOrders.createdAt));

  const files = await db
    .select()
    .from(documents)
    .where(and(eq(documents.entityType, "order"), eq(documents.entityId, id)))
    .orderBy(desc(documents.createdAt));

  const openOtCount = ots.filter((ot) =>
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
    productionOrders: ots,
    documents: files,
    openOtCount,
  };
}

export async function updateOrder(input: UpdateOrderInput, actor: Actor) {
  const current = await loadOrderRow(input.id);
  if (!canEditOrder(current.status as OrderStatus)) {
    throw new AppError(
      "Este pedido ya no se puede editar.",
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
        "El proyecto debe pertenecer al mismo cliente del pedido.",
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
      `No se puede cambiar un pedido de ${ORDER_STATUS_LABELS[from]} a ${ORDER_STATUS_LABELS[nextStatus]}.`,
      "INVALID_TRANSITION",
      409,
    );
  }

  if (nextStatus === "completado" || nextStatus === "cancelado") {
    const open = await countOpenProductionOrders(id);
    if (open > 0) {
      throw new AppError(
        nextStatus === "completado"
          ? "No se puede completar el pedido mientras existan OT abiertas."
          : "No se puede cancelar el pedido mientras existan OT abiertas.",
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
      "Solo un pedido aprobado o en producción puede generar OT.",
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
