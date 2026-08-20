import {
  rfqLocksItemsUntilRelease,
  type RfqType,
} from "@/lib/quotes/rfq";

export const QUOTE_STATUSES = [
  "borrador",
  "en_revision",
  "enviada",
  "aprobada",
  "rechazada",
  "expirada",
  "convertida",
] as const;

export type QuoteStatus = (typeof QUOTE_STATUSES)[number];

export const QUOTE_STATUS_LABELS: Record<QuoteStatus, string> = {
  borrador: "Borrador",
  en_revision: "En revisión",
  enviada: "Enviada",
  aprobada: "Aprobada",
  rechazada: "Rechazada",
  expirada: "Expirada",
  convertida: "Convertida en OT",
};

const TRANSITIONS: Record<QuoteStatus, QuoteStatus[]> = {
  borrador: ["en_revision", "enviada"],
  en_revision: ["borrador", "enviada"],
  enviada: ["aprobada", "rechazada", "expirada"],
  aprobada: ["convertida"],
  rechazada: [],
  expirada: [],
  convertida: [],
};

export const EDITABLE_QUOTE_STATUSES: QuoteStatus[] = ["borrador", "en_revision"];

export function canEditQuote(status: QuoteStatus): boolean {
  return EDITABLE_QUOTE_STATUSES.includes(status);
}

export function canEditQuoteItems(input: {
  status: QuoteStatus;
  rfqType: RfqType;
  engineeringReleased: boolean;
}): boolean {
  if (!canEditQuote(input.status)) return false;
  if (rfqLocksItemsUntilRelease(input.rfqType) && !input.engineeringReleased) {
    return false;
  }
  return true;
}

export function canTransitionQuote(
  from: QuoteStatus,
  to: QuoteStatus,
): boolean {
  return TRANSITIONS[from].includes(to);
}

export function assertQuoteTransition(from: QuoteStatus, to: QuoteStatus) {
  if (!canTransitionQuote(from, to)) {
    throw new Error(
      `No se puede cambiar una cotización de ${QUOTE_STATUS_LABELS[from]} a ${QUOTE_STATUS_LABELS[to]}.`,
    );
  }
}

export function isQuoteExpired(
  status: QuoteStatus,
  validUntil: Date | null,
  now = new Date(),
): boolean {
  if (status !== "enviada" || !validUntil) return false;
  return validUntil.getTime() < now.getTime();
}

export type SendReadiness = {
  ok: boolean;
  reason?: string;
};

export function canMarkQuoteSent(input: {
  itemCount: number;
  itemsHaveUnitPrice: boolean;
  rfqType?: RfqType;
  engineeringReleased?: boolean;
}): SendReadiness {
  if (
    input.rfqType &&
    rfqLocksItemsUntilRelease(input.rfqType) &&
    !input.engineeringReleased
  ) {
    return {
      ok: false,
      reason: "Libera ingeniería antes de cotizar partidas y enviar al cliente.",
    };
  }
  if (input.itemCount < 1) {
    return { ok: false, reason: "Agrega al menos una partida antes de enviar." };
  }
  if (!input.itemsHaveUnitPrice) {
    return {
      ok: false,
      reason: "Todas las partidas deben tener precio unitario antes de enviar.",
    };
  }
  return { ok: true };
}
