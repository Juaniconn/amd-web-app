"use server";

import { redirect } from "next/navigation";
import { AppError } from "@/lib/errors";
import { PERMISSION_IDS } from "@/lib/permissions/catalog";
import { requirePermission } from "@/lib/auth/session";
import {
  branchIdSchema,
  createBranchSchema,
  updateBranchSchema,
} from "@/lib/validation/branches";
import {
  archiveBranch,
  createBranch,
  updateBranch,
} from "@/server/services/branches";

function actorFrom(session: { user: { id: string; name: string } }) {
  return { userId: session.user.id, name: session.user.name };
}

export async function createBranchAction(input: unknown) {
  try {
    const { session } = await requirePermission(PERMISSION_IDS.branchesWrite);
    const parsed = createBranchSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
    }
    const created = await createBranch(parsed.data, actorFrom(session));
    redirect(`/settings/branches/${created.id}`);
  } catch (error) {
    if (error instanceof AppError) return { ok: false as const, error: error.message };
    throw error;
  }
}

export async function updateBranchAction(input: unknown) {
  try {
    const { session } = await requirePermission(PERMISSION_IDS.branchesWrite);
    const parsed = updateBranchSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
    }
    await updateBranch(parsed.data, actorFrom(session));
    redirect(`/settings/branches/${parsed.data.id}`);
  } catch (error) {
    if (error instanceof AppError) return { ok: false as const, error: error.message };
    throw error;
  }
}

export async function archiveBranchAction(formData: FormData) {
  try {
    const { session } = await requirePermission(PERMISSION_IDS.branchesWrite);
    const parsed = branchIdSchema.safeParse({ id: formData.get("id") });
    if (!parsed.success) {
      return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
    }
    await archiveBranch(parsed.data.id, actorFrom(session));
    redirect("/settings/branches");
  } catch (error) {
    if (error instanceof AppError) return { ok: false as const, error: error.message };
    throw error;
  }
}
