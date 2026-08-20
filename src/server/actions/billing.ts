"use server";

import { redirect } from "next/navigation";
import { AppError } from "@/lib/errors";
import { PERMISSION_IDS } from "@/lib/permissions/catalog";
import { requirePermission } from "@/lib/auth/session";
import {
  cancelInvoiceSchema,
  createInvoiceFromOrderSchema,
  issueInvoiceSchema,
  registerPaymentSchema,
} from "@/lib/validation/billing";
import {
  cancelInvoice,
  createInvoiceFromOrder,
  issueInvoice,
  registerPayment,
} from "@/server/services/billing";

function actorFrom(session: { user: { id: string; name: string } }) {
  return { userId: session.user.id, name: session.user.name };
}

export async function createInvoiceFromOrderAction(input: unknown) {
  try {
    const { session } = await requirePermission(PERMISSION_IDS.billingWrite);
    const parsed = createInvoiceFromOrderSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
    }
    const created = await createInvoiceFromOrder(parsed.data, actorFrom(session));
    redirect(`/billing/${created.id}`);
  } catch (error) {
    if (error instanceof AppError) return { ok: false as const, error: error.message };
    throw error;
  }
}

export async function issueInvoiceAction(formData: FormData) {
  try {
    const { session } = await requirePermission(PERMISSION_IDS.billingWrite);
    const parsed = issueInvoiceSchema.safeParse({ id: formData.get("id") });
    if (!parsed.success) {
      return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
    }
    await issueInvoice(parsed.data.id, actorFrom(session));
    return { ok: true as const };
  } catch (error) {
    if (error instanceof AppError) return { ok: false as const, error: error.message };
    throw error;
  }
}

export async function cancelInvoiceAction(formData: FormData) {
  try {
    const { session } = await requirePermission(PERMISSION_IDS.billingWrite);
    const parsed = cancelInvoiceSchema.safeParse({
      id: formData.get("id"),
      notes: formData.get("notes") || undefined,
    });
    if (!parsed.success) {
      return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
    }
    await cancelInvoice(parsed.data.id, actorFrom(session), parsed.data.notes);
    return { ok: true as const };
  } catch (error) {
    if (error instanceof AppError) return { ok: false as const, error: error.message };
    throw error;
  }
}

export async function registerPaymentAction(input: unknown) {
  try {
    const { session } = await requirePermission(PERMISSION_IDS.billingRegisterPayment);
    const parsed = registerPaymentSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
    }
    await registerPayment(parsed.data, actorFrom(session));
    return { ok: true as const };
  } catch (error) {
    if (error instanceof AppError) return { ok: false as const, error: error.message };
    throw error;
  }
}
