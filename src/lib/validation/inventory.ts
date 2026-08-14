import { z } from "zod";
import {
  INVENTORY_MOVEMENT_TYPES,
  MATERIAL_CATEGORIES,
} from "@/lib/inventory/catalog";

export const materialCategorySchema = z.enum(MATERIAL_CATEGORIES);
export const inventoryMovementTypeSchema = z.enum(INVENTORY_MOVEMENT_TYPES);

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Máximo ${max} caracteres`)
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined));

const quantitySchema = z
  .union([z.string(), z.number()])
  .transform((value) => String(value).trim())
  .refine((value) => value.length > 0, "La cantidad es obligatoria")
  .refine(
    (value) => Number.isFinite(Number(value)) && Number(value) > 0,
    "La cantidad debe ser mayor a 0",
  );

const optionalMinStock = z
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
    "El stock mínimo no puede ser negativo",
  );

export const createMaterialSchema = z.object({
  description: z.string().trim().min(2, "La descripción es obligatoria").max(200),
  category: materialCategorySchema,
  unitId: z.string().trim().min(1, "La unidad es obligatoria"),
  warehouseId: z.string().trim().min(1).optional(),
  isCritical: z.coerce.boolean(),
  active: z.coerce.boolean(),
  minStock: optionalMinStock,
  notes: optionalText(2000),
});

export const updateMaterialSchema = z.object({
  id: z.string().trim().min(1, "El material es obligatorio"),
  description: z.string().trim().min(2, "La descripción es obligatoria").max(200),
  isCritical: z.coerce.boolean(),
  active: z.coerce.boolean(),
  minStock: optionalMinStock,
  notes: optionalText(2000),
});

export const stockMovementSchema = z.object({
  materialId: z.string().trim().min(1, "El material es obligatorio"),
  warehouseId: z.string().trim().min(1).optional(),
  quantity: quantitySchema,
  reason: optionalText(500),
});

export const adjustStockSchema = stockMovementSchema.extend({
  direction: z.enum(["in", "out"]),
  reason: z
    .string()
    .trim()
    .min(3, "El ajuste exige un motivo")
    .max(500),
});

export const issueStockSchema = stockMovementSchema.extend({
  reason: z
    .string()
    .trim()
    .min(3, "La salida exige un motivo")
    .max(500),
});

export const addOrderMaterialSchema = z.object({
  productionOrderId: z.string().trim().min(1, "La OT es obligatoria"),
  materialId: z.string().trim().min(1, "El material es obligatorio"),
  quantity: quantitySchema,
});

export const removeOrderMaterialSchema = z.object({
  id: z.string().trim().min(1, "La línea es obligatoria"),
});

export const reserveOrderMaterialSchema = z.object({
  productionOrderId: z.string().trim().min(1, "La OT es obligatoria"),
  lineId: z.string().trim().min(1).optional(),
});

export const consumeOrderMaterialSchema = z.object({
  lineId: z.string().trim().min(1, "La línea es obligatoria"),
  quantity: quantitySchema,
});

export type CreateMaterialInput = z.infer<typeof createMaterialSchema>;
export type UpdateMaterialInput = z.infer<typeof updateMaterialSchema>;
export type StockMovementInput = z.infer<typeof stockMovementSchema>;
export type AdjustStockInput = z.infer<typeof adjustStockSchema>;
export type IssueStockInput = z.infer<typeof issueStockSchema>;
export type AddOrderMaterialInput = z.infer<typeof addOrderMaterialSchema>;
export type ConsumeOrderMaterialInput = z.infer<typeof consumeOrderMaterialSchema>;
