import { z } from "zod";
import { QUOTE_STATUSES } from "@/lib/quotes/status";
import {
  QUOTE_ENGINEERING_STATUSES,
  QUOTE_ENGINEERING_TYPES,
  RFQ_TYPES,
  resolveQuoteEngineeringFields,
  rfqTypeForcesEngineering,
} from "@/lib/quotes/rfq";

export const QUOTE_CURRENCIES = ["mxn", "usd"] as const;
export type QuoteCurrency = (typeof QUOTE_CURRENCIES)[number];

export const QUOTE_CURRENCY_LABELS: Record<QuoteCurrency, string> = {
  mxn: "MXN",
  usd: "USD",
};

export const quoteStatusSchema = z.enum(QUOTE_STATUSES);
export const quoteCurrencySchema = z.enum(QUOTE_CURRENCIES);
export const rfqTypeSchema = z.enum(RFQ_TYPES);
export const quoteEngineeringTypeSchema = z.enum(QUOTE_ENGINEERING_TYPES);
export const quoteEngineeringStatusSchema = z.enum(QUOTE_ENGINEERING_STATUSES);

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined));

const moneyNumber = (label: string, max = 10_000_000) =>
  z.preprocess(
    (value) => (value === "" || value === null || value === undefined ? undefined : value),
    z.coerce
      .number({ error: `${label} es obligatorio` })
      .min(0, `${label} no puede ser negativo`)
      .max(max, `${label} excede el máximo permitido`),
  );

const optionalMoneyNumber = (label: string, max = 10_000_000) =>
  z.preprocess(
    (value) => (value === "" || value === null || value === undefined ? 0 : value),
    z.coerce
      .number({ error: `${label} inválido` })
      .min(0, `${label} no puede ser negativo`)
      .max(max, `${label} excede el máximo permitido`),
  );

const engineeringFields = {
  rfqType: rfqTypeSchema.default("solo_fabricacion"),
  requiresEngineering: z.boolean().default(false),
  engineeringType: quoteEngineeringTypeSchema.optional().nullable(),
};

function refineEngineering(
  data: {
    rfqType: (typeof RFQ_TYPES)[number];
    requiresEngineering: boolean;
    engineeringType?: (typeof QUOTE_ENGINEERING_TYPES)[number] | null;
  },
  ctx: z.RefinementCtx,
) {
  const resolved = resolveQuoteEngineeringFields(data);
  if (rfqTypeForcesEngineering(data.rfqType) && !resolved.requiresEngineering) {
    ctx.addIssue({
      code: "custom",
      path: ["requiresEngineering"],
      message: "Este tipo de RFQ requiere ingeniería.",
    });
  }
  if (resolved.requiresEngineering && !resolved.engineeringType) {
    ctx.addIssue({
      code: "custom",
      path: ["engineeringType"],
      message: "Selecciona el tipo de ingeniería.",
    });
  }
}

export const createQuoteSchema = z
  .object({
    customerId: z.string().trim().min(1, "El cliente es obligatorio"),
    contactId: optionalText(80),
    issueDate: z.coerce.date().optional(),
    validUntil: z.coerce.date().optional().nullable(),
    currency: quoteCurrencySchema.default("mxn"),
    paymentTerms: optionalText(200),
    leadTime: optionalText(200),
    notes: optionalText(4000),
    ...engineeringFields,
  })
  .superRefine(refineEngineering)
  .transform((data) => ({
    ...data,
    ...resolveQuoteEngineeringFields(data),
  }));

export const updateQuoteSchema = z
  .object({
    id: z.string().trim().min(1, "La cotización es obligatoria"),
    contactId: optionalText(80),
    issueDate: z.coerce.date(),
    validUntil: z.coerce.date().optional().nullable(),
    currency: quoteCurrencySchema,
    paymentTerms: optionalText(200),
    leadTime: optionalText(200),
    notes: optionalText(4000),
    ...engineeringFields,
  })
  .superRefine(refineEngineering)
  .transform((data) => ({
    ...data,
    ...resolveQuoteEngineeringFields(data),
  }));

export const quoteIdSchema = z.object({
  id: z.string().trim().min(1, "La cotización es obligatoria"),
});

export const changeQuoteStatusSchema = z.object({
  id: z.string().trim().min(1, "La cotización es obligatoria"),
  status: quoteStatusSchema,
});

export const quoteItemFields = {
  description: z
    .string()
    .trim()
    .min(2, "La descripción es obligatoria")
    .max(500),
  partNumber: optionalText(80),
  quantity: moneyNumber("Cantidad", 1_000_000),
  unit: z
    .string()
    .trim()
    .min(1)
    .max(20)
    .optional()
    .transform((value) => value || "pza"),
  unitPrice: moneyNumber("Precio unitario"),
  discountPercent: optionalMoneyNumber("Descuento", 100),
  taxPercent: z.preprocess(
    (value) =>
      value === "" || value === null || value === undefined ? undefined : value,
    z.coerce
      .number({ error: "Impuesto inválido" })
      .min(0, "Impuesto no puede ser negativo")
      .max(100, "Impuesto excede el máximo permitido")
      .optional(),
  ),
  estimatedCost: optionalMoneyNumber("Costo estimado"),
  kind: z.enum(["pieza", "servicio_ingenieria"]).optional(),
};

export const addQuoteItemSchema = z.object({
  quoteId: z.string().trim().min(1, "La cotización es obligatoria"),
  ...quoteItemFields,
});

export const updateQuoteItemSchema = z.object({
  id: z.string().trim().min(1, "La partida es obligatoria"),
  quoteId: z.string().trim().min(1, "La cotización es obligatoria"),
  ...quoteItemFields,
});

export const deleteQuoteItemSchema = z.object({
  id: z.string().trim().min(1, "La partida es obligatoria"),
  quoteId: z.string().trim().min(1, "La cotización es obligatoria"),
});

export const deleteQuoteDocumentSchema = z.object({
  id: z.string().trim().min(1, "El archivo es obligatorio"),
  quoteId: z.string().trim().min(1, "La cotización es obligatoria"),
});

export type CreateQuoteInput = z.infer<typeof createQuoteSchema>;
export type UpdateQuoteInput = z.infer<typeof updateQuoteSchema>;
export type ChangeQuoteStatusInput = z.infer<typeof changeQuoteStatusSchema>;
export type AddQuoteItemInput = z.infer<typeof addQuoteItemSchema>;
export type UpdateQuoteItemInput = z.infer<typeof updateQuoteItemSchema>;
