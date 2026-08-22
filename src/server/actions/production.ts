"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
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
  updateOperationSchema,
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
  assignOperationOperator,
  changeProductionStatus,
  createProductionOrder,
  finishOperationAsOperator,
  startOperationAsOperator,
  updateOperation,
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
    const result = await assignProduction(parsed.data, actorFrom(session));
    return {
      ok: true as const,
      programmed: result.programmed,
      waitingMaterial: result.waitingMaterial,
    };
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

export async function updateOperationAction(formData: FormData) {
  try {
    const { session } = await requirePermission(PERMISSION_IDS.productionUpdate);
    const parsed = updateOperationSchema.safeParse({
      id: formData.get("id"),
      status: formData.get("status") || undefined,
      operatorUserId: formData.get("operatorUserId") || undefined,
      machineId: formData.get("machineId") || undefined,
      notes: formData.get("notes") || undefined,
      startedAt: formData.get("startedAt") || undefined,
      finishedAt: formData.get("finishedAt") || undefined,
    });
    if (!parsed.success) {
      return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
    }
    await updateOperation(parsed.data, actorFrom(session));
    return { ok: true as const };
  } catch (error) {
    return fail(error);
  }
}

export async function assignOperationOperatorAction(formData: FormData) {
  try {
    const { session } = await requirePermission(PERMISSION_IDS.productionAssignOperator);
    const operationId = formData.get("operationId")?.toString() ?? "";
    const operatorUserId = formData.get("operatorUserId")?.toString() || null;
    if (!operationId) {
      return { ok: false as const, error: "ID de operación requerido." };
    }
    await assignOperationOperator(operationId, operatorUserId, actorFrom(session));
    return { ok: true as const };
  } catch (error) {
    return fail(error);
  }
}

/**
 * El operador inicia SU proceso. Solo requiere production:view porque
 * el servicio valida que el proceso esté asignado a él.
 */
export async function startMyOperationAction(formData: FormData) {
  try {
    const { session } = await requirePermission(PERMISSION_IDS.productionView);
    const operationId = formData.get("operationId")?.toString() ?? "";
    if (!operationId) {
      return { ok: false as const, error: "ID de proceso requerido." };
    }
    await startOperationAsOperator(operationId, session.user.id);
    revalidatePath("/my-production");
    revalidatePath("/production");
    return { ok: true as const };
  } catch (error) {
    return fail(error);
  }
}

/**
 * El operador termina SU proceso. Si era el último del número de parte,
 * el número de parte pasa a 'calidad' automáticamente.
 */
export async function finishMyOperationAction(formData: FormData) {
  try {
    const { session } = await requirePermission(PERMISSION_IDS.productionView);
    const operationId = formData.get("operationId")?.toString() ?? "";
    if (!operationId) {
      return { ok: false as const, error: "ID de proceso requerido." };
    }
    const num = (key: string) => {
      const raw = formData.get(key)?.toString();
      if (!raw) return undefined;
      const n = Number(raw);
      return Number.isFinite(n) && n >= 0 ? n : undefined;
    };
    const result = await finishOperationAsOperator({
      operationId,
      operatorUserId: session.user.id,
      goodQuantity: num("goodQuantity"),
      scrapQuantity: num("scrapQuantity"),
      reworkQuantity: num("reworkQuantity"),
      rootCause: formData.get("rootCause")?.toString() || undefined,
      notes: formData.get("notes")?.toString() || undefined,
    });
    revalidatePath("/my-production");
    revalidatePath("/production");
    revalidatePath("/orders");
    revalidatePath("/quality");
    return { ok: true as const, ...result };
  } catch (error) {
    return fail(error);
  }
}
