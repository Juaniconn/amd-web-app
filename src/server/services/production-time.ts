import "server-only";

import { and, asc, desc, eq, isNull, sql, sum } from "drizzle-orm";
import { db } from "@/db";
import {
  laborHours,
  machineHours,
  machines,
  productionDowntime,
  productionOrders,
  productionRework,
  users,
} from "@/db/schema";
import { durationMinutes } from "@/lib/production/catalog";
import { canLogProductionTime, type ProductionStatus } from "@/lib/production/status";
import { AppError } from "@/lib/errors";
import type {
  CreateReworkInput,
  LogDowntimeInput,
  StartTimeEntryInput,
  StopTimeEntryInput,
} from "@/lib/validation/production";
import { recordActivity } from "@/server/services/activity";
import type { Actor } from "@/server/services/customers";

async function loadOp(id: string) {
  const [row] = await db
    .select()
    .from(productionOrders)
    .where(eq(productionOrders.id, id))
    .limit(1);
  if (!row) {
    throw new AppError("La orden de trabajo no existe.", "OP_NOT_FOUND", 404);
  }
  return row;
}

export async function startMachineHours(input: StartTimeEntryInput, actor: Actor) {
  const op = await loadOp(input.productionOrderId);
  if (!canLogProductionTime(op.status as ProductionStatus)) {
    throw new AppError(
      "Solo se registran horas con la OT en producción, pausada o calidad.",
      "OP_TIME_LOCKED",
      409,
    );
  }
  const machineId = input.machineId ?? op.machineId;
  if (!machineId) {
    throw new AppError("Asigna una máquina antes de registrar horas máquina.", "MACHINE_REQUIRED", 409);
  }
  const startedAt = input.startedAt ?? new Date();
  const id = crypto.randomUUID();
  try {
    await db.insert(machineHours).values({
      id,
      productionOrderId: op.id,
      operationId: input.operationId ?? null,
      machineId,
      operatorUserId: input.operatorUserId ?? op.operatorUserId,
      startedAt,
      notes: input.notes ?? null,
      createdBy: actor.userId,
    });
  } catch {
    throw new AppError(
      "Esa máquina ya tiene un registro de horas abierto.",
      "MACHINE_HOURS_OPEN",
      409,
    );
  }
  await recordActivity(db, {
    actorUserId: actor.userId,
    actorName: actor.name,
    action: "hours_logged",
    entityType: "machine_hours",
    entityId: id,
    entityLabel: op.number,
    parentEntityType: "production_order",
    parentEntityId: op.id,
  });
  return { id };
}

export async function stopMachineHours(input: StopTimeEntryInput, actor: Actor) {
  const [row] = await db
    .select()
    .from(machineHours)
    .where(eq(machineHours.id, input.id))
    .limit(1);
  if (!row) {
    throw new AppError("El registro de horas máquina no existe.", "HOURS_NOT_FOUND", 404);
  }
  if (row.endedAt) {
    throw new AppError("Ese registro ya está cerrado.", "HOURS_CLOSED", 409);
  }
  const endedAt = input.endedAt ?? new Date();
  if (endedAt.getTime() < row.startedAt.getTime()) {
    throw new AppError("La hora de fin no puede ser anterior al inicio.", "HOURS_RANGE", 400);
  }
  await db
    .update(machineHours)
    .set({
      endedAt,
      durationMinutes: durationMinutes(row.startedAt, endedAt),
    })
    .where(eq(machineHours.id, row.id));
  void actor;
}

export async function startLaborHours(input: StartTimeEntryInput, actor: Actor) {
  const op = await loadOp(input.productionOrderId);
  if (!canLogProductionTime(op.status as ProductionStatus)) {
    throw new AppError(
      "Solo se registran horas con la OT en producción, pausada o calidad.",
      "OP_TIME_LOCKED",
      409,
    );
  }
  const operatorUserId = input.operatorUserId ?? op.operatorUserId;
  if (!operatorUserId) {
    throw new AppError(
      "Asigna un operador antes de registrar horas hombre.",
      "OPERATOR_REQUIRED",
      409,
    );
  }
  const startedAt = input.startedAt ?? new Date();
  const id = crypto.randomUUID();
  try {
    await db.insert(laborHours).values({
      id,
      productionOrderId: op.id,
      operationId: input.operationId ?? null,
      operatorUserId,
      startedAt,
      notes: input.notes ?? null,
      createdBy: actor.userId,
    });
  } catch {
    throw new AppError(
      "Ese operador ya tiene un registro de horas abierto.",
      "LABOR_HOURS_OPEN",
      409,
    );
  }
  await recordActivity(db, {
    actorUserId: actor.userId,
    actorName: actor.name,
    action: "hours_logged",
    entityType: "labor_hours",
    entityId: id,
    entityLabel: op.number,
    parentEntityType: "production_order",
    parentEntityId: op.id,
  });
  return { id };
}

export async function stopLaborHours(input: StopTimeEntryInput, actor: Actor) {
  const [row] = await db
    .select()
    .from(laborHours)
    .where(eq(laborHours.id, input.id))
    .limit(1);
  if (!row) {
    throw new AppError("El registro de horas hombre no existe.", "HOURS_NOT_FOUND", 404);
  }
  if (row.endedAt) {
    throw new AppError("Ese registro ya está cerrado.", "HOURS_CLOSED", 409);
  }
  const endedAt = input.endedAt ?? new Date();
  if (endedAt.getTime() < row.startedAt.getTime()) {
    throw new AppError("La hora de fin no puede ser anterior al inicio.", "HOURS_RANGE", 400);
  }
  await db
    .update(laborHours)
    .set({
      endedAt,
      durationMinutes: durationMinutes(row.startedAt, endedAt),
    })
    .where(eq(laborHours.id, row.id));
  void actor;
}

export async function logDowntime(input: LogDowntimeInput, actor: Actor) {
  const op = await loadOp(input.productionOrderId);
  const startedAt = input.startedAt ?? new Date();
  const endedAt = input.endedAt ?? null;
  const id = crypto.randomUUID();
  await db.insert(productionDowntime).values({
    id,
    productionOrderId: op.id,
    machineId: input.machineId ?? op.machineId,
    reasonId: input.reasonId,
    startedAt,
    endedAt,
    durationMinutes: endedAt ? durationMinutes(startedAt, endedAt) : null,
    notes: input.notes ?? null,
    createdBy: actor.userId,
  });
  await recordActivity(db, {
    actorUserId: actor.userId,
    actorName: actor.name,
    action: "downtime_logged",
    entityType: "production_downtime",
    entityId: id,
    entityLabel: op.number,
    parentEntityType: "production_order",
    parentEntityId: op.id,
  });
  return { id };
}

export async function createRework(input: CreateReworkInput, actor: Actor) {
  const op = await loadOp(input.productionOrderId);
  const id = crypto.randomUUID();
  await db.insert(productionRework).values({
    id,
    productionOrderId: op.id,
    partNumber: input.partNumber ?? op.partNumber,
    quantity: String(input.quantity),
    scrapQuantity: String(input.scrapQuantity),
    rootCause: input.rootCause ?? "Retrabajo de piso",
    laborHours: String(input.laborHours),
    machineHours: String(input.machineHours),
    notes: input.notes ?? null,
    createdBy: actor.userId,
  });
  await recordActivity(db, {
    actorUserId: actor.userId,
    actorName: actor.name,
    action: "rework_logged",
    entityType: "production_rework",
    entityId: id,
    entityLabel: op.number,
    parentEntityType: "production_order",
    parentEntityId: op.id,
  });
  return { id };
}

export async function releaseRework(id: string, actor: Actor) {
  const [row] = await db
    .select()
    .from(productionRework)
    .where(eq(productionRework.id, id))
    .limit(1);
  if (!row) {
    throw new AppError("El retrabajo no existe.", "REWORK_NOT_FOUND", 404);
  }
  await db
    .update(productionRework)
    .set({
      qualityReleased: true,
      qualityReleasedAt: new Date(),
      qualityReleasedBy: actor.userId,
      updatedAt: new Date(),
    })
    .where(eq(productionRework.id, id));
  await recordActivity(db, {
    actorUserId: actor.userId,
    actorName: actor.name,
    action: "released",
    entityType: "production_rework",
    entityId: id,
    entityLabel: row.productionOrderId,
    parentEntityType: "production_order",
    parentEntityId: row.productionOrderId,
  });
}

export async function listMachineHours(productionOrderId: string) {
  return db
    .select({
      id: machineHours.id,
      machineId: machineHours.machineId,
      machineName: machines.name,
      operatorUserId: machineHours.operatorUserId,
      operatorName: users.name,
      startedAt: machineHours.startedAt,
      endedAt: machineHours.endedAt,
      durationMinutes: machineHours.durationMinutes,
      notes: machineHours.notes,
    })
    .from(machineHours)
    .innerJoin(machines, eq(machineHours.machineId, machines.id))
    .leftJoin(users, eq(machineHours.operatorUserId, users.id))
    .where(eq(machineHours.productionOrderId, productionOrderId))
    .orderBy(desc(machineHours.startedAt));
}

export async function listLaborHours(productionOrderId: string) {
  return db
    .select({
      id: laborHours.id,
      operatorUserId: laborHours.operatorUserId,
      operatorName: users.name,
      startedAt: laborHours.startedAt,
      endedAt: laborHours.endedAt,
      durationMinutes: laborHours.durationMinutes,
      notes: laborHours.notes,
    })
    .from(laborHours)
    .innerJoin(users, eq(laborHours.operatorUserId, users.id))
    .where(eq(laborHours.productionOrderId, productionOrderId))
    .orderBy(desc(laborHours.startedAt));
}

export async function listDowntime(productionOrderId: string) {
  return db
    .select()
    .from(productionDowntime)
    .where(eq(productionDowntime.productionOrderId, productionOrderId))
    .orderBy(desc(productionDowntime.startedAt));
}

export async function listRework(productionOrderId: string) {
  return db
    .select()
    .from(productionRework)
    .where(eq(productionRework.productionOrderId, productionOrderId))
    .orderBy(desc(productionRework.createdAt));
}

export async function sumClosedMinutes(
  table: typeof machineHours | typeof laborHours,
) {
  const [row] = await db
    .select({ value: sum(table.durationMinutes) })
    .from(table)
    .where(and(sql`${table.durationMinutes} is not null`));
  return Number(row?.value ?? 0);
}

export { isNull, asc };
