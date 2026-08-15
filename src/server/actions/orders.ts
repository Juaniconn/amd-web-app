"use server";

import { redirect } from "next/navigation";
import { AppError, toUserMessage } from "@/lib/errors";
import { PERMISSION_IDS } from "@/lib/permissions/catalog";
import { requirePermission } from "@/lib/auth/session";
import {
  permissionForOrderTransition,
  type OrderStatus,
} from "@/lib/orders/status";
import {
  changeOrderStatusSchema,
  updateOrderSchema,
} from "@/lib/validation/orders";
import {
  changeOrderStatus,
  updateOrder,
} from "@/server/services/orders";
import {
  deleteOrderDocument,
  uploadOrderDocument,
} from "@/server/services/documents";

function actorFrom(session: { user: { id: string; name: string } }) {
  return { userId: session.user.id, name: session.user.name };
}

function fail(error: unknown) {
  if (error instanceof AppError) {
    return { ok: false as const, error: error.message };
  }
  return { ok: false as const, error: toUserMessage(error) };
}

export async function updateOrderAction(input: unknown) {
  try {
    const { session } = await requirePermission(PERMISSION_IDS.ordersUpdate);
    const parsed = updateOrderSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
    }
    await updateOrder(parsed.data, actorFrom(session));
    redirect(`/orders/${parsed.data.id}`);
  } catch (error) {
    if (error instanceof AppError) return fail(error);
    throw error;
  }
}

export async function changeOrderStatusAction(formData: FormData) {
  try {
    const parsed = changeOrderStatusSchema.safeParse({
      id: formData.get("id"),
      status: formData.get("status"),
    });
    if (!parsed.success) {
      return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
    }
    const permission = permissionForOrderTransition(parsed.data.status as OrderStatus);
    const { session } = await requirePermission(permission);
    await changeOrderStatus(
      parsed.data.id,
      parsed.data.status as OrderStatus,
      actorFrom(session),
    );
    return { ok: true as const };
  } catch (error) {
    return fail(error);
  }
}

export async function uploadOrderDocumentAction(formData: FormData) {
  try {
    const { session } = await requirePermission(PERMISSION_IDS.ordersUpdate);
    const orderId = String(formData.get("orderId") ?? "");
    const file = formData.get("file");
    if (!orderId) {
      return { ok: false as const, error: "El pedido es obligatorio." };
    }
    if (!(file instanceof File) || file.size === 0) {
      return { ok: false as const, error: "Selecciona un archivo." };
    }
    const bytes = Buffer.from(await file.arrayBuffer());
    await uploadOrderDocument(
      orderId,
      { originalName: file.name, bytes },
      actorFrom(session),
    );
    return { ok: true as const };
  } catch (error) {
    return fail(error);
  }
}

export async function deleteOrderDocumentAction(formData: FormData) {
  try {
    const { session } = await requirePermission(PERMISSION_IDS.ordersUpdate);
    const id = String(formData.get("id") ?? "");
    const orderId = String(formData.get("orderId") ?? "");
    if (!id || !orderId) {
      return { ok: false as const, error: "El archivo es obligatorio." };
    }
    await deleteOrderDocument(id, orderId, actorFrom(session));
    return { ok: true as const };
  } catch (error) {
    return fail(error);
  }
}
