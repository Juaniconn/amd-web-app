import "server-only";

import { and, asc, count, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import {
  machines,
  productionOperations,
  productionOrders,
  productionRouteSteps,
  productionRoutes,
  workCenters,
} from "@/db/schema";
import { pickChangedFields } from "@/lib/audit/activity";
import { AppError } from "@/lib/errors";
import type {
  MachineInput,
  ProductionRouteInput,
  WorkCenterInput,
} from "@/lib/validation/production";
import { recordActivity } from "@/server/services/activity";
import type { Actor } from "@/server/services/customers";

export async function listWorkCenters(options?: { activeOnly?: boolean }) {
  const filters = options?.activeOnly ? [eq(workCenters.active, true)] : [];
  return db
    .select()
    .from(workCenters)
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(asc(workCenters.sortOrder), asc(workCenters.name));
}

export async function getWorkCenterById(id: string) {
  const [row] = await db
    .select()
    .from(workCenters)
    .where(eq(workCenters.id, id))
    .limit(1);
  return row ?? null;
}

export async function upsertWorkCenter(input: WorkCenterInput, actor: Actor) {
  const now = new Date();
  const id = input.id ?? crypto.randomUUID();
  const existing = input.id ? await getWorkCenterById(input.id) : null;

  if (existing) {
    await db
      .update(workCenters)
      .set({
        code: input.code,
        name: input.name,
        description: input.description ?? null,
        sortOrder: input.sortOrder,
        active: input.active,
        updatedBy: actor.userId,
        updatedAt: now,
      })
      .where(eq(workCenters.id, existing.id));
    await recordActivity(db, {
      actorUserId: actor.userId,
      actorName: actor.name,
      action: "updated",
      entityType: "work_center",
      entityId: existing.id,
      entityLabel: input.name,
      ...pickChangedFields(
        { code: existing.code, name: existing.name, active: existing.active },
        { code: input.code, name: input.name, active: input.active },
      ),
    });
    return { id: existing.id };
  }

  await db.insert(workCenters).values({
    id,
    code: input.code,
    name: input.name,
    description: input.description ?? null,
    sortOrder: input.sortOrder,
    active: input.active,
    createdBy: actor.userId,
    updatedBy: actor.userId,
  });
  await recordActivity(db, {
    actorUserId: actor.userId,
    actorName: actor.name,
    action: "created",
    entityType: "work_center",
    entityId: id,
    entityLabel: input.name,
    newValue: { code: input.code, name: input.name },
  });
  return { id };
}

export async function listMachines(options?: {
  workCenterId?: string;
  activeOnly?: boolean;
}) {
  const filters = [];
  if (options?.workCenterId) {
    filters.push(eq(machines.workCenterId, options.workCenterId));
  }
  if (options?.activeOnly) filters.push(eq(machines.active, true));

  return db
    .select({
      id: machines.id,
      name: machines.name,
      brand: machines.brand,
      model: machines.model,
      year: machines.year,
      workCenterId: machines.workCenterId,
      workCenterName: workCenters.name,
      workCenterCode: workCenters.code,
      responsibleUserId: machines.responsibleUserId,
      hoursPerShift: machines.hoursPerShift,
      capacity: machines.capacity,
      notes: machines.notes,
      status: machines.status,
      active: machines.active,
      commissionedAt: machines.commissionedAt,
      decommissionedAt: machines.decommissionedAt,
      isDemo: machines.isDemo,
    })
    .from(machines)
    .innerJoin(workCenters, eq(machines.workCenterId, workCenters.id))
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(asc(workCenters.sortOrder), asc(machines.name));
}

export async function getMachineById(id: string) {
  const [row] = await db
    .select({
      id: machines.id,
      name: machines.name,
      brand: machines.brand,
      model: machines.model,
      year: machines.year,
      workCenterId: machines.workCenterId,
      workCenterName: workCenters.name,
      workCenterCode: workCenters.code,
      responsibleUserId: machines.responsibleUserId,
      hoursPerShift: machines.hoursPerShift,
      capacity: machines.capacity,
      notes: machines.notes,
      status: machines.status,
      active: machines.active,
      commissionedAt: machines.commissionedAt,
      decommissionedAt: machines.decommissionedAt,
      isDemo: machines.isDemo,
      createdAt: machines.createdAt,
      updatedAt: machines.updatedAt,
    })
    .from(machines)
    .innerJoin(workCenters, eq(machines.workCenterId, workCenters.id))
    .where(eq(machines.id, id))
    .limit(1);
  return row ?? null;
}

async function countMachineHistory(machineId: string) {
  const [ops] = await db
    .select({ value: count() })
    .from(productionOrders)
    .where(eq(productionOrders.machineId, machineId));
  const [steps] = await db
    .select({ value: count() })
    .from(productionOperations)
    .where(eq(productionOperations.machineId, machineId));
  return Number(ops.value) + Number(steps.value);
}

export async function upsertMachine(input: MachineInput, actor: Actor) {
  const now = new Date();
  const [center] = await db
    .select({ id: workCenters.id, active: workCenters.active })
    .from(workCenters)
    .where(eq(workCenters.id, input.workCenterId))
    .limit(1);
  if (!center) {
    throw new AppError("El centro de trabajo no existe.", "WORK_CENTER_NOT_FOUND", 404);
  }

  const id = input.id ?? crypto.randomUUID();
  const existing = input.id ? await getMachineById(input.id) : null;

  if (existing) {
    await db
      .update(machines)
      .set({
        name: input.name,
        brand: input.brand ?? null,
        model: input.model ?? null,
        year: input.year ?? null,
        workCenterId: input.workCenterId,
        responsibleUserId: input.responsibleUserId ?? null,
        hoursPerShift: String(input.hoursPerShift),
        capacity: input.capacity ?? null,
        notes: input.notes ?? null,
        status: input.status,
        active: input.active,
        commissionedAt: input.commissionedAt ?? existing.commissionedAt,
        decommissionedAt: input.active
          ? null
          : (input.decommissionedAt ?? now),
        updatedBy: actor.userId,
        updatedAt: now,
      })
      .where(eq(machines.id, existing.id));
    await recordActivity(db, {
      actorUserId: actor.userId,
      actorName: actor.name,
      action: "updated",
      entityType: "machine",
      entityId: existing.id,
      entityLabel: input.name,
      ...pickChangedFields(
        {
          name: existing.name,
          workCenterId: existing.workCenterId,
          active: existing.active,
          status: existing.status,
        },
        {
          name: input.name,
          workCenterId: input.workCenterId,
          active: input.active,
          status: input.status,
        },
      ),
    });
    return { id: existing.id };
  }

  await db.insert(machines).values({
    id,
    name: input.name,
    brand: input.brand ?? null,
    model: input.model ?? null,
    year: input.year ?? null,
    workCenterId: input.workCenterId,
    responsibleUserId: input.responsibleUserId ?? null,
    hoursPerShift: String(input.hoursPerShift),
    capacity: input.capacity ?? null,
    notes: input.notes ?? null,
    status: input.status,
    active: input.active,
    commissionedAt: input.commissionedAt ?? now,
    decommissionedAt: input.active ? null : (input.decommissionedAt ?? now),
    createdBy: actor.userId,
    updatedBy: actor.userId,
  });
  await recordActivity(db, {
    actorUserId: actor.userId,
    actorName: actor.name,
    action: "created",
    entityType: "machine",
    entityId: id,
    entityLabel: input.name,
    newValue: { name: input.name, workCenterId: input.workCenterId },
  });
  return { id };
}

export async function deactivateMachine(id: string, actor: Actor) {
  const machine = await getMachineById(id);
  if (!machine) {
    throw new AppError("La máquina no existe.", "MACHINE_NOT_FOUND", 404);
  }
  const history = await countMachineHistory(id);
  if (history > 0 && !machine.active) {
    throw new AppError(
      "La máquina ya está inactiva y conserva historial. No se elimina.",
      "MACHINE_HAS_HISTORY",
      409,
    );
  }
  const now = new Date();
  await db
    .update(machines)
    .set({
      active: false,
      status: "fuera_de_servicio",
      decommissionedAt: now,
      updatedBy: actor.userId,
      updatedAt: now,
    })
    .where(eq(machines.id, id));
  await recordActivity(db, {
    actorUserId: actor.userId,
    actorName: actor.name,
    action: "updated",
    entityType: "machine",
    entityId: id,
    entityLabel: machine.name,
    previousValue: { active: true },
    newValue: { active: false },
  });
}

export async function listProductionRoutes(options?: { activeOnly?: boolean }) {
  const filters = options?.activeOnly ? [eq(productionRoutes.active, true)] : [];
  const routes = await db
    .select()
    .from(productionRoutes)
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(asc(productionRoutes.code));

  const steps = await db
    .select({
      id: productionRouteSteps.id,
      routeId: productionRouteSteps.routeId,
      position: productionRouteSteps.position,
      kind: productionRouteSteps.kind,
      workCenterId: productionRouteSteps.workCenterId,
      workCenterName: workCenters.name,
      name: productionRouteSteps.name,
    })
    .from(productionRouteSteps)
    .leftJoin(workCenters, eq(productionRouteSteps.workCenterId, workCenters.id))
    .orderBy(asc(productionRouteSteps.position));

  return routes.map((route) => ({
    ...route,
    steps: steps.filter((step) => step.routeId === route.id),
  }));
}

export async function getProductionRouteById(id: string) {
  const routes = await listProductionRoutes();
  return routes.find((route) => route.id === id) ?? null;
}

export async function upsertProductionRoute(
  input: ProductionRouteInput,
  actor: Actor,
) {
  const now = new Date();
  const id = input.id ?? crypto.randomUUID();
  const existing = input.id ? await getProductionRouteById(input.id) : null;

  await db.transaction(async (tx) => {
    if (existing) {
      await tx
        .update(productionRoutes)
        .set({
          code: input.code,
          name: input.name,
          description: input.description ?? null,
          active: input.active,
          updatedBy: actor.userId,
          updatedAt: now,
        })
        .where(eq(productionRoutes.id, existing.id));
      await tx
        .delete(productionRouteSteps)
        .where(eq(productionRouteSteps.routeId, existing.id));
    } else {
      await tx.insert(productionRoutes).values({
        id,
        code: input.code,
        name: input.name,
        description: input.description ?? null,
        active: input.active,
        createdBy: actor.userId,
        updatedBy: actor.userId,
      });
    }

    const routeId = existing?.id ?? id;
    await tx.insert(productionRouteSteps).values(
      input.steps.map((step, index) => ({
        id: crypto.randomUUID(),
        routeId,
        position: index + 1,
        kind: step.kind,
        workCenterId: step.workCenterId ?? null,
        name: step.name,
      })),
    );
  });

  await recordActivity(db, {
    actorUserId: actor.userId,
    actorName: actor.name,
    action: existing ? "updated" : "created",
    entityType: "production_route",
    entityId: existing?.id ?? id,
    entityLabel: input.name,
    newValue: { code: input.code, steps: input.steps.length },
  });

  return { id: existing?.id ?? id };
}

export async function assertMachineBelongsToCenter(
  machineId: string,
  workCenterId: string,
) {
  const [row] = await db
    .select({
      id: machines.id,
      workCenterId: machines.workCenterId,
      active: machines.active,
      name: machines.name,
    })
    .from(machines)
    .where(eq(machines.id, machineId))
    .limit(1);
  if (!row) {
    throw new AppError("La máquina no existe.", "MACHINE_NOT_FOUND", 404);
  }
  if (!row.active) {
    throw new AppError("La máquina está inactiva.", "MACHINE_INACTIVE", 409);
  }
  if (row.workCenterId !== workCenterId) {
    throw new AppError(
      "La máquina no pertenece al centro de trabajo asignado.",
      "MACHINE_CENTER_MISMATCH",
      409,
    );
  }
  return row;
}

export async function workCenterCodeInUse(
  code: string,
  exceptId?: string,
) {
  const filters = [eq(workCenters.code, code)];
  if (exceptId) filters.push(ne(workCenters.id, exceptId));
  const [row] = await db
    .select({ id: workCenters.id })
    .from(workCenters)
    .where(and(...filters))
    .limit(1);
  return Boolean(row);
}
