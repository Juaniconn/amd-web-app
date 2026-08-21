import "server-only";

import { and, asc, count, eq, inArray, ne } from "drizzle-orm";
import { db } from "@/db";
import {
  customers,
  machines,
  orders,
  productionOperations,
  productionOrders,
  workCenters,
} from "@/db/schema";
import { ACTIVE_PRODUCTION_STATUSES } from "@/lib/production/status";

export type MyProductionTask = {
  id: string;
  number: string;
  description: string;
  partNumber: string | null;
  quantity: string;
  unit: string;
  priority: "urgente" | "compromiso_inmediato" | "programada" | "produccion_normal";
  status: string;
  orderId: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  workCenterId: string | null;
  workCenterName: string | null;
  machineId: string | null;
  machineName: string | null;
  machineKind: string | null;
  promisedDate: Date;
  startedAt: Date | null;
  operationsTotal: number;
  operationsDone: number;
};

export async function listMyProductionTasks(
  operatorUserId: string,
): Promise<MyProductionTask[]> {
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
      customerId: productionOrders.customerId,
      customerName: customers.legalName,
      workCenterId: productionOrders.workCenterId,
      workCenterName: workCenters.name,
      machineId: productionOrders.machineId,
      machineName: machines.name,
      machineKind: machines.kind,
      promisedDate: productionOrders.promisedDate,
      startedAt: productionOrders.startedAt,
    })
    .from(productionOrders)
    .innerJoin(orders, eq(productionOrders.orderId, orders.id))
    .innerJoin(customers, eq(productionOrders.customerId, customers.id))
    .leftJoin(workCenters, eq(productionOrders.workCenterId, workCenters.id))
    .leftJoin(machines, eq(productionOrders.machineId, machines.id))
    .where(
      and(
        eq(productionOrders.operatorUserId, operatorUserId),
        inArray(productionOrders.status, ACTIVE_PRODUCTION_STATUSES),
        ne(productionOrders.status, "cancelada"),
      ),
    )
    .orderBy(asc(productionOrders.promisedDate), asc(productionOrders.priority));

  const tasks: MyProductionTask[] = await Promise.all(
    rows.map(async (row) => {
      const [totalResult] = await db
        .select({ value: count() })
        .from(productionOperations)
        .where(eq(productionOperations.productionOrderId, row.id));
      const [doneResult] = await db
        .select({ value: count() })
        .from(productionOperations)
        .where(
          and(
            eq(productionOperations.productionOrderId, row.id),
            eq(productionOperations.status, "terminada"),
          ),
        );
      return {
        ...row,
        operationsTotal: totalResult?.value ?? 0,
        operationsDone: doneResult?.value ?? 0,
      };
    }),
  );

  return tasks;
}
