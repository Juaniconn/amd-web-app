"use server";

import { redirect } from "next/navigation";
import { AppError } from "@/lib/errors";
import { PERMISSION_IDS } from "@/lib/permissions/catalog";
import { requirePermission } from "@/lib/auth/session";
import {
  changeDeliveryStatusSchema,
  createDeliverySchema,
  updateDeliverySchema,
} from "@/lib/validation/deliveries";
import {
  changeDeliveryStatus,
  createDelivery,
  createDeliveryFromWorkOrder,
  updateDelivery,
} from "@/server/services/deliveries";

function actorFrom(session: { user: { id: string; name: string } }) {
  return { userId: session.user.id, name: session.user.name };
}

export async function createDeliveryAction(input: unknown) {
  try {
    const { session } = await requirePermission(PERMISSION_IDS.deliveriesWrite);
    const parsed = createDeliverySchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
    }
    const created = await createDelivery(parsed.data, actorFrom(session));
    redirect(`/deliveries/${created.id}`);
  } catch (error) {
    if (error instanceof AppError) return { ok: false as const, error: error.message };
    throw error;
  }
}

export async function updateDeliveryAction(input: unknown) {
  try {
    const { session } = await requirePermission(PERMISSION_IDS.deliveriesWrite);
    const parsed = updateDeliverySchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
    }
    await updateDelivery(parsed.data, actorFrom(session));
    redirect(`/deliveries/${parsed.data.id}`);
  } catch (error) {
    if (error instanceof AppError) return { ok: false as const, error: error.message };
    throw error;
  }
}

export async function changeDeliveryStatusAction(formData: FormData) {
  try {
    const parsed = changeDeliveryStatusSchema.safeParse({
      id: formData.get("id"),
      status: formData.get("status"),
      trackingNumber: formData.get("trackingNumber") || undefined,
      notes: formData.get("notes") || undefined,
    });
    if (!parsed.success) {
      return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
    }
    const permission =
      parsed.data.status === "entregado"
        ? PERMISSION_IDS.deliveriesConfirm
        : PERMISSION_IDS.deliveriesWrite;
    const { session } = await requirePermission(permission);
    await changeDeliveryStatus(parsed.data, actorFrom(session));
    return { ok: true as const };
  } catch (error) {
    if (error instanceof AppError) return { ok: false as const, error: error.message };
    throw error;
  }
}

export async function sendWorkOrderToDeliveryAction(formData: FormData) {
  try {
    const { session } = await requirePermission(PERMISSION_IDS.ordersUpdate);
    const orderId = String(formData.get("orderId") ?? "").trim();
    if (!orderId) return { ok: false as const, error: "Falta la orden de trabajo." };
    const created = await createDeliveryFromWorkOrder(orderId, actorFrom(session));
    redirect(`/deliveries/${created.id}`);
  } catch (error) {
    if (error instanceof AppError) return { ok: false as const, error: error.message };
    throw error;
  }
}
