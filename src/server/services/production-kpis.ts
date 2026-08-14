import "server-only";

import { and, count, eq, gte, inArray, isNotNull, lt, sql, sum } from "drizzle-orm";
import { db } from "@/db";
import {
  laborHours,
  machineHours,
  machines,
  productionOrders,
  workCenters,
} from "@/db/schema";
import { minutesToHours } from "@/lib/production/catalog";
import { ACTIVE_PRODUCTION_STATUSES } from "@/lib/production/status";

function startOfWeek(now: Date) {
  const date = new Date(now);
  const day = date.getDay();
  const diff = day === 0 ? 6 : day - 1;
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - diff);
  return date;
}

function startOfMonth(now: Date) {
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

async function hoursForCenter(
  code: string,
  from: Date,
): Promise<{ hours: number; machines: number; capacityHours: number }> {
  const [row] = await db
    .select({
      minutes: sum(machineHours.durationMinutes),
    })
    .from(machineHours)
    .innerJoin(machines, eq(machineHours.machineId, machines.id))
    .innerJoin(workCenters, eq(machines.workCenterId, workCenters.id))
    .where(
      and(
        eq(workCenters.code, code),
        isNotNull(machineHours.durationMinutes),
        gte(machineHours.startedAt, from),
      ),
    );

  const machineRows = await db
    .select({
      id: machines.id,
      hoursPerShift: machines.hoursPerShift,
    })
    .from(machines)
    .innerJoin(workCenters, eq(machines.workCenterId, workCenters.id))
    .where(and(eq(workCenters.code, code), eq(machines.active, true)));

  const weekDays = 5;
  const capacityHours = machineRows.reduce((acc, machine) => {
    return acc + Number(machine.hoursPerShift) * weekDays;
  }, 0);

  return {
    hours: minutesToHours(Number(row?.minutes ?? 0)),
    machines: machineRows.length,
    capacityHours,
  };
}

export async function getProductionDashboardStats() {
  const now = new Date();
  const weekStart = startOfWeek(now);
  const monthStart = startOfMonth(now);

  const [activeRow] = await db
    .select({ value: count() })
    .from(productionOrders)
    .where(inArray(productionOrders.status, [...ACTIVE_PRODUCTION_STATUSES]));

  const [delayedRow] = await db
    .select({ value: count() })
    .from(productionOrders)
    .where(
      and(
        inArray(productionOrders.status, [...ACTIVE_PRODUCTION_STATUSES]),
        lt(productionOrders.promisedDate, now),
      ),
    );

  const [finishedRow] = await db
    .select({ value: count() })
    .from(productionOrders)
    .where(
      inArray(productionOrders.status, ["terminada", "entregada"]),
    );

  const [weeklyRow] = await db
    .select({ value: count() })
    .from(productionOrders)
    .where(
      and(
        inArray(productionOrders.status, ["terminada", "entregada"]),
        gte(productionOrders.physicallyClosedAt, weekStart),
      ),
    );

  const [monthlyRow] = await db
    .select({ value: count() })
    .from(productionOrders)
    .where(
      and(
        inArray(productionOrders.status, ["terminada", "entregada"]),
        gte(productionOrders.physicallyClosedAt, monthStart),
      ),
    );

  const [onTimeRow] = await db
    .select({ value: count() })
    .from(productionOrders)
    .where(
      and(
        inArray(productionOrders.status, ["terminada", "entregada"]),
        sql`${productionOrders.physicallyClosedAt} is not null`,
        sql`${productionOrders.physicallyClosedAt} <= ${productionOrders.promisedDate}`,
      ),
    );

  const closed = Number(finishedRow.value);
  const [machineMinutes] = await db
    .select({ value: sum(machineHours.durationMinutes) })
    .from(machineHours)
    .where(isNotNull(machineHours.durationMinutes));
  const [laborMinutes] = await db
    .select({ value: sum(laborHours.durationMinutes) })
    .from(laborHours)
    .where(isNotNull(laborHours.durationMinutes));

  const cnc = await hoursForCenter("cnc", weekStart);
  const laser = await hoursForCenter("laser", weekStart);
  const tornos = await hoursForCenter("tornos", weekStart);

  const utilization = (load: { hours: number; capacityHours: number }) =>
    load.capacityHours > 0
      ? Math.round((load.hours / load.capacityHours) * 1000) / 10
      : 0;

  return {
    active: Number(activeRow.value),
    delayed: Number(delayedRow.value),
    finished: closed,
    weeklyFinished: Number(weeklyRow.value),
    monthlyFinished: Number(monthlyRow.value),
    machineHours: minutesToHours(Number(machineMinutes.value ?? 0)),
    laborHours: minutesToHours(Number(laborMinutes.value ?? 0)),
    deliveryCompliance:
      closed > 0
        ? Math.round((Number(onTimeRow.value) / closed) * 1000) / 10
        : null,
    cncLoadHours: cnc.hours,
    cncUtilization: utilization(cnc),
    laserLoadHours: laser.hours,
    laserUtilization: utilization(laser),
    tornosLoadHours: tornos.hours,
    tornosUtilization: utilization(tornos),
  };
}
