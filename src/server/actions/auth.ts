"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { AppError, toUserMessage } from "@/lib/errors";
import { PERMISSION_IDS } from "@/lib/permissions/catalog";
import {
  createUserSchema,
  deleteUserSchema,
  updateUserSchema,
} from "@/lib/validation/auth";
import { requirePermission } from "@/lib/auth/session";
import {
  createUserWithRole,
  deleteUser,
  updateUserWithRole,
} from "@/server/services/users";

export async function signOutAction() {
  await auth.api.signOut({
    headers: await headers(),
  });
  redirect("/login");
}

export async function createUserAction(formData: FormData) {
  try {
    await requirePermission(PERMISSION_IDS.usersWrite);

    const parsed = createUserSchema.safeParse({
      name: formData.get("name"),
      email: formData.get("email"),
      password: formData.get("password"),
      roleId: formData.get("roleId"),
    });

    if (!parsed.success) {
      return {
        ok: false as const,
        error: parsed.error.issues[0]?.message ?? "Datos inválidos.",
      };
    }

    await createUserWithRole(parsed.data);
    return { ok: true as const };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof AppError ? error.message : toUserMessage(error),
    };
  }
}

export async function updateUserAction(formData: FormData) {
  try {
    await requirePermission(PERMISSION_IDS.usersWrite);

    const parsed = updateUserSchema.safeParse({
      id: formData.get("id"),
      name: formData.get("name"),
      email: formData.get("email"),
      roleId: formData.get("roleId"),
      password: formData.get("password") || undefined,
    });

    if (!parsed.success) {
      return {
        ok: false as const,
        error: parsed.error.issues[0]?.message ?? "Datos inválidos.",
      };
    }

    await updateUserWithRole(parsed.data);
    return { ok: true as const };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof AppError ? error.message : toUserMessage(error),
    };
  }
}

export async function deleteUserAction(formData: FormData) {
  try {
    const { session } = await requirePermission(PERMISSION_IDS.usersWrite);

    const parsed = deleteUserSchema.safeParse({
      id: formData.get("id"),
    });

    if (!parsed.success) {
      return {
        ok: false as const,
        error: parsed.error.issues[0]?.message ?? "Datos inválidos.",
      };
    }

    await deleteUser(parsed.data.id, session.user.id);
    return { ok: true as const };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof AppError ? error.message : toUserMessage(error),
    };
  }
}
