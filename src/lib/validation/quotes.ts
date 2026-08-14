import { z } from "zod";
import { QUOTE_STATUSES } from "@/lib/quotes/status";

export const QUOTE_CURRENCIES = ["mxn", "usd"] as const;
export type QuoteCurrency = (typeof QUOTE_CURRENCIES)[number];

export const QUOTE_CURRENCY_LABELS: Record<QuoteCurrency, string> = {
  mxn: "MXN",
  usd: "USD",
};

export const quoteStatusSchema = z.enum(QUOTE_STATUSES);
export const quoteCurrencySchema = z.enum(QUOTE_CURRENCIES);

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined));

const moneyNumber = (label: string, max = 10_000_000) =>
  z.coerce
    .number({ error: `${label} inválido` })
    .min(0, `${label} no puede ser negativo`)
    .max(max, `${label} excede el máximo permitido`);

export const createQuoteSchema = z.object({
  customerId: z.string().trim().min(1, "El cliente es obligatorio"),
  contactId: optionalText(80),
  issueDate: z.coerce.date().optional(),
  validUntil: z.coerce.date().optional().nullable(),
  currency: quoteCurrencySchema.default("mxn"),
  paymentTerms: optionalText(200),
  leadTime: optionalText(200),
  notes: optionalText(4000),
});

export const updateQuoteSchema = z.object({
  id: z.string().trim().min(1, "La cotización es obligatoria"),
  contactId: optionalText(80),
  issueDate: z.coerce.date(),
  validUntil: z.coerce.date().optional().nullable(),
  currency: quoteCurrencySchema,
  paymentTerms: optionalText(200),
  leadTime: optionalText(200),
  notes: optionalText(4000),
});

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
  discountPercent: moneyNumber("Descuento", 100),
  taxPercent: moneyNumber("Impuesto", 100),
  estimatedCost: moneyNumber("Costo estimado"),
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
