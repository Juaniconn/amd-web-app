"use server";

import { redirect } from "next/navigation";
import { AppError } from "@/lib/errors";
import { PERMISSION_IDS } from "@/lib/permissions/catalog";
import { requirePermission } from "@/lib/auth/session";
import {
  changeNcrStatusSchema,
  createInspectionSchema,
  createNcrSchema,
} from "@/lib/validation/quality";
import {
  changeNcrStatus,
  createInspection,
  createNcr,
  resolveInspection,
} from "@/server/services/quality";

function actorFrom(session: { user: { id: string; name: string } }) {
  return { userId: session.user.id, name: session.user.name };
}

export async function createInspectionAction(input: unknown) {
  try {
    const { session } = await requirePermission(PERMISSION_IDS.qualityInspect);
    const parsed = createInspectionSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
    }
    const created = await createInspection(parsed.data, actorFrom(session));
    redirect(`/quality/inspections/${created.id}`);
  } catch (error) {
    if (error instanceof AppError) return { ok: false as const, error: error.message };
    throw error;
  }
}

export async function createNcrAction(input: unknown) {
  try {
    const { session } = await requirePermission(PERMISSION_IDS.qualityNcr);
    const parsed = createNcrSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
    }
    const created = await createNcr(parsed.data, actorFrom(session));
    redirect(`/quality/ncrs/${created.id}`);
  } catch (error) {
    if (error instanceof AppError) return { ok: false as const, error: error.message };
    throw error;
  }
}

export async function changeNcrStatusAction(formData: FormData) {
  try {
    const { session } = await requirePermission(PERMISSION_IDS.qualityNcr);
    const parsed = changeNcrStatusSchema.safeParse({
      id: formData.get("id"),
      status: formData.get("status"),
      cause: formData.get("cause") || undefined,
      disposition: formData.get("disposition") || undefined,
      notes: formData.get("notes") || undefined,
    });
    if (!parsed.success) {
      return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
    }
    await changeNcrStatus(parsed.data, actorFrom(session));
    return { ok: true as const };
  } catch (error) {
    if (error instanceof AppError) return { ok: false as const, error: error.message };
    throw error;
  }
}

export async function resolveInspectionAction(formData: FormData) {
  try {
    const { session } = await requirePermission(PERMISSION_IDS.qualityInspect);
    const id = String(formData.get("id") ?? "").trim();
    const result = String(formData.get("result") ?? "");
    if (!id || (result !== "aprobado" && result !== "rechazado")) {
      return { ok: false as const, error: "Datos inválidos." };
    }
    await resolveInspection({ id, result }, actorFrom(session));
    return { ok: true as const };
  } catch (error) {
    if (error instanceof AppError) return { ok: false as const, error: error.message };
    throw error;
  }
}
