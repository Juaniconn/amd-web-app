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

export type KanbanTask = {
  id: string;
  number: string;
  description: string;
  partNumber: string | null;
  quantity: string;
  unit: string;
  priority: "urgente" | "compromiso_inmediato" | "programada" | "produccion_normal";
  status: string;
  orderNumber: string;
  customerName: string;
  workCenterName: string | null;
  machineName: string | null;
  operatorName: string | null;
  operatorId: string | null;
  promisedDate: Date;
  startedAt: Date | null;
  operationsTotal: number;
  operationsDone: number;
  isDelayed: boolean;
};

export type KanbanColumn = {
  id: string;
  label: string;
  color: string;
  tasks: KanbanTask[];
};

const DELAYED_STATUSES = [
  "pendiente",
  "liberada",
  "programada",
  "en_produccion",
  "pausada",
  "esperando_material",
] as const;

export async function getKanbanBoard(): Promise<KanbanColumn[]> {
  const allTasks = await db
    .select({
      id: productionOrders.id,
      number: productionOrders.number,
      description: productionOrders.description,
      partNumber: productionOrders.partNumber,
      quantity: productionOrders.quantity,
      unit: productionOrders.unit,
      priority: productionOrders.priority,
      status: productionOrders.status,
      orderNumber: orders.number,
      customerName: customers.legalName,
      workCenterName: workCenters.name,
      machineName: machines.name,
      operatorName: users.name,
      operatorId: productionOrders.operatorUserId,
      promisedDate: productionOrders.promisedDate,
      startedAt: productionOrders.startedAt,
    })
    .from(productionOrders)
    .innerJoin(orders, eq(productionOrders.orderId, orders.id))
    .innerJoin(customers, eq(productionOrders.customerId, customers.id))
    .leftJoin(workCenters, eq(productionOrders.workCenterId, workCenters.id))
    .leftJoin(machines, eq(productionOrders.machineId, machines.id))
    .leftJoin(users, eq(productionOrders.operatorUserId, users.id))
    .orderBy(asc(productionOrders.promisedDate), asc(productionOrders.priority));

  const tasksWithOps = await Promise.all(
    allTasks.map(async (row) => {
      const [totalResult] = await db
        .select({ value: sql<number>`count(*)::int` })
        .from(productionOperations)
        .where(eq(productionOperations.productionOrderId, row.id));
      const [doneResult] = await db
        .select({ value: sql<number>`count(*)::int` })
        .from(productionOperations)
        .where(
          and(
            eq(productionOperations.productionOrderId, row.id),
            eq(productionOperations.status, "terminada"),
          ),
        );
      const isDelayed =
        row.promisedDate < now &&
        DELAYED_STATUSES.includes(row.status as typeof DELAYED_STATUSES[number]);
      return {
        ...row,
        operationsTotal: totalResult?.value ?? 0,
        operationsDone: doneResult?.value ?? 0,
        isDelayed,
      };
    }),
  );

  const now = new Date();
  const columns: KanbanColumn[] = [
    {
      id: "pendiente",
      label: "Pendiente",
      color: "bg-gray-100",
      tasks: tasksWithOps.filter((t) => t.status === "pendiente"),
    },
    {
      id: "liberada",
      label: "Liberada",
      color: "bg-blue-100",
      tasks: tasksWithOps.filter((t) => t.status === "liberada"),
    },
    {
      id: "programada",
      label: "Programada",
      color: "bg-indigo-100",
      tasks: tasksWithOps.filter((t) => t.status === "programada"),
    },
    {
      id: "en_produccion",
      label: "En Producción",
      color: "bg-amber-100",
      tasks: tasksWithOps.filter((t) => t.status === "en_produccion"),
    },
    {
      id: "pausada",
      label: "Pausada",
      color: "bg-orange-100",
      tasks: tasksWithOps.filter((t) => t.status === "pausada"),
    },
    {
      id: "esperando_material",
      label: "Esperando Material",
      color: "bg-red-100",
      tasks: tasksWithOps.filter((t) => t.status === "esperando_material"),
    },
    {
      id: "calidad",
      label: "Calidad",
      color: "bg-purple-100",
      tasks: tasksWithOps.filter((t) => t.status === "calidad"),
    },
    {
      id: "terminada",
      label: "Terminada",
      color: "bg-green-100",
      tasks: tasksWithOps.filter((t) => t.status === "terminada"),
    },
  ];

  return columns;
}
