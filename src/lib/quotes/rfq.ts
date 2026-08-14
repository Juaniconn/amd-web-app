export const RFQ_TYPES = [
  "solo_fabricacion",
  "diseno_fabricacion",
  "diseno_solamente",
  "reverse_engineering",
] as const;

export type RfqType = (typeof RFQ_TYPES)[number];

export const RFQ_TYPE_LABELS: Record<RfqType, string> = {
  solo_fabricacion: "Solo fabricación",
  diseno_fabricacion: "Diseño + fabricación",
  diseno_solamente: "Diseño solamente",
  reverse_engineering: "Reverse engineering",
};

export const QUOTE_ENGINEERING_TYPES = [
  "diseno_nuevo",
  "modificacion",
  "reverse_engineering",
  "manufacturabilidad",
] as const;

export type QuoteEngineeringType = (typeof QUOTE_ENGINEERING_TYPES)[number];

export const QUOTE_ENGINEERING_TYPE_LABELS: Record<QuoteEngineeringType, string> = {
  diseno_nuevo: "Diseño nuevo",
  modificacion: "Modificación",
  reverse_engineering: "Reverse engineering",
  manufacturabilidad: "Manufacturabilidad",
};

export const QUOTE_ENGINEERING_STATUSES = [
  "no_requerida",
  "pendiente",
  "en_proceso",
  "esperando_cliente",
  "aprobada",
  "liberada",
] as const;

export type QuoteEngineeringStatus = (typeof QUOTE_ENGINEERING_STATUSES)[number];

export const QUOTE_ENGINEERING_STATUS_LABELS: Record<
  QuoteEngineeringStatus,
  string
> = {
  no_requerida: "No requerida",
  pendiente: "Pendiente",
  en_proceso: "En proceso",
  esperando_cliente: "Esperando cliente",
  aprobada: "Aprobada",
  liberada: "Liberada",
};

export function rfqTypeForcesEngineering(rfqType: RfqType): boolean {
  return rfqType !== "solo_fabricacion";
}

export function defaultEngineeringType(
  rfqType: RfqType,
): QuoteEngineeringType | null {
  if (rfqType === "solo_fabricacion") return null;
  if (rfqType === "reverse_engineering") return "reverse_engineering";
  return "diseno_nuevo";
}

export function resolveQuoteEngineeringFields(input: {
  rfqType: RfqType;
  requiresEngineering: boolean;
  engineeringType?: QuoteEngineeringType | null;
}): {
  rfqType: RfqType;
  requiresEngineering: boolean;
  engineeringType: QuoteEngineeringType | null;
} {
  const requiresEngineering =
    rfqTypeForcesEngineering(input.rfqType) || input.requiresEngineering;
  if (!requiresEngineering) {
    return {
      rfqType: input.rfqType,
      requiresEngineering: false,
      engineeringType: null,
    };
  }
  return {
    rfqType: input.rfqType,
    requiresEngineering: true,
    engineeringType:
      input.engineeringType ?? defaultEngineeringType(input.rfqType) ?? "diseno_nuevo",
  };
}

export function quoteOriginForProduction(requiresEngineering: boolean) {
  return requiresEngineering ? "rfq_ingenieria" : "rfq_directa";
}
