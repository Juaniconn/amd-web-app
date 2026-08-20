"use server";

import { redirect } from "next/navigation";
import { AppError, toUserMessage } from "@/lib/errors";
import { PERMISSION_IDS } from "@/lib/permissions/catalog";
import { requirePermission } from "@/lib/auth/session";
import type { QuoteStatus } from "@/lib/quotes/status";
import {
  addQuoteItemSchema,
  attachEngineeringDocumentSchema,
  changeQuoteStatusSchema,
  createQuoteSchema,
  deleteQuoteDocumentSchema,
  deleteQuoteItemDocumentSchema,
  deleteQuoteItemSchema,
  quoteIdSchema,
  quoteItemCostingSchema,
  createQuoteItemFromDrawingsSchema,
  quoteAgentPreviewQtySchema,
  updateQuoteItemSchema,
  updateQuoteSchema,
} from "@/lib/validation/quotes";
import {
  attachEngineeringDocumentToQuoteItem,
  deleteQuoteDocument,
  deleteQuoteItemDocument,
  uploadQuoteDocument,
  uploadQuoteItemDocument,
} from "@/server/services/documents";
import {
  addQuoteItem,
  archiveQuote,
  changeQuoteStatus,
  convertQuoteToOrder,
  createQuote,
  createQuoteAgentPreview,
  updateQuoteAgentPreviewQty,
  confirmQuoteAgentPreview,
  discardQuoteAgentPreview,
  deleteQuoteItem,
  duplicateQuote,
  materializeQuoteItemsFromEngineering,
  recalculateQuoteItemFromDrawings,
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
    const { session, access } = await requirePermission(PERMISSION_IDS.quotesWrite);
    if (!access.permissions.includes(PERMISSION_IDS.ordersCreate)) {
      return { ok: false as const, error: "No tienes permiso para crear órdenes de trabajo." };
    }
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
    taxPercent: formData.get("taxPercent") || undefined,
    estimatedCost: formData.get("estimatedCost") || "0",
    kind: formData.get("kind") || undefined,
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

export async function uploadQuoteItemDocumentAction(formData: FormData) {
  try {
    const { session } = await requirePermission(PERMISSION_IDS.quotesWrite);
    const quoteId = String(formData.get("quoteId") ?? "");
    const itemId = String(formData.get("itemId") ?? "");
    const file = formData.get("file");
    if (!quoteId || !itemId) {
      return { ok: false as const, error: "La partida es obligatoria." };
    }
    if (!(file instanceof File) || file.size === 0) {
      return { ok: false as const, error: "Selecciona un plano PDF o un CAD." };
    }
    const bytes = Buffer.from(await file.arrayBuffer());
    await uploadQuoteItemDocument(
      quoteId,
      itemId,
      { originalName: file.name, bytes },
      actorFrom(session),
    );
    return { ok: true as const };
  } catch (error) {
    return fail(error);
  }
}

export async function deleteQuoteItemDocumentAction(formData: FormData) {
  try {
    const { session } = await requirePermission(PERMISSION_IDS.quotesWrite);
    const parsed = deleteQuoteItemDocumentSchema.safeParse({
      id: formData.get("id"),
      quoteId: formData.get("quoteId"),
      itemId: formData.get("itemId"),
    });
    if (!parsed.success) {
      return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
    }
    await deleteQuoteItemDocument(
      parsed.data.id,
      parsed.data.quoteId,
      parsed.data.itemId,
      actorFrom(session),
    );
    return { ok: true as const };
  } catch (error) {
    return fail(error);
  }
}

export async function attachEngineeringDocumentAction(formData: FormData) {
  try {
    const { session } = await requirePermission(PERMISSION_IDS.quotesWrite);
    const parsed = attachEngineeringDocumentSchema.safeParse({
      quoteId: formData.get("quoteId"),
      itemId: formData.get("itemId"),
      documentId: formData.get("documentId"),
    });
    if (!parsed.success) {
      return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
    }
    await attachEngineeringDocumentToQuoteItem(
      parsed.data.quoteId,
      parsed.data.itemId,
      parsed.data.documentId,
      actorFrom(session),
    );
    return { ok: true as const };
  } catch (error) {
    return fail(error);
  }
}

export async function recalculateQuoteItemAction(formData: FormData) {
  try {
    const { session } = await requirePermission(PERMISSION_IDS.quotesWrite);
    const parsed = quoteItemCostingSchema.safeParse({
      quoteId: formData.get("quoteId"),
      itemId: formData.get("itemId"),
      quantity: formData.get("quantity"),
      unit_weight_lb: formData.get("unit_weight_lb"),
      scrap_weight_lb: formData.get("scrap_weight_lb"),
      net_area_in2: formData.get("net_area_in2"),
      cut_length_in: formData.get("cut_length_in"),
      holes: formData.get("holes"),
      slots: formData.get("slots"),
      bends: formData.get("bends"),
      hem_count: formData.get("hem_count"),
      thickness_in: formData.get("thickness_in"),
      finish: formData.get("finish"),
      margin_pct: formData.get("margin_pct"),
    });
    if (!parsed.success) {
      return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
    }
    const { quoteId, itemId, ...costing } = parsed.data;
    await recalculateQuoteItemFromDrawings(
      { quoteId, itemId, costing },
      actorFrom(session),
    );
    return { ok: true as const };
  } catch (error) {
    return fail(error);
  }
}

export async function createQuoteItemFromDrawingsAction(formData: FormData) {
  try {
    const { session } = await requirePermission(PERMISSION_IDS.quotesWrite);
    const parsed = createQuoteItemFromDrawingsSchema.safeParse({
      quoteId: formData.get("quoteId"),
      quantity: formData.get("quantity"),
    });
    if (!parsed.success) {
      return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
    }
    const files: { originalName: string; bytes: Buffer }[] = [];
    for (const file of formData.getAll("files")) {
      if (file instanceof File && file.size > 0) {
        files.push({
          originalName: file.name,
          bytes: Buffer.from(await file.arrayBuffer()),
        });
      }
    }
    const single = formData.get("pdf");
    if (single instanceof File && single.size > 0) {
      files.push({
        originalName: single.name,
        bytes: Buffer.from(await single.arrayBuffer()),
      });
    }
    if (files.length === 0) {
      return {
        ok: false as const,
        error: "Sube el plano PDF o un ZIP de PDF.",
      };
    }
    await createQuoteAgentPreview(
      { quoteId: parsed.data.quoteId, files },
      actorFrom(session),
    );
    return { ok: true as const };
  } catch (error) {
    return fail(error);
  }
}

export async function updateQuoteAgentPreviewQtyAction(formData: FormData) {
  try {
    const { session } = await requirePermission(PERMISSION_IDS.quotesWrite);
    const parsed = quoteAgentPreviewQtySchema.safeParse({
      quoteId: formData.get("quoteId"),
      itemId: formData.get("itemId"),
      quantity: formData.get("quantity"),
    });
    if (!parsed.success) {
      return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
    }
    const preview = await updateQuoteAgentPreviewQty(parsed.data, actorFrom(session));
    return { ok: true as const, preview };
  } catch (error) {
    return fail(error);
  }
}

export async function confirmQuoteAgentPreviewAction(formData: FormData) {
  try {
    const { session } = await requirePermission(PERMISSION_IDS.quotesWrite);
    const parsed = quoteIdSchema.safeParse({ id: formData.get("quoteId") });
    if (!parsed.success) {
      return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
    }
    await confirmQuoteAgentPreview(parsed.data.id, actorFrom(session));
    return { ok: true as const };
  } catch (error) {
    return fail(error);
  }
}

export async function discardQuoteAgentPreviewAction(formData: FormData) {
  try {
    const { session } = await requirePermission(PERMISSION_IDS.quotesWrite);
    const parsed = quoteIdSchema.safeParse({ id: formData.get("quoteId") });
    if (!parsed.success) {
      return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
    }
    await discardQuoteAgentPreview(parsed.data.id, actorFrom(session));
    return { ok: true as const };
  } catch (error) {
    return fail(error);
  }
}

export async function materializeQuoteItemsFromEngineeringAction(formData: FormData) {
  try {
    const { session } = await requirePermission(PERMISSION_IDS.quotesWrite);
    const parsed = quoteIdSchema.safeParse({ id: formData.get("id") });
    if (!parsed.success) {
      return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
    }
    const result = await materializeQuoteItemsFromEngineering(
      parsed.data.id,
      actorFrom(session),
    );
    if (result.created === 0) {
      return {
        ok: false as const,
        error: "No hay planos nuevos de ingeniería para generar partidas.",
      };
    }
    return { ok: true as const };
  } catch (error) {
    return fail(error);
  }
}
