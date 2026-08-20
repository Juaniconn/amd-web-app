import { z } from "zod";
import { PAYMENT_METHODS } from "@/lib/billing/catalog";
import { PAYMENT_TERMS } from "@/lib/quotes/commercial";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined));

export const paymentMethodSchema = z.enum(PAYMENT_METHODS);

export const createInvoiceFromOrderSchema = z.object({
  orderId: z.string().trim().min(1, "La orden de trabajo es obligatoria"),
  issueDate: optionalText(40),
  paymentTerm: z.enum(PAYMENT_TERMS).optional(),
  notes: optionalText(2000),
});

export const issueInvoiceSchema = z.object({
  id: z.string().trim().min(1),
});

export const cancelInvoiceSchema = z.object({
  id: z.string().trim().min(1),
  notes: optionalText(1000),
});

export const registerPaymentSchema = z.object({
  invoiceId: z.string().trim().min(1),
  amount: z.coerce.number().positive("El monto debe ser mayor a 0"),
  paidAt: optionalText(40),
  method: paymentMethodSchema.default("transferencia"),
  reference: optionalText(80),
});

export type CreateInvoiceFromOrderInput = z.infer<typeof createInvoiceFromOrderSchema>;
export type RegisterPaymentInput = z.infer<typeof registerPaymentSchema>;
