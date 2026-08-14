"use server";

import { redirect } from "next/navigation";
import { AppError, toUserMessage } from "@/lib/errors";
import { PERMISSION_IDS } from "@/lib/permissions/catalog";
import { requirePermission } from "@/lib/auth/session";
import type { QuoteStatus } from "@/lib/quotes/status";
import {
  addQuoteItemSchema,
  changeQuoteStatusSchema,
  createQuoteSchema,
  deleteQuoteDocumentSchema,
  deleteQuoteItemSchema,
  quoteIdSchema,
  updateQuoteItemSchema,
  updateQuoteSchema,
} from "@/lib/validation/quotes";
import {
  deleteQuoteDocument,
  uploadQuoteDocument,
} from "@/server/services/documents";
import {
  addQuoteItem,
  archiveQuote,
  changeQuoteStatus,
  convertQuoteToOrder,
  createQuote,
  deleteQuoteItem,
  duplicateQuote,
  updateQuote,
  updateQuoteItem,
} from "@/server/services/quotes";

function actorFrom(session: { user: { id: string; name: string } }) {
  return { userId: session.user.id, name: session.user.name };
}

function fail(error: unknown) {
  if (error instanceof AppError) {
    return { ok: false as const, error: error.message };
  }
  return { ok: false as const, error: toUserMessage(error) };
}

export async function createQuoteAction(input: unknown) {
  try {
    const { session } = await requirePermission(PERMISSION_IDS.quotesWrite);
    const parsed = createQuoteSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
    }
    const created = await createQuote(parsed.data, actorFrom(session));
    redirect(`/quotes/${created.id}`);
  } catch (error) {
    if (error instanceof AppError) return fail(error);
    throw error;
  }
}

export async function updateQuoteAction(input: unknown) {
  try {
    const { session } = await requirePermission(PERMISSION_IDS.quotesWrite);
    const parsed = updateQuoteSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
    }
    await updateQuote(parsed.data, actorFrom(session));
    redirect(`/quotes/${parsed.data.id}`);
  } catch (error) {
    if (error instanceof AppError) return fail(error);
    throw error;
  }
}

export async function archiveQuoteAction(formData: FormData) {
  try {
    const { session } = await requirePermission(PERMISSION_IDS.quotesWrite);
    const parsed = quoteIdSchema.safeParse({ id: formData.get("id") });
    if (!parsed.success) {
      return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
    }
    await archiveQuote(parsed.data.id, actorFrom(session));
    redirect("/quotes");
  } catch (error) {
    if (error instanceof AppError) return fail(error);
    throw error;
  }
}

export async function changeQuoteStatusAction(formData: FormData) {
  try {
    const { session } = await requirePermission(PERMISSION_IDS.quotesWrite);
    const parsed = changeQuoteStatusSchema.safeParse({
      id: formData.get("id"),
      status: formData.get("status"),
    });
    if (!parsed.success) {
      return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
    }
    await changeQuoteStatus(
      parsed.data.id,
      parsed.data.status as QuoteStatus,
      actorFrom(session),
    );
    return { ok: true as const };
  } catch (error) {
    return fail(error);
  }
}

export async function convertQuoteToOrderAction(formData: FormData) {
  try {
    const { session } = await requirePermission(PERMISSION_IDS.quotesWrite);
    const parsed = quoteIdSchema.safeParse({ id: formData.get("id") });
    if (!parsed.success) {
      return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
    }
    await convertQuoteToOrder(parsed.data.id, actorFrom(session));
    return { ok: true as const };
  } catch (error) {
    return fail(error);
  }
}

export async function duplicateQuoteAction(formData: FormData) {
  try {
    const { session } = await requirePermission(PERMISSION_IDS.quotesWrite);
    const parsed = quoteIdSchema.safeParse({ id: formData.get("id") });
    if (!parsed.success) {
      return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
    }
    const created = await duplicateQuote(parsed.data.id, actorFrom(session));
    redirect(`/quotes/${created.id}`);
  } catch (error) {
    if (error instanceof AppError) return fail(error);
    throw error;
  }
}

function readItemPayload(formData: FormData) {
  return {
    id: formData.get("id"),
    quoteId: formData.get("quoteId"),
    description: formData.get("description"),
    partNumber: formData.get("partNumber"),
    quantity: formData.get("quantity"),
    unit: formData.get("unit"),
    unitPrice: formData.get("unitPrice"),
    discountPercent: formData.get("discountPercent") || "0",
    taxPercent: formData.get("taxPercent") || "16",
    estimatedCost: formData.get("estimatedCost") || "0",
  };
}

export async function addQuoteItemAction(formData: FormData) {
  try {
    const { session } = await requirePermission(PERMISSION_IDS.quotesWrite);
    const parsed = addQuoteItemSchema.safeParse(readItemPayload(formData));
    if (!parsed.success) {
      return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
    }
    await addQuoteItem(parsed.data, actorFrom(session));
    return { ok: true as const };
  } catch (error) {
    return fail(error);
  }
}

export async function updateQuoteItemAction(formData: FormData) {
  try {
    const { session } = await requirePermission(PERMISSION_IDS.quotesWrite);
    const parsed = updateQuoteItemSchema.safeParse(readItemPayload(formData));
    if (!parsed.success) {
      return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
    }
    await updateQuoteItem(parsed.data, actorFrom(session));
    return { ok: true as const };
  } catch (error) {
    return fail(error);
  }
}

export async function deleteQuoteItemAction(formData: FormData) {
  try {
    const { session } = await requirePermission(PERMISSION_IDS.quotesWrite);
    const parsed = deleteQuoteItemSchema.safeParse({
      id: formData.get("id"),
      quoteId: formData.get("quoteId"),
    });
    if (!parsed.success) {
      return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
    }
    await deleteQuoteItem(parsed.data.id, parsed.data.quoteId, actorFrom(session));
    return { ok: true as const };
  } catch (error) {
    return fail(error);
  }
}

export async function uploadQuoteDocumentAction(formData: FormData) {
  try {
    const { session } = await requirePermission(PERMISSION_IDS.quotesWrite);
    const quoteId = String(formData.get("quoteId") ?? "");
    const file = formData.get("file");
    if (!quoteId) {
      return { ok: false as const, error: "La cotización es obligatoria." };
    }
    if (!(file instanceof File) || file.size === 0) {
      return { ok: false as const, error: "Selecciona un archivo." };
    }
    const bytes = Buffer.from(await file.arrayBuffer());
    await uploadQuoteDocument(
      quoteId,
      { originalName: file.name, bytes },
      actorFrom(session),
    );
    return { ok: true as const };
  } catch (error) {
    return fail(error);
  }
}

export async function deleteQuoteDocumentAction(formData: FormData) {
  try {
    const { session } = await requirePermission(PERMISSION_IDS.quotesWrite);
    const parsed = deleteQuoteDocumentSchema.safeParse({
      id: formData.get("id"),
      quoteId: formData.get("quoteId"),
    });
    if (!parsed.success) {
      return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
    }
    await deleteQuoteDocument(parsed.data.id, parsed.data.quoteId, actorFrom(session));
    return { ok: true as const };
  } catch (error) {
    return fail(error);
  }
}
