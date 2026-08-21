import "server-only";

import { and, eq, gte, inArray, lte, ne } from "drizzle-orm";
import { db } from "@/db";
import {
  customers,
  laborHours,
  machineHours,
  machines,
  orders,
  productionOrders,
  users,
  workCenters,
} from "@/db/schema";
import { ACTIVE_PRODUCTION_STATUSES } from "@/lib/production/status";

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
};

export async function getTvDashboard(): Promise<TvDashboard> {
  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);

  const activeRows = await db
    .select()
    .from(productionOrders)
    .where(
      and(
        inArray(productionOrders.status, ACTIVE_PRODUCTION_STATUSES),
        ne(productionOrders.status, "cancelada"),
      ),
    );
  const activeParts = activeRows.length;

  const delayedRows = await db
    .select()
    .from(productionOrders)
    .where(
      and(
        lte(productionOrders.promisedDate, now),
        inArray(productionOrders.status, ["pendiente", "liberada", "programada", "en_produccion", "pausada", "esperando_material"]),
      ),
    );
  const delayedParts = delayedRows.length;

  const machineHoursRows = await db
    .select()
    .from(machineHours)
    .where(gte(machineHours.startedAt, startOfDay));
  const machineHoursToday = machineHoursRows.reduce(
    (acc, row) => acc + (row.durationMinutes ?? 0),
    0,
  );

  const laborHoursRows = await db
    .select()
    .from(laborHours)
    .where(gte(laborHours.startedAt, startOfDay));
  const laborHoursToday = laborHoursRows.reduce(
    (acc, row) => acc + (row.durationMinutes ?? 0),
    0,
  );

  const inProgressRows = await db
    .select()
    .from(productionOrders)
    .where(eq(productionOrders.status, "en_produccion"));
  const partsInProgress = inProgressRows.length;

  const qualityRows = await db
    .select()
    .from(productionOrders)
    .where(eq(productionOrders.status, "calidad"));
  const partsInQuality = qualityRows.length;

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
      const total = await db
        .select()
        .from(productionOrders)
        .where(
          and(
            eq(productionOrders.orderId, order.id),
            ne(productionOrders.status, "cancelada"),
          ),
        );
      const done = await db
        .select()
        .from(productionOrders)
        .where(
          and(
            eq(productionOrders.orderId, order.id),
            inArray(productionOrders.status, ["terminada", "entregada"]),
          ),
        );
      const totalCount = total.length;
      const doneCount = done.length;
      const isDelayed = totalCount > 0 && doneCount < totalCount && !!order.promisedDate && order.promisedDate < now;
      return {
        ...order,
        totalParts: totalCount,
        doneParts: doneCount,
        status: "active",
        isDelayed,
      };
    }),
  );

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
      const currentJob = await db
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
        currentPartNumber: currentJob[0]?.number ?? null,
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
