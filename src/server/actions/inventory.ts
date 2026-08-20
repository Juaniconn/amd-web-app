"use server";

import { redirect } from "next/navigation";
import { AppError, toUserMessage } from "@/lib/errors";
import { PERMISSION_IDS } from "@/lib/permissions/catalog";
import { requireAnyPermission, requirePermission } from "@/lib/auth/session";
import {
  addOrderMaterialSchema,
  adjustStockSchema,
  consumeOrderMaterialSchema,
  createMaterialSchema,
  issueStockSchema,
  removeOrderMaterialSchema,
  reserveOrderMaterialSchema,
  stockMovementSchema,
  updateMaterialSchema,
} from "@/lib/validation/inventory";
import {
  addOrderMaterial,
  adjustStock,
  consumeOrderMaterial,
  consumeAllOrderMaterials,
  createMaterial,
  issueStock,
  receiveStock,
  removeOrderMaterial,
  reserveOrderMaterials,
  updateMaterial,
} from "@/server/services/inventory";

function actorFrom(session: { user: { id: string; name: string } }) {
  return { userId: session.user.id, name: session.user.name };
}

function fail(error: unknown) {
  if (error instanceof AppError) {
    return { ok: false as const, error: error.message };
  }
  return { ok: false as const, error: toUserMessage(error) };
}

export async function createMaterialAction(input: unknown) {
  try {
    const { session } = await requirePermission(PERMISSION_IDS.inventoryWrite);
    const parsed = createMaterialSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
    }
    const created = await createMaterial(parsed.data, actorFrom(session));
    redirect(`/inventory/materials/${created.id}`);
  } catch (error) {
    if (error instanceof AppError) return fail(error);
    throw error;
  }
}

export async function updateMaterialAction(input: unknown) {
  try {
    const { session } = await requirePermission(PERMISSION_IDS.inventoryWrite);
    const parsed = updateMaterialSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
    }
    await updateMaterial(parsed.data, actorFrom(session));
    redirect(`/inventory/materials/${parsed.data.id}`);
  } catch (error) {
    if (error instanceof AppError) return fail(error);
    throw error;
  }
}

export async function receiveStockAction(formData: FormData) {
  try {
    const { session } = await requirePermission(PERMISSION_IDS.inventoryWrite);
    const parsed = stockMovementSchema.safeParse({
      materialId: formData.get("materialId"),
      quantity: formData.get("quantity"),
      reason: formData.get("reason") || undefined,
    });
    if (!parsed.success) {
      return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
    }
    await receiveStock(parsed.data, actorFrom(session));
    return { ok: true as const };
  } catch (error) {
    return fail(error);
  }
}

export async function issueStockAction(formData: FormData) {
  try {
    const { session } = await requirePermission(PERMISSION_IDS.inventoryWrite);
    const parsed = issueStockSchema.safeParse({
      materialId: formData.get("materialId"),
      quantity: formData.get("quantity"),
      reason: formData.get("reason"),
    });
    if (!parsed.success) {
      return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
    }
    await issueStock(parsed.data, actorFrom(session));
    return { ok: true as const };
  } catch (error) {
    return fail(error);
  }
}

export async function adjustStockAction(formData: FormData) {
  try {
    const { session } = await requirePermission(PERMISSION_IDS.inventoryAdjust);
    const parsed = adjustStockSchema.safeParse({
      materialId: formData.get("materialId"),
      quantity: formData.get("quantity"),
      reason: formData.get("reason"),
      direction: formData.get("direction"),
    });
    if (!parsed.success) {
      return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
    }
    await adjustStock(parsed.data, actorFrom(session));
    return { ok: true as const };
  } catch (error) {
    return fail(error);
  }
}

export async function addOrderMaterialAction(formData: FormData) {
  try {
    const { session } = await requireAnyPermission(
      PERMISSION_IDS.inventoryReserve,
      PERMISSION_IDS.ordersUpdate,
    );
    const parsed = addOrderMaterialSchema.safeParse({
      orderId: formData.get("orderId"),
      materialId: formData.get("materialId"),
      quantity: formData.get("quantity"),
    });
    if (!parsed.success) {
      return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
    }
    await addOrderMaterial(parsed.data, actorFrom(session));
    return { ok: true as const };
  } catch (error) {
    return fail(error);
  }
}

export async function removeOrderMaterialAction(formData: FormData) {
  try {
    const { session } = await requireAnyPermission(
      PERMISSION_IDS.inventoryReserve,
      PERMISSION_IDS.ordersUpdate,
    );
    const parsed = removeOrderMaterialSchema.safeParse({
      id: formData.get("id"),
    });
    if (!parsed.success) {
      return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
    }
    await removeOrderMaterial(parsed.data.id, actorFrom(session));
    return { ok: true as const };
  } catch (error) {
    return fail(error);
  }
}

export async function reserveOrderMaterialsAction(formData: FormData) {
  try {
    const { session } = await requireAnyPermission(
      PERMISSION_IDS.inventoryReserve,
      PERMISSION_IDS.ordersUpdate,
    );
    const parsed = reserveOrderMaterialSchema.safeParse({
      orderId: formData.get("orderId"),
      lineId: formData.get("lineId") || undefined,
    });
    if (!parsed.success) {
      return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
    }
    const result = await reserveOrderMaterials(
      parsed.data.orderId,
      actorFrom(session),
      parsed.data.lineId,
    );
    return {
      ok: true as const,
      shortage: result.shortage,
      covered: result.covered,
      waitingApplied: result.waitingApplied,
      releasedFromWait: result.releasedFromWait,
      missing: result.missing,
    };
  } catch (error) {
    return fail(error);
  }
}

export async function consumeOrderMaterialAction(formData: FormData) {
  try {
    const { session } = await requirePermission(PERMISSION_IDS.inventoryConsume);
    const parsed = consumeOrderMaterialSchema.safeParse({
      lineId: formData.get("lineId"),
      quantity: formData.get("quantity"),
    });
    if (!parsed.success) {
      return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
    }
    await consumeOrderMaterial(parsed.data, actorFrom(session));
    return { ok: true as const };
  } catch (error) {
    return fail(error);
  }
}

export async function consumeAllOrderMaterialsAction(formData: FormData) {
  try {
    const { session } = await requirePermission(PERMISSION_IDS.inventoryConsume);
    const orderId = String(formData.get("orderId") ?? "").trim();
    if (!orderId) return { ok: false as const, error: "Falta la orden de trabajo." };
    await consumeAllOrderMaterials(orderId, actorFrom(session));
    return { ok: true as const };
  } catch (error) {
    return fail(error);
  }
}
