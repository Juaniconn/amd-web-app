"use server";

import { redirect } from "next/navigation";
import { AppError, toUserMessage } from "@/lib/errors";
import { PERMISSION_IDS } from "@/lib/permissions/catalog";
import { requirePermission } from "@/lib/auth/session";
import {
  permissionForProjectTransition,
  type ProjectStatus,
} from "@/lib/projects/status";
import {
  attachProjectMemberSchema,
  changeProjectStatusSchema,
  createProjectSchema,
  updateProjectSchema,
} from "@/lib/validation/projects";
import {
  attachOrderToProject,
  attachQuoteToProject,
  changeProjectStatus,
  createProject,
  detachOrderFromProject,
  detachQuoteFromProject,
  updateProject,
} from "@/server/services/projects";
import {
  deleteProjectDocument,
  uploadProjectDocument,
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

export async function createProjectAction(input: unknown) {
  try {
    const { session } = await requirePermission(PERMISSION_IDS.projectsCreate);
    const parsed = createProjectSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
    }
    const created = await createProject(parsed.data, actorFrom(session));
    redirect(`/projects/${created.id}`);
  } catch (error) {
    if (error instanceof AppError) return fail(error);
    throw error;
  }
}

export async function updateProjectAction(input: unknown) {
  try {
    const { session } = await requirePermission(PERMISSION_IDS.projectsUpdate);
    const parsed = updateProjectSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
    }
    await updateProject(parsed.data, actorFrom(session));
    redirect(`/projects/${parsed.data.id}`);
  } catch (error) {
    if (error instanceof AppError) return fail(error);
    throw error;
  }
}

export async function changeProjectStatusAction(formData: FormData) {
  try {
    const parsed = changeProjectStatusSchema.safeParse({
      id: formData.get("id"),
      status: formData.get("status"),
    });
    if (!parsed.success) {
      return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
    }
    const permission = permissionForProjectTransition(
      parsed.data.status as ProjectStatus,
    );
    const { session } = await requirePermission(permission);
    await changeProjectStatus(
      parsed.data.id,
      parsed.data.status as ProjectStatus,
      actorFrom(session),
    );
    return { ok: true as const };
  } catch (error) {
    return fail(error);
  }
}

export async function attachQuoteToProjectAction(formData: FormData) {
  try {
    const { session } = await requirePermission(PERMISSION_IDS.projectsUpdate);
    const parsed = attachProjectMemberSchema.safeParse({
      projectId: formData.get("projectId"),
      entityId: formData.get("entityId"),
    });
    if (!parsed.success) {
      return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
    }
    await attachQuoteToProject(
      parsed.data.projectId,
      parsed.data.entityId,
      actorFrom(session),
    );
    return { ok: true as const };
  } catch (error) {
    return fail(error);
  }
}

export async function attachOrderToProjectAction(formData: FormData) {
  try {
    const { session } = await requirePermission(PERMISSION_IDS.projectsUpdate);
    const parsed = attachProjectMemberSchema.safeParse({
      projectId: formData.get("projectId"),
      entityId: formData.get("entityId"),
    });
    if (!parsed.success) {
      return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
    }
    await attachOrderToProject(
      parsed.data.projectId,
      parsed.data.entityId,
      actorFrom(session),
    );
    return { ok: true as const };
  } catch (error) {
    return fail(error);
  }
}

export async function detachQuoteFromProjectAction(formData: FormData) {
  try {
    const { session } = await requirePermission(PERMISSION_IDS.projectsUpdate);
    const parsed = attachProjectMemberSchema.safeParse({
      projectId: formData.get("projectId"),
      entityId: formData.get("entityId"),
    });
    if (!parsed.success) {
      return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
    }
    await detachQuoteFromProject(
      parsed.data.projectId,
      parsed.data.entityId,
      actorFrom(session),
    );
    return { ok: true as const };
  } catch (error) {
    return fail(error);
  }
}

export async function detachOrderFromProjectAction(formData: FormData) {
  try {
    const { session } = await requirePermission(PERMISSION_IDS.projectsUpdate);
    const parsed = attachProjectMemberSchema.safeParse({
      projectId: formData.get("projectId"),
      entityId: formData.get("entityId"),
    });
    if (!parsed.success) {
      return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
    }
    await detachOrderFromProject(
      parsed.data.projectId,
      parsed.data.entityId,
      actorFrom(session),
    );
    return { ok: true as const };
  } catch (error) {
    return fail(error);
  }
}

export async function uploadProjectDocumentAction(formData: FormData) {
  try {
    const { session } = await requirePermission(PERMISSION_IDS.projectsUpdate);
    const projectId = String(formData.get("projectId") ?? "");
    const file = formData.get("file");
    if (!projectId) {
      return { ok: false as const, error: "El proyecto es obligatorio." };
    }
    if (!(file instanceof File) || file.size === 0) {
      return { ok: false as const, error: "Selecciona un archivo." };
    }
    const bytes = Buffer.from(await file.arrayBuffer());
    await uploadProjectDocument(
      projectId,
      { originalName: file.name, bytes },
      actorFrom(session),
    );
    return { ok: true as const };
  } catch (error) {
    return fail(error);
  }
}

export async function deleteProjectDocumentAction(formData: FormData) {
  try {
    const { session } = await requirePermission(PERMISSION_IDS.projectsUpdate);
    const id = String(formData.get("id") ?? "");
    const projectId = String(formData.get("projectId") ?? "");
    if (!id || !projectId) {
      return { ok: false as const, error: "El archivo es obligatorio." };
    }
    await deleteProjectDocument(id, projectId, actorFrom(session));
    return { ok: true as const };
  } catch (error) {
    return fail(error);
  }
}
