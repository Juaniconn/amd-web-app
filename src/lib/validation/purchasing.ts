import { z } from "zod";
import { PAYMENT_TERMS } from "@/lib/quotes/commercial";
import {
  PURCHASE_ORDER_STATUSES,
  SUPPLIER_STATUSES,
} from "@/lib/purchasing/catalog";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined));

export const supplierStatusSchema = z.enum(SUPPLIER_STATUSES);
export const purchaseOrderStatusSchema = z.enum(PURCHASE_ORDER_STATUSES);
export const purchaseCurrencySchema = z.enum(["mxn", "usd"]);

const supplierFields = {
  legalName: z.string().trim().min(2, "El nombre es obligatorio").max(200),
  rfc: optionalText(20),
  contactName: optionalText(120),
  email: optionalText(255),
  phone: optionalText(40),
  address: optionalText(300),
  city: optionalText(120),
  country: z
    .string()
    .trim()
    .max(80)
    .optional()
    .transform((value) => (value && value.length > 0 ? value : "México")),
  paymentTerm: z.enum(PAYMENT_TERMS).default("net_30"),
  leadTime: optionalText(80),
  notes: optionalText(2000),
  website: optionalText(300),
  materialAvailable: optionalText(500),
  classification: optionalText(40),
  advantages: optionalText(2000),
  disadvantages: optionalText(2000),
  distanceNote: optionalText(500),
  usedInCalculator: z.coerce.boolean().optional().default(false),
  status: supplierStatusSchema.default("activo"),
};

export const createSupplierSchema = z.object(supplierFields);
export const updateSupplierSchema = z.object({
  id: z.string().trim().min(1),
  ...supplierFields,
});

export const supplierIdSchema = z.object({
  id: z.string().trim().min(1, "El proveedor es obligatorio"),
});

const optionalNumeric = z
  .union([z.string(), z.number()])
  .optional()
  .transform((value) => {
    if (value === undefined || value === null || String(value).trim() === "") {
      return undefined;
    }
    return String(value).trim();
  })
  .refine(
    (value) =>
      value === undefined ||
      (Number.isFinite(Number(value)) && Number(value) >= 0),
    "El número no puede ser negativo",
  );

export const supplierMaterialSchema = z.object({
  id: optionalText(80),
  supplierId: z.string().trim().min(1, "El proveedor es obligatorio"),
  description: z.string().trim().min(2, "La descripción es obligatoria").max(200),
  grade: optionalText(40),
  thicknessIn: optionalNumeric,
  costPerKg: optionalNumeric,
  sheetWidthIn: optionalNumeric,
  sheetLengthIn: optionalNumeric,
  densityGCm3: optionalNumeric,
  unit: z
    .string()
    .trim()
    .max(20)
    .optional()
    .transform((value) => (value && value.length > 0 ? value : "kg")),
  notes: optionalText(2000),
  active: z.coerce.boolean().optional().default(true),
});

export const supplierMaterialIdSchema = z.object({
  id: z.string().trim().min(1, "El material es obligatorio"),
});

const purchaseItemSchema = z.object({
  materialId: z.string().trim().min(1, "El material es obligatorio"),
  description: optionalText(300),
  quantity: z.coerce.number().positive("La cantidad debe ser mayor a 0"),
  unitPrice: z.coerce.number().min(0, "El precio no puede ser negativo"),
  taxPercent: z.coerce.number().refine((value) => [0, 8, 16].includes(value), {
    message: "El IVA debe ser 0%, 8% o 16%",
  }),
});

export const createMaterialRequestSchema = z.object({
  orderId: z.string().trim().min(1, "La orden de trabajo es obligatoria"),
});

export const convertPurchaseRequestSchema = z.object({
  requestId: z.string().trim().min(1, "La solicitud es obligatoria"),
});

export const createPurchaseOrderSchema = z.object({
  supplierId: z.string().trim().min(1, "El proveedor es obligatorio"),
  branchId: z.string().trim().min(1).optional(),
  orderId: optionalText(80),
  purchaseRequestId: optionalText(80),
  productionOrderId: optionalText(80),
  expectedDate: optionalText(40),
  currency: purchaseCurrencySchema.default("mxn"),
  paymentTerm: z.enum(PAYMENT_TERMS).default("net_30"),
  isUrgent: z.boolean().default(false),
  urgentReason: optionalText(500),
  notes: optionalText(2000),
  items: z.array(purchaseItemSchema).min(1, "Agrega al menos una partida"),
});

export const updatePurchaseOrderSchema = createPurchaseOrderSchema.extend({
  id: z.string().trim().min(1),
});

export const purchaseOrderIdSchema = z.object({
  id: z.string().trim().min(1, "La orden de compra es obligatoria"),
});

export const changePurchaseOrderStatusSchema = z.object({
  id: z.string().trim().min(1),
  status: purchaseOrderStatusSchema,
});

export const receivePurchaseOrderSchema = z.object({
  purchaseOrderId: z.string().trim().min(1),
  notes: optionalText(1000),
  items: z
    .array(
      z.object({
        purchaseOrderItemId: z.string().trim().min(1),
        quantity: z.coerce.number().min(0),
      }),
    )
    .min(1),
});

export type CreateSupplierInput = z.infer<typeof createSupplierSchema>;
export type UpdateSupplierInput = z.infer<typeof updateSupplierSchema>;
export type SupplierMaterialInput = z.infer<typeof supplierMaterialSchema>;
export type CreateMaterialRequestInput = z.infer<typeof createMaterialRequestSchema>;
export type ConvertPurchaseRequestInput = z.infer<typeof convertPurchaseRequestSchema>;
export type CreatePurchaseOrderInput = z.infer<typeof createPurchaseOrderSchema>;
export type UpdatePurchaseOrderInput = z.infer<typeof updatePurchaseOrderSchema>;
export type ReceivePurchaseOrderInput = z.infer<typeof receivePurchaseOrderSchema>;
