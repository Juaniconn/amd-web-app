import "server-only";

import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  customers,
  machines,
  orders,
  productionOperations,
  productionOrders,
  workCenters,
} from "@/db/schema";

export type MyOperation = {
  /** id del proceso (production_operations) */
  id: string;
  position: number;
  name: string;
  kind: string;
  status: "pendiente" | "en_proceso" | "terminada" | "omitida";
  startedAt: Date | null;
  finishedAt: Date | null;
  workCenterName: string | null;
  machineName: string | null;
  /** contexto del número de parte al que pertenece */
  partId: string;
  partNumberLabel: string;
  partDescription: string;
  quantity: string;
  unit: string;
  priority: string;
  partStatus: string;
  promisedDate: Date;
  orderId: string;
  orderNumber: string;
  customerName: string;
  /** posición del proceso dentro de la ruta completa */
  totalStepsInPart: number;
  doneStepsInPart: number;
  /** true si todos los procesos anteriores ya están terminados */
  isUnblocked: boolean;
};

/**
 * Procesos asignados a un operador. El operador trabaja a nivel de PROCESO,
 * no de número de parte completo.
 *
 * Un proceso está "desbloqueado" cuando todos los procesos de posición
 * anterior en el mismo número de parte ya están terminados u omitidos.
 */
export async function listMyOperations(
  operatorUserId: string,
): Promise<MyOperation[]> {
  const rows = await db
    .select({
      id: productionOperations.id,
      position: productionOperations.position,
      name: productionOperations.name,
      kind: productionOperations.kind,
      status: productionOperations.status,
      startedAt: productionOperations.startedAt,
      finishedAt: productionOperations.finishedAt,
      opWorkCenterName: workCenters.name,
      opMachineName: machines.name,
      partId: productionOrders.id,
      partNumber: productionOrders.partNumber,
      partNumberFallback: productionOrders.number,
      partDescription: productionOrders.description,
      quantity: productionOrders.quantity,
      unit: productionOrders.unit,
      priority: productionOrders.priority,
      partStatus: productionOrders.status,
      promisedDate: productionOrders.promisedDate,
      orderId: productionOrders.orderId,
      orderNumber: orders.number,
      customerName: customers.legalName,
      totalStepsInPart: sql<number>`coalesce((
        select count(*)::int from production_operations po2
        where po2.production_order_id = ${productionOrders.id}
          and po2.status <> 'omitida'
      ), 0)`,
      doneStepsInPart: sql<number>`coalesce((
        select count(*)::int from production_operations po3
        where po3.production_order_id = ${productionOrders.id}
          and po3.status = 'terminada'
      ), 0)`,
      pendingBefore: sql<number>`coalesce((
        select count(*)::int from production_operations po4
        where po4.production_order_id = ${productionOrders.id}
          and po4.position < ${productionOperations.position}
          and po4.status not in ('terminada','omitida')
      ), 0)`,
    })
    .from(productionOperations)
    .innerJoin(
      productionOrders,
      eq(productionOperations.productionOrderId, productionOrders.id),
    )
    .innerJoin(orders, eq(productionOrders.orderId, orders.id))
    .innerJoin(customers, eq(productionOrders.customerId, customers.id))
    .leftJoin(workCenters, eq(productionOperations.workCenterId, workCenters.id))
    .leftJoin(machines, eq(productionOperations.machineId, machines.id))
    .where(
      and(
        eq(productionOperations.operatorUserId, operatorUserId),
        inArray(productionOperations.status, ["pendiente", "en_proceso"]),
        inArray(productionOrders.status, [
          "liberada",
          "programada",
          "en_produccion",
          "pausada",
        ]),
      ),
    )
    .orderBy(
      asc(productionOrders.promisedDate),
      asc(productionOrders.priority),
      asc(productionOperations.position),
    );

  return rows.map((row) => ({
    id: row.id,
    position: row.position,
    name: row.name,
    kind: row.kind,
    status: row.status as MyOperation["status"],
    startedAt: row.startedAt,
    finishedAt: row.finishedAt,
    workCenterName: row.opWorkCenterName,
    machineName: row.opMachineName,
    partId: row.partId,
    partNumberLabel: row.partNumber ?? row.partNumberFallback,
    partDescription: row.partDescription,
    quantity: row.quantity,
    unit: row.unit,
    priority: row.priority,
    partStatus: row.partStatus,
    promisedDate: row.promisedDate,
    orderId: row.orderId,
    orderNumber: row.orderNumber,
    customerName: row.customerName,
    totalStepsInPart: Number(row.totalStepsInPart ?? 0),
    doneStepsInPart: Number(row.doneStepsInPart ?? 0),
    isUnblocked: Number(row.pendingBefore ?? 0) === 0,
  }));
}

/** Resumen para el encabezado de la vista del operador */
export async function getMyOperationsSummary(operatorUserId: string) {
  const [row] = await db.execute<{
    in_progress: number;
    pending: number;
    done_today: number;
  }>(sql`
    select
      (select count(*)::int from production_operations
        where operator_user_id = ${operatorUserId}
          and status = 'en_proceso') as in_progress,
      (select count(*)::int from production_operations
        where operator_user_id = ${operatorUserId}
          and status = 'pendiente') as pending,
      (select count(*)::int from production_operations
        where operator_user_id = ${operatorUserId}
          and status = 'terminada'
          and finished_at >= date_trunc('day', now())) as done_today
  `);

  return {
    inProgress: Number(row?.in_progress ?? 0),
    pending: Number(row?.pending ?? 0),
    doneToday: Number(row?.done_today ?? 0),
  };
}
