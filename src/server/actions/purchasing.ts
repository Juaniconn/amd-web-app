"use server";

import { redirect } from "next/navigation";
import { AppError } from "@/lib/errors";
import { PERMISSION_IDS } from "@/lib/permissions/catalog";
import { requireAnyPermission, requirePermission } from "@/lib/auth/session";
import {
  changePurchaseOrderStatusSchema,
  convertPurchaseRequestSchema,
  createMaterialRequestSchema,
  createPurchaseOrderSchema,
  createSupplierSchema,
  receivePurchaseOrderSchema,
  supplierIdSchema,
  supplierMaterialIdSchema,
  supplierMaterialSchema,
  updatePurchaseOrderSchema,
  updateSupplierSchema,
} from "@/lib/validation/purchasing";
import {
  archiveSupplier,
  changePurchaseOrderStatus,
  convertPurchaseRequestToOrder,
  createMaterialRequestFromOrder,
  createPurchaseOrder,
  createSupplier,
  deleteSupplierMaterial,
  receivePurchaseOrder,
  updatePurchaseOrder,
  updateSupplier,
  upsertSupplierMaterial,
} from "@/server/services/purchasing";

function actorFrom(session: { user: { id: string; name: string } }) {
  return { userId: session.user.id, name: session.user.name };
}

export async function createSupplierAction(input: unknown) {
  try {
    const { session } = await requirePermission(PERMISSION_IDS.purchasingWrite);
    const parsed = createSupplierSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
    }
    const created = await createSupplier(parsed.data, actorFrom(session));
    redirect(`/suppliers/${created.id}`);
  } catch (error) {
    if (error instanceof AppError) return { ok: false as const, error: error.message };
    throw error;
  }
}

export async function updateSupplierAction(input: unknown) {
  try {
    const { session } = await requirePermission(PERMISSION_IDS.purchasingWrite);
    const parsed = updateSupplierSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
    }
    await updateSupplier(parsed.data, actorFrom(session));
    redirect(`/suppliers/${parsed.data.id}`);
  } catch (error) {
    if (error instanceof AppError) return { ok: false as const, error: error.message };
    throw error;
  }
}

export async function archiveSupplierAction(formData: FormData) {
  try {
    const { session } = await requirePermission(PERMISSION_IDS.purchasingWrite);
    const parsed = supplierIdSchema.safeParse({ id: formData.get("id") });
    if (!parsed.success) {
      return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
    }
    await archiveSupplier(parsed.data.id, actorFrom(session));
    redirect("/suppliers");
  } catch (error) {
    if (error instanceof AppError) return { ok: false as const, error: error.message };
    throw error;
  }
}

export async function requestOrderMaterialsAction(formData: FormData) {
  try {
    const { session } = await requireAnyPermission(
      PERMISSION_IDS.inventoryReserve,
      PERMISSION_IDS.ordersUpdate,
    );
    const parsed = createMaterialRequestSchema.safeParse({
      orderId: formData.get("orderId"),
    });
    if (!parsed.success) {
      return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
    }
    const created = await createMaterialRequestFromOrder(
      parsed.data.orderId,
      actorFrom(session),
    );
    return { ok: true as const, requestId: created.id, number: created.number };
  } catch (error) {
    if (error instanceof AppError) return { ok: false as const, error: error.message };
    throw error;
  }
}

export async function convertPurchaseRequestAction(formData: FormData) {
  try {
    const { session } = await requirePermission(PERMISSION_IDS.purchasingWrite);
    const parsed = convertPurchaseRequestSchema.safeParse({
      requestId: formData.get("requestId"),
    });
    if (!parsed.success) {
      return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
    }
    const created = await convertPurchaseRequestToOrder(parsed.data, actorFrom(session));
    if (created.length === 1) {
      redirect(`/purchasing/${created[0].id}`);
    }
    redirect("/purchasing");
  } catch (error) {
    if (error instanceof AppError) return { ok: false as const, error: error.message };
    throw error;
  }
}

export async function createPurchaseOrderAction(input: unknown) {
  try {
    const { session } = await requirePermission(PERMISSION_IDS.purchasingWrite);
    const parsed = createPurchaseOrderSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
    }
    const created = await createPurchaseOrder(parsed.data, actorFrom(session));
    redirect(`/purchasing/${created.id}`);
  } catch (error) {
    if (error instanceof AppError) return { ok: false as const, error: error.message };
    throw error;
  }
}

export async function updatePurchaseOrderAction(input: unknown) {
  try {
    const { session } = await requirePermission(PERMISSION_IDS.purchasingWrite);
    const parsed = updatePurchaseOrderSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
    }
    await updatePurchaseOrder(parsed.data, actorFrom(session));
    redirect(`/purchasing/${parsed.data.id}`);
  } catch (error) {
    if (error instanceof AppError) return { ok: false as const, error: error.message };
    throw error;
  }
}

export async function changePurchaseOrderStatusAction(formData: FormData) {
  try {
    const parsed = changePurchaseOrderStatusSchema.safeParse({
      id: formData.get("id"),
      status: formData.get("status"),
    });
    if (!parsed.success) {
      return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
    }
    const permission =
      parsed.data.status === "confirmada"
        ? PERMISSION_IDS.purchasingApprove
        : parsed.data.status === "recibida" || parsed.data.status === "parcial"
          ? PERMISSION_IDS.purchasingReceive
          : PERMISSION_IDS.purchasingWrite;
    const { session } = await requirePermission(permission);
    await changePurchaseOrderStatus(parsed.data.id, parsed.data.status, actorFrom(session));
    return { ok: true as const };
  } catch (error) {
    if (error instanceof AppError) return { ok: false as const, error: error.message };
    throw error;
  }
}

export async function receivePurchaseOrderAction(input: unknown) {
  try {
    const { session } = await requireAnyPermission(
      PERMISSION_IDS.purchasingReceive,
      PERMISSION_IDS.inventoryWrite,
    );
    const parsed = receivePurchaseOrderSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
    }
    await receivePurchaseOrder(parsed.data, actorFrom(session));
    return { ok: true as const };
  } catch (error) {
    if (error instanceof AppError) return { ok: false as const, error: error.message };
    throw error;
  }
}

export async function upsertSupplierMaterialAction(input: unknown) {
  try {
    const { session } = await requirePermission(PERMISSION_IDS.purchasingWrite);
    const parsed = supplierMaterialSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
    }
    const saved = await upsertSupplierMaterial(parsed.data, actorFrom(session));
    return { ok: true as const, id: saved.id };
  } catch (error) {
    if (error instanceof AppError) return { ok: false as const, error: error.message };
    throw error;
  }
}

export async function deleteSupplierMaterialAction(formData: FormData) {
  try {
    const { session } = await requirePermission(PERMISSION_IDS.purchasingWrite);
    const parsed = supplierMaterialIdSchema.safeParse({ id: formData.get("id") });
    if (!parsed.success) {
      return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
    }
    await deleteSupplierMaterial(parsed.data.id, actorFrom(session));
    return { ok: true as const };
  } catch (error) {
    if (error instanceof AppError) return { ok: false as const, error: error.message };
    throw error;
  }
}
