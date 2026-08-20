import { z } from "zod";
import {
  INSPECTION_RESULTS,
  INSPECTION_TYPES,
  NCR_STATUSES,
} from "@/lib/quality/catalog";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined));

export const inspectionTypeSchema = z.enum(INSPECTION_TYPES);
export const inspectionResultSchema = z.enum(INSPECTION_RESULTS);
export const ncrStatusSchema = z.enum(NCR_STATUSES);

export const createInspectionSchema = z
  .object({
    productionOrderId: z.string().trim().min(1, "El número de parte es obligatorio"),
    type: inspectionTypeSchema,
    inspectedAt: optionalText(40),
    partNumber: optionalText(80),
    qtyInspected: z.coerce.number().positive("La cantidad inspeccionada es obligatoria"),
    qtyAccepted: z.coerce.number().min(0),
    qtyRejected: z.coerce.number().min(0),
    result: inspectionResultSchema,
    notes: optionalText(2000),
  })
  .superRefine((data, ctx) => {
    if (data.result === "pendiente") return;
    const sum = data.qtyAccepted + data.qtyRejected;
    if (Math.abs(sum - data.qtyInspected) > 0.0001) {
      ctx.addIssue({
        code: "custom",
        path: ["qtyAccepted"],
        message: "Aceptadas + rechazadas debe igualar la cantidad inspeccionada",
      });
    }
    if (data.result === "rechazado" && data.qtyRejected <= 0) {
      ctx.addIssue({
        code: "custom",
        path: ["qtyRejected"],
        message: "Un rechazo requiere cantidad rechazada mayor a 0",
      });
    }
  });

export const createNcrSchema = z.object({
  productionOrderId: z.string().trim().min(1, "El número de parte es obligatorio"),
  inspectionId: optionalText(80),
  cause: optionalText(1000),
  disposition: optionalText(1000),
  notes: optionalText(2000),
});

export const changeNcrStatusSchema = z.object({
  id: z.string().trim().min(1),
  status: ncrStatusSchema,
  cause: optionalText(1000),
  disposition: optionalText(1000),
  notes: optionalText(2000),
});

export type CreateInspectionInput = z.infer<typeof createInspectionSchema>;
export type CreateNcrInput = z.infer<typeof createNcrSchema>;
export type ChangeNcrStatusInput = z.infer<typeof changeNcrStatusSchema>;
