import "server-only";

import { and, asc, eq, inArray, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  customers,
  machines,
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
  orderId: string;
  orderNumber: string;
  customerName: string;
  workCenterName: string | null;
  machineName: string | null;
  operatorName: string | null;
  operatorId: string | null;
  promisedDate: Date;
  operationsTotal: number;
  operationsDone: number;
  isDelayed: boolean;
};

export type OrdersKanbanColumn = {
  id: string;
  label: string;
  color: string;
  orders: PartSummary[];
};

export type PartsKanbanColumn = {
  id: string;
  label: string;
  color: string;
  parts: PartSummary[];
};

export async function getOrdersKanbanBoard(): Promise<OrdersKanbanColumn[]> {
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

  const columns: OrdersKanbanColumn[] = [
    { id: "pendiente", label: "Pendiente", color: "bg-gray-100", orders: [] },
    { id: "liberada", label: "Liberada", color: "bg-blue-100", orders: [] },
    { id: "programada", label: "Programada", color: "bg-indigo-100", orders: [] },
    { id: "en_produccion", label: "En Producción", color: "bg-amber-100", orders: [] },
    { id: "pausada", label: "Pausada", color: "bg-orange-100", orders: [] },
    { id: "esperando_material", label: "Esperando Material", color: "bg-red-100", orders: [] },
    { id: "calidad", label: "Calidad", color: "bg-purple-100", orders: [] },
    { id: "terminada", label: "Terminada", color: "bg-green-100", orders: [] },
  ];

  for (const part of partsWithOps) {
    const col = columns.find((c) => c.id === part.status);
    if (col) col.orders.push(part);
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
