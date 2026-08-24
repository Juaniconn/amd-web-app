import "server-only";

import { asc, eq, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  customers,
  machines,
  orders,
  productionOrders,
  users,
  workCenters,
} from "@/db/schema";

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
  operationsInProgress: number;
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

const COLUMN_DEFS = [
  { id: "pendiente", label: "Pendiente", color: "bg-gray-100" },
  { id: "liberada", label: "Liberada", color: "bg-blue-100" },
  { id: "programada", label: "Programada", color: "bg-indigo-100" },
  { id: "en_produccion", label: "En Producción", color: "bg-amber-100" },
  { id: "pausada", label: "Pausada", color: "bg-orange-100" },
  { id: "esperando_material", label: "Esperando Material", color: "bg-red-100" },
  { id: "calidad", label: "Calidad", color: "bg-purple-100" },
  { id: "terminada", label: "Terminada", color: "bg-green-100" },
] as const;

const CLOSED_STATUSES = ["terminada", "entregada", "cancelada"];

/**
 * Una sola query: trae cada número de parte con el conteo de sus procesos
 * (production_operations) calculado por subquery. Los procesos 'omitida' no
 * cuentan para el total porque no son trabajo pendiente.
 */
async function loadParts(): Promise<PartSummary[]> {
  const now = new Date();

  const rows = await db
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
      workCenterName: workCenters.name,
      machineName: machines.name,
      operatorName: users.name,
      operatorId: productionOrders.operatorUserId,
      promisedDate: productionOrders.promisedDate,
      operationsTotal: sql<number>`coalesce((
        select count(*)::int from production_operations
        where production_operations.production_order_id = ${productionOrders.id}
          and production_operations.status <> 'omitida'
      ), 0)`,
      operationsDone: sql<number>`coalesce((
        select count(*)::int from production_operations
        where production_operations.production_order_id = ${productionOrders.id}
          and production_operations.status = 'terminada'
      ), 0)`,
      operationsInProgress: sql<number>`coalesce((
        select count(*)::int from production_operations
        where production_operations.production_order_id = ${productionOrders.id}
          and production_operations.status = 'en_proceso'
      ), 0)`,
    })
    .from(productionOrders)
    .innerJoin(orders, eq(productionOrders.orderId, orders.id))
    .innerJoin(customers, eq(productionOrders.customerId, customers.id))
    .leftJoin(workCenters, eq(productionOrders.workCenterId, workCenters.id))
    .leftJoin(machines, eq(productionOrders.machineId, machines.id))
    .leftJoin(users, eq(productionOrders.operatorUserId, users.id))
    .where(ne(productionOrders.status, "cancelada"))
    .orderBy(asc(productionOrders.promisedDate));

  return rows.map((row) => ({
    ...row,
    operationsTotal: Number(row.operationsTotal ?? 0),
    operationsDone: Number(row.operationsDone ?? 0),
    operationsInProgress: Number(row.operationsInProgress ?? 0),
    isDelayed:
      row.promisedDate < now && !CLOSED_STATUSES.includes(row.status),
  }));
}

export async function getOrdersKanbanBoard(): Promise<OrdersKanbanColumn[]> {
  const parts = await loadParts();
  const columns: OrdersKanbanColumn[] = COLUMN_DEFS.map((def) => ({
    ...def,
    orders: [],
  }));
  for (const part of parts) {
    const col = columns.find((c) => c.id === part.status);
    if (col) col.orders.push(part);
  }
  return columns;
}

export async function getPartsKanbanBoard(): Promise<PartsKanbanColumn[]> {
  const parts = await loadParts();
  const columns: PartsKanbanColumn[] = COLUMN_DEFS.map((def) => ({
    ...def,
    parts: [],
  }));
  for (const part of parts) {
    const col = columns.find((c) => c.id === part.status);
    if (col) col.parts.push(part);
  }
  return columns;
}

export { loadParts, COLUMN_DEFS };
