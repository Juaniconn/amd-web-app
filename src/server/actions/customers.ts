"use server";

import { redirect } from "next/navigation";
import { AppError, toUserMessage } from "@/lib/errors";
import { PERMISSION_IDS } from "@/lib/permissions/catalog";
import { requirePermission } from "@/lib/auth/session";
import {
  archiveContactSchema,
  archiveCustomerSchema,
  createContactSchema,
  createCustomerSchema,
  setPrimaryContactSchema,
  updateContactSchema,
  updateCustomerSchema,
} from "@/lib/validation/customers";
import {
  archiveContact,
  createContact,
  setPrimaryContact,
  updateContact,
} from "@/server/services/contacts";
import {
  archiveCustomer,
  createCustomer,
  updateCustomer,
} from "@/server/services/customers";

function actorFrom(session: { user: { id: string; name: string } }) {
  return { userId: session.user.id, name: session.user.name };
}

export async function createCustomerAction(input: unknown) {
  try {
    const { session } = await requirePermission(PERMISSION_IDS.customersWrite);
    const parsed = createCustomerSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false as const,
        error: parsed.error.issues[0]?.message ?? "Datos inválidos.",
      };
    }

    const created = await createCustomer(parsed.data, actorFrom(session));
    redirect(`/customers/${created.id}`);
  } catch (error) {
    if (error instanceof AppError) {
      return { ok: false as const, error: error.message };
    }
    throw error;
  }
}

export async function updateCustomerAction(input: unknown) {
  try {
    const { session } = await requirePermission(PERMISSION_IDS.customersWrite);
    const parsed = updateCustomerSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false as const,
        error: parsed.error.issues[0]?.message ?? "Datos inválidos.",
      };
    }

    await updateCustomer(parsed.data, actorFrom(session));
    redirect(`/customers/${parsed.data.id}`);
  } catch (error) {
    if (error instanceof AppError) {
      return { ok: false as const, error: error.message };
    }
    throw error;
  }
}

export async function archiveCustomerAction(formData: FormData) {
  try {
    const { session } = await requirePermission(PERMISSION_IDS.customersWrite);
    const parsed = archiveCustomerSchema.safeParse({
      id: formData.get("id"),
    });
    if (!parsed.success) {
      return {
        ok: false as const,
        error: parsed.error.issues[0]?.message ?? "Datos inválidos.",
      };
    }

    await archiveCustomer(parsed.data.id, actorFrom(session));
    redirect("/customers");
  } catch (error) {
    if (error instanceof AppError) {
      return { ok: false as const, error: error.message };
    }
    throw error;
  }
}

function readContactPayload(formData: FormData) {
  return {
    id: formData.get("id"),
    customerId: formData.get("customerId"),
    name: formData.get("name"),
    title: formData.get("title"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    whatsapp: formData.get("whatsapp"),
    department: formData.get("department"),
    isPrimary:
      formData.get("isPrimary") === "on" ||
      formData.get("isPrimary") === "true",
    notes: formData.get("notes"),
  };
}

export async function createContactAction(formData: FormData) {
  try {
    const { session } = await requirePermission(PERMISSION_IDS.customersWrite);
    const parsed = createContactSchema.safeParse(readContactPayload(formData));
    if (!parsed.success) {
      return {
        ok: false as const,
        error: parsed.error.issues[0]?.message ?? "Datos inválidos.",
      };
    }

    await createContact(parsed.data, actorFrom(session));
    return { ok: true as const };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof AppError ? error.message : toUserMessage(error),
    };
  }
}

export async function updateContactAction(formData: FormData) {
  try {
    const { session } = await requirePermission(PERMISSION_IDS.customersWrite);
    const parsed = updateContactSchema.safeParse(readContactPayload(formData));
    if (!parsed.success) {
      return {
        ok: false as const,
        error: parsed.error.issues[0]?.message ?? "Datos inválidos.",
      };
    }

    await updateContact(parsed.data, actorFrom(session));
    return { ok: true as const };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof AppError ? error.message : toUserMessage(error),
    };
  }
}

export async function archiveContactAction(formData: FormData) {
  try {
    const { session } = await requirePermission(PERMISSION_IDS.customersWrite);
    const parsed = archiveContactSchema.safeParse({
      id: formData.get("id"),
      customerId: formData.get("customerId"),
    });
    if (!parsed.success) {
      return {
        ok: false as const,
        error: parsed.error.issues[0]?.message ?? "Datos inválidos.",
      };
    }

    await archiveContact(parsed.data.id, parsed.data.customerId, actorFrom(session));
    return { ok: true as const };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof AppError ? error.message : toUserMessage(error),
    };
  }
}

export async function setPrimaryContactAction(formData: FormData) {
  try {
    const { session } = await requirePermission(PERMISSION_IDS.customersWrite);
    const parsed = setPrimaryContactSchema.safeParse({
      id: formData.get("id"),
      customerId: formData.get("customerId"),
    });
    if (!parsed.success) {
      return {
        ok: false as const,
        error: parsed.error.issues[0]?.message ?? "Datos inválidos.",
      };
    }

    await setPrimaryContact(
      parsed.data.id,
      parsed.data.customerId,
      actorFrom(session),
    );
    return { ok: true as const };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof AppError ? error.message : toUserMessage(error),
    };
  }
}
