"use server";

import { redirect } from "next/navigation";
import { AppError, toUserMessage } from "@/lib/errors";
import { PERMISSION_IDS, type PermissionId } from "@/lib/permissions/catalog";
import { requirePermission } from "@/lib/auth/session";
import { permissionForProductionTransition } from "@/lib/production/status";
import type { ProductionStatus } from "@/lib/production/status";
import {
  assignProductionSchema,
  changeProductionStatusSchema,
  createProductionOrderSchema,
  createReworkSchema,
  logDowntimeSchema,
  machineSchema,
  productionRouteSchema,
  releaseReworkSchema,
  startTimeEntrySchema,
  stopTimeEntrySchema,
  updateProductionOrderSchema,
  workCenterSchema,
} from "@/lib/validation/production";
import {
  upsertMachine,
  upsertProductionRoute,
  upsertWorkCenter,
} from "@/server/services/production-catalogs";
import {
  assignProduction,
  changeProductionStatus,
  createProductionOrder,
  updateProductionOrder,
} from "@/server/services/production";
import {
  createRework,
  logDowntime,
  releaseRework,
  startLaborHours,
  startMachineHours,
  stopLaborHours,
  stopMachineHours,
} from "@/server/services/production-time";

function actorFrom(session: { user: { id: string; name: string } }) {
  return { userId: session.user.id, name: session.user.name };
}

function fail(error: unknown) {
  if (error instanceof AppError) {
    return { ok: false as const, error: error.message };
  }
  return { ok: false as const, error: toUserMessage(error) };
}

export async function createProductionOrderAction(input: unknown) {
  try {
    const { session } = await requirePermission(PERMISSION_IDS.productionCreate);
    const parsed = createProductionOrderSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
    }
    const created = await createProductionOrder(parsed.data, actorFrom(session));
    redirect(`/production/${created.id}`);
  } catch (error) {
    if (error instanceof AppError) return fail(error);
    throw error;
  }
}

export async function updateProductionOrderAction(input: unknown) {
  try {
    const { session } = await requirePermission(PERMISSION_IDS.productionUpdate);
    const parsed = updateProductionOrderSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
    }
    await updateProductionOrder(parsed.data, actorFrom(session));
    redirect(`/production/${parsed.data.id}`);
  } catch (error) {
    if (error instanceof AppError) return fail(error);
    throw error;
  }
}

export async function changeProductionStatusAction(formData: FormData) {
  try {
    const parsed = changeProductionStatusSchema.safeParse({
      id: formData.get("id"),
      status: formData.get("status"),
      pauseReasonId: formData.get("pauseReasonId") || undefined,
    });
    if (!parsed.success) {
      return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
    }
    const permission = permissionForProductionTransition(
      parsed.data.status as ProductionStatus,
    ) as PermissionId;
    const { session } = await requirePermission(permission);
    await changeProductionStatus(
      parsed.data.id,
      parsed.data.status as ProductionStatus,
      actorFrom(session),
      parsed.data.pauseReasonId,
    );
    return { ok: true as const };
  } catch (error) {
    return fail(error);
  }
}

export async function assignProductionAction(formData: FormData) {
  try {
    const parsed = assignProductionSchema.safeParse({
      id: formData.get("id"),
      workCenterId: formData.get("workCenterId") || undefined,
      machineId: formData.get("machineId") || undefined,
      operatorUserId: formData.get("operatorUserId") || undefined,
    });
    if (!parsed.success) {
      return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
    }

    const permissionsNeeded: PermissionId[] = [];
    if (parsed.data.machineId) {
      permissionsNeeded.push(PERMISSION_IDS.productionAssignMachine);
    }
    if (parsed.data.operatorUserId) {
      permissionsNeeded.push(PERMISSION_IDS.productionAssignOperator);
    }
    if (parsed.data.workCenterId && permissionsNeeded.length === 0) {
      permissionsNeeded.push(PERMISSION_IDS.productionSchedule);
    }
    const permission = permissionsNeeded[0] ?? PERMISSION_IDS.productionSchedule;
    const { session } = await requirePermission(permission);
    await assignProduction(parsed.data, actorFrom(session));
    return { ok: true as const };
  } catch (error) {
    return fail(error);
  }
}

export async function upsertWorkCenterAction(input: unknown) {
  try {
    const { session } = await requirePermission(PERMISSION_IDS.productionUpdate);
    const parsed = workCenterSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
    }
    const saved = await upsertWorkCenter(parsed.data, actorFrom(session));
    return { ok: true as const, id: saved.id };
  } catch (error) {
    return fail(error);
  }
}

export async function upsertMachineAction(input: unknown) {
  try {
    const { session } = await requirePermission(PERMISSION_IDS.productionUpdate);
    const parsed = machineSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
    }
    const saved = await upsertMachine(parsed.data, actorFrom(session));
    redirect(`/machines/${saved.id}`);
  } catch (error) {
    if (error instanceof AppError) return fail(error);
    throw error;
  }
}

export async function upsertProductionRouteAction(input: unknown) {
  try {
    const { session } = await requirePermission(PERMISSION_IDS.productionUpdate);
    const parsed = productionRouteSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
    }
    await upsertProductionRoute(parsed.data, actorFrom(session));
    return { ok: true as const };
  } catch (error) {
    return fail(error);
  }
}

export async function startMachineHoursAction(formData: FormData) {
  try {
    const { session } = await requirePermission(PERMISSION_IDS.productionUpdate);
    const parsed = startTimeEntrySchema.safeParse({
      productionOrderId: formData.get("productionOrderId"),
      operationId: formData.get("operationId") || undefined,
      machineId: formData.get("machineId") || undefined,
      operatorUserId: formData.get("operatorUserId") || undefined,
      notes: formData.get("notes") || undefined,
    });
    if (!parsed.success) {
      return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
    }
    await startMachineHours(parsed.data, actorFrom(session));
    return { ok: true as const };
  } catch (error) {
    return fail(error);
  }
}

export async function stopMachineHoursAction(formData: FormData) {
  try {
    const { session } = await requirePermission(PERMISSION_IDS.productionUpdate);
    const parsed = stopTimeEntrySchema.safeParse({ id: formData.get("id") });
    if (!parsed.success) {
      return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
    }
    await stopMachineHours(parsed.data, actorFrom(session));
    return { ok: true as const };
  } catch (error) {
    return fail(error);
  }
}

export async function startLaborHoursAction(formData: FormData) {
  try {
    const { session } = await requirePermission(PERMISSION_IDS.productionUpdate);
    const parsed = startTimeEntrySchema.safeParse({
      productionOrderId: formData.get("productionOrderId"),
      operationId: formData.get("operationId") || undefined,
      operatorUserId: formData.get("operatorUserId") || undefined,
      notes: formData.get("notes") || undefined,
    });
    if (!parsed.success) {
      return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
    }
    await startLaborHours(parsed.data, actorFrom(session));
    return { ok: true as const };
  } catch (error) {
    return fail(error);
  }
}

export async function stopLaborHoursAction(formData: FormData) {
  try {
    const { session } = await requirePermission(PERMISSION_IDS.productionUpdate);
    const parsed = stopTimeEntrySchema.safeParse({ id: formData.get("id") });
    if (!parsed.success) {
      return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
    }
    await stopLaborHours(parsed.data, actorFrom(session));
    return { ok: true as const };
  } catch (error) {
    return fail(error);
  }
}

export async function logDowntimeAction(formData: FormData) {
  try {
    const { session } = await requirePermission(PERMISSION_IDS.productionUpdate);
    const parsed = logDowntimeSchema.safeParse({
      productionOrderId: formData.get("productionOrderId"),
      reasonId: formData.get("reasonId"),
      machineId: formData.get("machineId") || undefined,
      notes: formData.get("notes") || undefined,
    });
    if (!parsed.success) {
      return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
    }
    await logDowntime(parsed.data, actorFrom(session));
    return { ok: true as const };
  } catch (error) {
    return fail(error);
  }
}

export async function createReworkAction(formData: FormData) {
  try {
    const { session } = await requirePermission(PERMISSION_IDS.productionUpdate);
    const parsed = createReworkSchema.safeParse({
      productionOrderId: formData.get("productionOrderId"),
      partNumber: formData.get("partNumber") || undefined,
      quantity: formData.get("quantity") || 0,
      scrapQuantity: formData.get("scrapQuantity") || 0,
      notes: formData.get("notes") || undefined,
    });
    if (!parsed.success) {
      return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
    }
    await createRework(parsed.data, actorFrom(session));
    return { ok: true as const };
  } catch (error) {
    return fail(error);
  }
}

export async function releaseReworkAction(formData: FormData) {
  try {
    const { session } = await requirePermission(PERMISSION_IDS.qualityRelease);
    const parsed = releaseReworkSchema.safeParse({ id: formData.get("id") });
    if (!parsed.success) {
      return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
    }
    await releaseRework(parsed.data.id, actorFrom(session));
    return { ok: true as const };
  } catch (error) {
    return fail(error);
  }
}
