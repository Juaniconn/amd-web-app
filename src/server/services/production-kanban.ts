import "server-only";

import { and, asc, eq, inArray, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  customers,
  machines,
  orderItems,
  orders,
  productionOperations,
  productionOrders,
  users,
  workCenters,
} from "@/db/schema";
import { ACTIVE_PRODUCTION_STATUSES } from "@/lib/production/status";

export type PartSummary = {
  id: string;
  number: string;
  description: string;
  partNumber: string | null;
  quantity: string;
  unit: string;
  priority: string;
  status: string;
  workCenterName: string | null;
  machineName: string | null;
  operatorName: string | null;
  operatorId: string | null;
  promisedDate: Date;
  operationsTotal: number;
  operationsDone: number;
  isDelayed: boolean;
};

export type OrderWithParts = {
  id: string;
  number: string;
  customerName: string;
  status: string;
  promisedDate: Date | null;
  totalParts: number;
  activeParts: number;
  completedParts: number;
  hasDelayed: boolean;
  parts: PartSummary[];
};

export type OrdersKanbanColumn = {
  id: string;
  label: string;
  color: string;
  orders: OrderWithParts[];
};

export type PartsKanbanColumn = {
  id: string;
  label: string;
  color: string;
  parts: PartSummary[];
};

export async function getOrdersKanbanBoard(): Promise<OrdersKanbanColumn[]> {
  const now = new Date();

  // Get all orders that have production parts
  const ordersWithParts = await db
    .select({
      id: orders.id,
      number: orders.number,
      customerName: customers.legalName,
      status: orders.status,
      promisedDate: orders.promisedDate,
    })
    .from(orders)
    .innerJoin(customers, eq(orders.customerId, customers.id))
    .where(
      inArray(orders.status, ["pendiente", "aprobado", "en_produccion", "completado"]),
    );

  const ordersWithDetails: OrderWithParts[] = await Promise.all(
    ordersWithParts.map(async (order) => {
      const parts = await db
        .select()
        .from(productionOrders)
        .where(
          and(
            eq(productionOrders.orderId, order.id),
            ne(productionOrders.status, "cancelada"),
          ),
        );

      const activeParts = parts.filter((p) =>
        ACTIVE_PRODUCTION_STATUSES.includes(p.status as any),
      ).length;
      const completedParts = parts.filter(
        (p) => p.status === "terminada" || p.status === "entregada",
      ).length;
      const hasDelayed = parts.some(
        (p) => p.promisedDate < now && !["terminada", "entregada", "cancelada"].includes(p.status),
      );

      const partsSummary: PartSummary[] = await Promise.all(
        parts.map(async (part) => {
          const [totalOp] = await db
            .select({ value: sql<number>`count(*)::int` })
            .from(productionOperations)
            .where(eq(productionOperations.productionOrderId, part.id));
          const [doneOp] = await db
            .select({ value: sql<number>`count(*)::int` })
            .from(productionOperations)
            .where(
              and(
                eq(productionOperations.productionOrderId, part.id),
                eq(productionOperations.status, "terminada"),
              ),
            );

          const [wc] = part.workCenterId
            ? await db.select({ name: workCenters.name }).from(workCenters).where(eq(workCenters.id, part.workCenterId)).limit(1)
            : [];
          const [mc] = part.machineId
            ? await db.select({ name: machines.name }).from(machines).where(eq(machines.id, part.machineId)).limit(1)
            : [];
          const [op] = part.operatorUserId
            ? await db.select({ name: users.name }).from(users).where(eq(users.id, part.operatorUserId)).limit(1)
            : [];

          return {
            id: part.id,
            number: part.number,
            description: part.description,
            partNumber: part.partNumber,
            quantity: part.quantity,
            unit: part.unit,
            priority: part.priority,
            status: part.status,
            workCenterName: wc?.name ?? null,
            machineName: mc?.name ?? null,
            operatorName: op?.name ?? null,
            operatorId: part.operatorUserId,
            promisedDate: part.promisedDate,
            operationsTotal: totalOp?.value ?? 0,
            operationsDone: doneOp?.value ?? 0,
            isDelayed: part.promisedDate < now && !["terminada", "entregada", "cancelada"].includes(part.status),
          };
        }),
      );

      return {
        ...order,
        totalParts: parts.length,
        activeParts,
        completedParts,
        hasDelayed,
        parts: partsSummary,
      };
    }),
  );

  const columns: OrdersKanbanColumn[] = [
    { id: "pendiente", label: "Pendiente", color: "bg-gray-100", orders: [] },
    { id: "liberada", label: "Liberada", color: "bg-blue-100", orders: [] },
    { id: "programada", label: "Programada", color: "bg-indigo-100", orders: [] },
    { id: "en_produccion", label: "En Producción", color: "bg-amber-100", orders: [] },
    { id: "completado", label: "Completado", color: "bg-green-100", orders: [] },
  ];

  for (const order of ordersWithDetails) {
    // Determine order status based on parts
    const allDone = order.totalParts > 0 && order.completedParts === order.totalParts;
    const anyActive = order.activeParts > 0;
    const columnId = allDone ? "completado" : anyActive ? "en_produccion" : "pendiente";
    const col = columns.find((c) => c.id === columnId);
    if (col) col.orders.push(order);
  }

  return columns;
}

export async function getPartsKanbanBoard(): Promise<PartsKanbanColumn[]> {
  const now = new Date();

  const allParts = await db
    .select({
      id: productionOrders.id,
      number: productionOrders.number,
      description: productionOrders.description,
      partNumber: productionOrders.partNumber,
      quantity: productionOrders.quantity,
      unit: productionOrders.unit,
      priority: productionOrders.priority,
      status: productionOrders.status,
      orderId: productionOrders.orderId,
      orderNumber: orders.number,
      customerName: customers.legalName,
      workCenterId: productionOrders.workCenterId,
      machineId: productionOrders.machineId,
      operatorUserId: productionOrders.operatorUserId,
      promisedDate: productionOrders.promisedDate,
    })
    .from(productionOrders)
    .innerJoin(orders, eq(productionOrders.orderId, orders.id))
    .innerJoin(customers, eq(productionOrders.customerId, customers.id))
    .where(ne(productionOrders.status, "cancelada"))
    .orderBy(asc(productionOrders.promisedDate));

  const partsWithOps = await Promise.all(
    allParts.map(async (row) => {
      const [totalOp] = await db
        .select({ value: sql<number>`count(*)::int` })
        .from(productionOperations)
        .where(eq(productionOperations.productionOrderId, row.id));
      const [doneOp] = await db
        .select({ value: sql<number>`count(*)::int` })
        .from(productionOperations)
        .where(
          and(
            eq(productionOperations.productionOrderId, row.id),
            eq(productionOperations.status, "terminada"),
          ),
        );

      const [wc] = row.workCenterId
        ? await db.select({ name: workCenters.name }).from(workCenters).where(eq(workCenters.id, row.workCenterId)).limit(1)
        : [];
      const [mc] = row.machineId
        ? await db.select({ name: machines.name }).from(machines).where(eq(machines.id, row.machineId)).limit(1)
        : [];
      const [op] = row.operatorUserId
        ? await db.select({ name: users.name }).from(users).where(eq(users.id, row.operatorUserId)).limit(1)
        : [];

      return {
        ...row,
        workCenterName: wc?.name ?? null,
        machineName: mc?.name ?? null,
        operatorName: op?.name ?? null,
        operatorId: row.operatorUserId,
        operationsTotal: totalOp?.value ?? 0,
        operationsDone: doneOp?.value ?? 0,
        isDelayed: row.promisedDate < now && !["terminada", "entregada", "cancelada"].includes(row.status),
      };
    }),
  );

  const columns: PartsKanbanColumn[] = [
    { id: "pendiente", label: "Pendiente", color: "bg-gray-100", parts: [] },
    { id: "liberada", label: "Liberada", color: "bg-blue-100", parts: [] },
    { id: "programada", label: "Programada", color: "bg-indigo-100", parts: [] },
    { id: "en_produccion", label: "En Producción", color: "bg-amber-100", parts: [] },
    { id: "pausada", label: "Pausada", color: "bg-orange-100", parts: [] },
    { id: "esperando_material", label: "Esperando Material", color: "bg-red-100", parts: [] },
    { id: "calidad", label: "Calidad", color: "bg-purple-100", parts: [] },
    { id: "terminada", label: "Terminada", color: "bg-green-100", parts: [] },
  ];

  for (const part of partsWithOps) {
    const col = columns.find((c) => c.id === part.status);
    if (col) col.parts.push(part);
  }

  return columns;
}
