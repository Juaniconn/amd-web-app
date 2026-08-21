import "server-only";

import { sql, and, eq, ne, gte, lte, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  customers,
  machines,
  orders,
  productionOrders,
  users,
  workCenters,
  machineHours,
  laborHours,
  productionOperations,
} from "@/db/schema";
import {
  ACTIVE_PRODUCTION_STATUSES,
  PRODUCTION_STATUS_LABELS,
} from "@/lib/production/status";

export type TvMetric = {
  label: string;
  value: number;
  status: "green" | "yellow" | "red";
  hint?: string;
};

export type TvMachineStatus = {
  id: string;
  name: string;
  workCenter: string;
  status: "disponible" | "en_produccion" | "ocupada" | "mantenimiento" | "fuera_de_servicio";
  operatorName: string | null;
  currentPartNumber: string | null;
};

export type TvOrder = {
  id: string;
  number: string;
  customerName: string;
  totalParts: number;
  doneParts: number;
  status: string;
  promisedDate: Date | null;
  isDelayed: boolean;
};

export type TvDashboard = {
  generatedAt: string;
  orders: TvOrder[];
  machines: TvMachineStatus[];
  metrics: {
    activeParts: number;
    delayedParts: number;
    machineHoursToday: number;
    laborHoursToday: number;
    partsInProgress: number;
    partsInQuality: number;
  };
}

export async function getTvDashboard(): Promise<TvDashboard> {
  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);

  // Active parts count
  const [activeResult] = await db
    .select({ value: sql<number>`count(*)::int` })
    .from(productionOrders)
    .where(
      and(
        inArray(productionOrders.status, ACTIVE_PRODUCTION_STATUSES),
        ne(productionOrders.status, "cancelada"),
      ),
    );
  const activeParts = activeResult?.value ?? 0;

  // Delayed parts
  const [delayedResult] = await db
    .select({ value: sql<number>`count(*)::int` })
    .from(productionOrders)
    .where(
      and(
        lte(productionOrders.promisedDate, now),
        inArray(productionOrders.status, ["pendiente", "liberada", "programada", "en_produccion", "pausada", "esperando_material"]),
      ),
    );
  const delayedParts = delayedResult?.value ?? 0;

  // Machine hours today
  const [machineHoursResult] = await db
    .select({ value: sql<number>`coalesce(sum(duration_minutes), 0)::int` })
    .from(machineHours)
    .where(gte(machineHours.startedAt, startOfDay));
  const machineHoursToday = machineHoursResult?.value ?? 0;

  // Labor hours today
  const [laborHoursResult] = await db
    .select({ value: sql<number>`coalesce(sum(duration_minutes), 0)::int` })
    .from(laborHours)
    .where(gte(laborHours.startedAt, startOfDay));
  const laborHoursToday = laborHoursResult?.value ?? 0;

  // Parts in progress
  const [inProgressResult] = await db
    .select({ value: sql<number>`count(*)::int` })
    .from(productionOrders)
    .where(eq(productionOrders.status, "en_produccion"));
  const partsInProgress = inProgressResult?.value ?? 0;

  // Parts in quality
  const [qualityResult] = await db
    .select({ value: sql<number>`count(*)::int` })
    .from(productionOrders)
    .where(eq(productionOrders.status, "calidad"));
  const partsInQuality = qualityResult?.value ?? 0;

  // Orders with progress
  const ordersWithParts = await db
    .select({
      id: orders.id,
      number: orders.number,
      customerName: customers.legalName,
      promisedDate: orders.promisedDate,
    })
    .from(orders)
    .innerJoin(customers, eq(orders.customerId, customers.id))
    .where(
      inArray(orders.status, ["pendiente", "aprobado", "en_produccion"]),
    )
    .limit(20);

  const orderProgress = await Promise.all(
    ordersWithParts.map(async (order) => {
      const [totalResult] = await db
        .select({ value: sql<number>`count(*)::int` })
        .from(productionOrders)
        .where(
          and(
            eq(productionOrders.orderId, order.id),
            ne(productionOrders.status, "cancelada"),
          ),
        );
      const [doneResult] = await db
        .select({ value: sql<number>`count(*)::int` })
        .from(productionOrders)
        .where(
          and(
            eq(productionOrders.orderId, order.id),
            inArray(productionOrders.status, ["terminada", "entregada"]),
          ),
        );
      const total = totalResult?.value ?? 0;
      const done = doneResult?.value ?? 0;
      const isDelayed = total > 0 && done < total && !!order.promisedDate && order.promisedDate < now;
      return {
        ...order,
        totalParts: total,
        doneParts: done,
        status: orders.status ? "active" : "completed",
        isDelayed,
      };
    }),
  );

  // Machine status
  const machineRows = await db
    .select({
      id: machines.id,
      name: machines.name,
      workCenter: workCenters.name,
      status: machines.status,
      operatorName: users.name,
    })
    .from(machines)
    .innerJoin(workCenters, eq(machines.workCenterId, workCenters.id))
    .leftJoin(users, eq(machines.responsibleUserId, users.id))
    .where(eq(machines.active, true));

  const machinesWithParts = await Promise.all(
    machineRows.map(async (machine) => {
      const [currentJob] = await db
        .select({ number: productionOrders.number })
        .from(productionOrders)
        .where(
          and(
            eq(productionOrders.machineId, machine.id),
            eq(productionOrders.status, "en_produccion"),
          ),
        )
        .limit(1);
      return {
        ...machine,
        currentPartNumber: currentJob?.number ?? null,
      };
    }),
  );

  return {
    generatedAt: now.toISOString(),
    orders: orderProgress,
    machines: machinesWithParts,
    metrics: {
      activeParts,
      delayedParts,
      machineHoursToday,
      laborHoursToday,
      partsInProgress,
      partsInQuality,
    },
  };
}
