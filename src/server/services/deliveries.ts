import "server-only";

import { and, desc, eq, ilike, ne, or, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  branches,
  customers,
  deliveries,
  orders,
  productionOrders,
} from "@/db/schema";
import { AppError } from "@/lib/errors";
import {
  canEditDelivery,
  canTransitionDelivery,
  DELIVERY_STATUS_LABELS,
  type DeliveryStatus,
} from "@/lib/deliveries/catalog";
import { formatQty } from "@/lib/inventory/catalog";
import type {
  ChangeDeliveryStatusInput,
  CreateDeliveryInput,
  UpdateDeliveryInput,
} from "@/lib/validation/deliveries";
import { recordActivity } from "@/server/services/activity";
import { createInvoiceFromOrder } from "@/server/services/billing";
import type { Actor } from "@/server/services/customers";
import { nextDocumentNumber } from "@/server/services/numbering";
import { resolvePageSize } from "@/lib/ui/pagination";

function yearPrefix(prefix: string) {
  return `${prefix}${new Date().getFullYear()}-`;
}

export async function listOrdersForDelivery() {
  return db
    .select({
      id: orders.id,
      number: orders.number,
      customerName: customers.legalName,
      shippingCity: customers.shippingCity,
      branchId: orders.branchId,
      status: orders.status,
    })
    .from(orders)
    .innerJoin(customers, eq(customers.id, orders.customerId))
    .where(ne(orders.status, "cancelado"))
    .orderBy(desc(orders.createdAt))
    .limit(200);
}

export async function listDeliveries(input?: {
  q?: string;
  status?: DeliveryStatus;
  page?: number;
  pageSize?: number;
}) {
  const page = Math.max(1, input?.page ?? 1);
  const pageSize = resolvePageSize(input?.pageSize);
  const filters = [];
  if (input?.status) filters.push(eq(deliveries.status, input.status));
  if (input?.q) {
    const term = `%${input.q}%`;
    filters.push(
      or(
        ilike(deliveries.number, term),
        ilike(orders.number, term),
        ilike(customers.legalName, term),
        ilike(deliveries.trackingNumber, term),
      ),
    );
  }
  const where = filters.length ? and(...filters) : undefined;
  const [countRow] = await db
    .select({ value: sql<number>`count(*)::int` })
    .from(deliveries)
    .innerJoin(orders, eq(orders.id, deliveries.orderId))
    .innerJoin(customers, eq(customers.id, orders.customerId))
    .where(where);
  const rows = await db
    .select({
      id: deliveries.id,
      number: deliveries.number,
      status: deliveries.status,
      scheduledDate: deliveries.scheduledDate,
      shippedAt: deliveries.shippedAt,
      deliveredAt: deliveries.deliveredAt,
      carrier: deliveries.carrier,
      trackingNumber: deliveries.trackingNumber,
      orderId: deliveries.orderId,
      orderNumber: orders.number,
      customerName: customers.legalName,
      shippingCity: customers.shippingCity,
      branchCode: branches.code,
    })
    .from(deliveries)
    .innerJoin(orders, eq(orders.id, deliveries.orderId))
    .innerJoin(customers, eq(customers.id, orders.customerId))
    .leftJoin(branches, eq(branches.id, deliveries.branchId))
    .where(where)
    .orderBy(desc(deliveries.createdAt))
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

export async function getDeliveryById(id: string) {
  const [row] = await db
    .select({
      delivery: deliveries,
      orderNumber: orders.number,
      customerId: orders.customerId,
      customerName: customers.legalName,
      shippingCity: customers.shippingCity,
      branchName: branches.name,
      branchCode: branches.code,
      otNumber: productionOrders.number,
    })
    .from(deliveries)
    .innerJoin(orders, eq(orders.id, deliveries.orderId))
    .innerJoin(customers, eq(customers.id, orders.customerId))
    .leftJoin(branches, eq(branches.id, deliveries.branchId))
    .leftJoin(productionOrders, eq(productionOrders.id, deliveries.productionOrderId))
    .where(eq(deliveries.id, id))
    .limit(1);
  if (!row) return null;
  const parts = await db
    .select({
      id: productionOrders.id,
      number: productionOrders.number,
      partNumber: productionOrders.partNumber,
      quantity: productionOrders.quantity,
      status: productionOrders.status,
    })
    .from(productionOrders)
    .where(eq(productionOrders.orderId, row.delivery.orderId))
    .orderBy(productionOrders.number);
  return {
    ...row.delivery,
    orderNumber: row.orderNumber,
    customerId: row.customerId,
    customerName: row.customerName,
    branchName: row.branchName,
    branchCode: row.branchCode,
    otNumber: row.otNumber,
    parts,
  };
}

async function shippingFromOrder(orderId: string) {
  const [row] = await db
    .select({
      order: orders,
      shippingAddress: customers.shippingAddress,
      shippingCity: customers.shippingCity,
      shippingState: customers.shippingState,
      shippingCountry: customers.shippingCountry,
      address: customers.address,
      city: customers.city,
      state: customers.state,
      country: customers.country,
    })
    .from(orders)
    .innerJoin(customers, eq(customers.id, orders.customerId))
    .where(eq(orders.id, orderId))
    .limit(1);
  if (!row) {
    throw new AppError("La orden de trabajo no existe.", "ORDER_NOT_FOUND", 404);
  }
  if (row.order.status === "cancelado") {
    throw new AppError("No se puede entregar una orden de trabajo cancelada.", "ORDER_CANCELLED", 409);
  }
  return row;
}

export async function createDelivery(
  input: Pick<CreateDeliveryInput, "orderId"> & Partial<CreateDeliveryInput>,
  actor: Actor,
) {
  const orderRow = await shippingFromOrder(input.orderId);
  const id = crypto.randomUUID();
  return db.transaction(async (tx) => {
    const number = await nextDocumentNumber(tx, "deliveries", yearPrefix("ENT-"));
    await tx.insert(deliveries).values({
      id,
      number,
      orderId: input.orderId,
      productionOrderId: input.productionOrderId ?? null,
      branchId: input.branchId ?? orderRow.order.branchId,
      scheduledDate: input.scheduledDate ? new Date(input.scheduledDate) : null,
      carrier: input.carrier ?? null,
      trackingNumber: input.trackingNumber ?? null,
      quantity: input.quantity ? formatQty(input.quantity) : null,
      shippingAddress:
        input.shippingAddress ?? orderRow.shippingAddress ?? orderRow.address,
      shippingCity: input.shippingCity ?? orderRow.shippingCity ?? orderRow.city,
      shippingState: input.shippingState ?? orderRow.shippingState ?? orderRow.state,
      shippingCountry:
        input.shippingCountry ?? orderRow.shippingCountry ?? orderRow.country,
      notes: input.notes ?? null,
      createdBy: actor.userId,
      updatedBy: actor.userId,
    });
    await recordActivity(tx, {
      actorUserId: actor.userId,
      actorName: actor.name,
      action: "created",
      entityType: "delivery",
      entityId: id,
      entityLabel: `${number} · ${orderRow.order.number}`,
      parentEntityType: "order",
      parentEntityId: input.orderId,
    });
    return { id, number };
  });
}

export async function getDeliveryByOrderId(orderId: string) {
  const [row] = await db
    .select({ id: deliveries.id, number: deliveries.number, status: deliveries.status })
    .from(deliveries)
    .where(eq(deliveries.orderId, orderId))
    .limit(1);
  return row ?? null;
}

export async function createDeliveryFromWorkOrder(orderId: string, actor: Actor) {
  const [existing] = await db
    .select({ id: deliveries.id, number: deliveries.number })
    .from(deliveries)
    .where(eq(deliveries.orderId, orderId))
    .limit(1);
  if (existing) return existing;

  const parts = await db
    .select({
      status: productionOrders.status,
      partNumber: productionOrders.partNumber,
      number: productionOrders.number,
    })
    .from(productionOrders)
    .where(eq(productionOrders.orderId, orderId));
  const blocking = parts.filter(
    (part) =>
      part.status !== "terminada" &&
      part.status !== "entregada" &&
      part.status !== "cancelada",
  );
  if (blocking.length > 0) {
    throw new AppError(
      "Todos los números de parte deben estar terminados antes de enviar a Entregas.",
      "PARTS_NOT_DONE",
      409,
    );
  }
  const labels = parts
    .filter((part) => part.status !== "cancelada")
    .map((part) => part.partNumber || part.number)
    .join(", ");
  return createDelivery(
    {
      orderId,
      notes: labels ? `Números de parte: ${labels}` : undefined,
    },
    actor,
  );
}

export async function updateDelivery(input: UpdateDeliveryInput, actor: Actor) {
  const existing = await getDeliveryById(input.id);
  if (!existing) {
    throw new AppError("La entrega no existe.", "DELIVERY_NOT_FOUND", 404);
  }
  if (!canEditDelivery(existing.status as DeliveryStatus)) {
    throw new AppError(
      "Esta entrega ya no se puede editar.",
      "DELIVERY_NOT_EDITABLE",
      409,
    );
  }
  await db
    .update(deliveries)
    .set({
      productionOrderId: input.productionOrderId ?? existing.productionOrderId,
      branchId: input.branchId ?? existing.branchId,
      scheduledDate: input.scheduledDate
        ? new Date(input.scheduledDate)
        : existing.scheduledDate,
      carrier: input.carrier ?? existing.carrier,
      trackingNumber: input.trackingNumber ?? existing.trackingNumber,
      quantity: input.quantity ? formatQty(input.quantity) : existing.quantity,
      shippingAddress: input.shippingAddress ?? existing.shippingAddress,
      shippingCity: input.shippingCity ?? existing.shippingCity,
      shippingState: input.shippingState ?? existing.shippingState,
      shippingCountry: input.shippingCountry ?? existing.shippingCountry,
      notes: input.notes ?? existing.notes,
      updatedBy: actor.userId,
      updatedAt: new Date(),
    })
    .where(eq(deliveries.id, input.id));
  await recordActivity(db, {
    actorUserId: actor.userId,
    actorName: actor.name,
    action: "updated",
    entityType: "delivery",
    entityId: input.id,
    entityLabel: existing.number,
    parentEntityType: "order",
    parentEntityId: existing.orderId,
  });
}

export async function changeDeliveryStatus(
  input: ChangeDeliveryStatusInput,
  actor: Actor,
) {
  const existing = await getDeliveryById(input.id);
  if (!existing) {
    throw new AppError("La entrega no existe.", "DELIVERY_NOT_FOUND", 404);
  }
  const from = existing.status as DeliveryStatus;
  if (!canTransitionDelivery(from, input.status)) {
    throw new AppError(
      `No se puede pasar de ${DELIVERY_STATUS_LABELS[from]} a ${DELIVERY_STATUS_LABELS[input.status]}.`,
      "DELIVERY_INVALID_TRANSITION",
      409,
    );
  }
  const now = new Date();
  await db
    .update(deliveries)
    .set({
      status: input.status,
      trackingNumber: input.trackingNumber ?? existing.trackingNumber,
      notes: input.notes ?? existing.notes,
      shippedAt:
        input.status === "enviado" ? (existing.shippedAt ?? now) : existing.shippedAt,
      deliveredAt:
        input.status === "entregado"
          ? (existing.deliveredAt ?? now)
          : existing.deliveredAt,
      updatedBy: actor.userId,
      updatedAt: now,
    })
    .where(eq(deliveries.id, input.id));
  await recordActivity(db, {
    actorUserId: actor.userId,
    actorName: actor.name,
    action: input.status === "entregado" ? "closed" : "status_changed",
    entityType: "delivery",
    entityId: input.id,
    entityLabel: `${existing.number} (${DELIVERY_STATUS_LABELS[from]} → ${DELIVERY_STATUS_LABELS[input.status]})`,
    parentEntityType: "order",
    parentEntityId: existing.orderId,
  });
  if (input.status === "entregado") {
    try {
      await createInvoiceFromOrder({ orderId: existing.orderId }, actor);
    } catch (error) {
      if (!(error instanceof AppError) || error.code !== "INVOICE_EXISTS") {
        throw error;
      }
    }
  }
}
