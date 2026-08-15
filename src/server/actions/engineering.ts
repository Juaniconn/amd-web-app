"use server";

import { redirect } from "next/navigation";
import { AppError, toUserMessage } from "@/lib/errors";
import { permissionForEngineeringTransition } from "@/lib/engineering/status";
import type { EngineeringStatus } from "@/lib/engineering/status";
import { PERMISSION_IDS, type PermissionId } from "@/lib/permissions/catalog";
import { requirePermission } from "@/lib/auth/session";
import {
  assignEngineeringSchema,
  changeEngineeringStatusSchema,
  createEngineeringRequestSchema,
  deleteEngineeringDocumentSchema,
  engineeringIdSchema,
  logEngineeringHoursSchema,
  startEngineeringHoursSchema,
  stopEngineeringHoursSchema,
  updateEngineeringRequestSchema,
} from "@/lib/validation/engineering";
import {
  deleteEngineeringDocument,
  uploadEngineeringDocument,
} from "@/server/services/documents";
import {
  archiveEngineeringRequest,
  assignEngineeringRequest,
  changeEngineeringStatus,
  createEngineeringRequest,
  logEngineeringHours,
  startEngineeringHours,
  stopEngineeringHours,
  updateEngineeringRequest,
} from "@/server/services/engineering";

function actorFrom(session: { user: { id: string; name: string } }) {
  return { userId: session.user.id, name: session.user.name };
}

function fail(error: unknown) {
  if (error instanceof AppError) {
    return { ok: false as const, error: error.message };
  }
  return { ok: false as const, error: toUserMessage(error) };
}

export async function createEngineeringRequestAction(input: unknown) {
  try {
    const { session } = await requirePermission(PERMISSION_IDS.engineeringCreate);
    const parsed = createEngineeringRequestSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
    }
    const created = await createEngineeringRequest(parsed.data, actorFrom(session));
    redirect(`/engineering/${created.id}`);
  } catch (error) {
    if (error instanceof AppError) return fail(error);
    throw error;
  }
}

export async function updateEngineeringRequestAction(input: unknown) {
  try {
    const { session } = await requirePermission(PERMISSION_IDS.engineeringUpdate);
    const parsed = updateEngineeringRequestSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
    }
    await updateEngineeringRequest(parsed.data, actorFrom(session));
    redirect(`/engineering/${parsed.data.id}`);
  } catch (error) {
    if (error instanceof AppError) return fail(error);
    throw error;
  }
}

export async function assignEngineeringRequestAction(formData: FormData) {
  try {
    const { session } = await requirePermission(PERMISSION_IDS.engineeringAssign);
    const parsed = assignEngineeringSchema.safeParse({
      id: formData.get("id"),
      assigneeUserId: formData.get("assigneeUserId"),
    });
    if (!parsed.success) {
      return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
    }
    await assignEngineeringRequest(parsed.data, actorFrom(session));
    return { ok: true as const };
  } catch (error) {
    return fail(error);
  }
}

export async function changeEngineeringStatusAction(formData: FormData) {
  try {
    const parsed = changeEngineeringStatusSchema.safeParse({
      id: formData.get("id"),
      status: formData.get("status"),
    });
    if (!parsed.success) {
      return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
    }
    const permission = permissionForEngineeringTransition(
      parsed.data.status as EngineeringStatus,
    ) as PermissionId;
    const { session } = await requirePermission(permission);
    await changeEngineeringStatus(
      parsed.data.id,
      parsed.data.status as EngineeringStatus,
      actorFrom(session),
    );
    return { ok: true as const };
  } catch (error) {
    return fail(error);
  }
}

export async function archiveEngineeringRequestAction(formData: FormData) {
  try {
    const { session } = await requirePermission(PERMISSION_IDS.engineeringDelete);
    const parsed = engineeringIdSchema.safeParse({ id: formData.get("id") });
    if (!parsed.success) {
      return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
    }
    await archiveEngineeringRequest(parsed.data.id, actorFrom(session));
    redirect("/engineering");
  } catch (error) {
    if (error instanceof AppError) return fail(error);
    throw error;
  }
}

export async function logEngineeringHoursAction(formData: FormData) {
  try {
    const { session } = await requirePermission(PERMISSION_IDS.engineeringUpdate);
    const parsed = logEngineeringHoursSchema.safeParse({
      engineeringRequestId: formData.get("engineeringRequestId"),
      hours: formData.get("hours"),
      note: formData.get("note"),
      workedOn: formData.get("workedOn") || undefined,
    });
    if (!parsed.success) {
      return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
    }
    await logEngineeringHours(parsed.data, actorFrom(session));
    return { ok: true as const };
  } catch (error) {
    return fail(error);
  }
}

export async function startEngineeringHoursAction(formData: FormData) {
  try {
    const { session } = await requirePermission(PERMISSION_IDS.engineeringUpdate);
    const parsed = startEngineeringHoursSchema.safeParse({
      engineeringRequestId: formData.get("engineeringRequestId"),
      note: formData.get("note") || undefined,
    });
    if (!parsed.success) {
      return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
    }
    await startEngineeringHours(parsed.data, actorFrom(session));
    return { ok: true as const };
  } catch (error) {
    return fail(error);
  }
}

export async function stopEngineeringHoursAction(formData: FormData) {
  try {
    const { session } = await requirePermission(PERMISSION_IDS.engineeringUpdate);
    const parsed = stopEngineeringHoursSchema.safeParse({
      id: formData.get("id"),
    });
    if (!parsed.success) {
      return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
    }
    await stopEngineeringHours(parsed.data, actorFrom(session));
    return { ok: true as const };
  } catch (error) {
    return fail(error);
  }
}

export async function uploadEngineeringDocumentAction(formData: FormData) {
  try {
    const { session } = await requirePermission(PERMISSION_IDS.engineeringUpdate);
    const engineeringRequestId = String(formData.get("engineeringRequestId") ?? "");
    const file = formData.get("file");
    if (!engineeringRequestId) {
      return { ok: false as const, error: "La solicitud es obligatoria." };
    }
    if (!(file instanceof File) || file.size === 0) {
      return { ok: false as const, error: "Selecciona un archivo." };
    }
    const bytes = Buffer.from(await file.arrayBuffer());
    await uploadEngineeringDocument(
      engineeringRequestId,
      { originalName: file.name, bytes },
      actorFrom(session),
    );
    return { ok: true as const };
  } catch (error) {
    return fail(error);
  }
}

export async function deleteEngineeringDocumentAction(formData: FormData) {
  try {
    const { session } = await requirePermission(PERMISSION_IDS.engineeringUpdate);
    const parsed = deleteEngineeringDocumentSchema.safeParse({
      id: formData.get("id"),
      engineeringRequestId: formData.get("engineeringRequestId"),
    });
    if (!parsed.success) {
      return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
    }
    await deleteEngineeringDocument(
      parsed.data.id,
      parsed.data.engineeringRequestId,
      actorFrom(session),
    );
    return { ok: true as const };
  } catch (error) {
    return fail(error);
  }
}
