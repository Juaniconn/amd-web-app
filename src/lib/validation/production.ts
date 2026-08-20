import { z } from "zod";
import {
  MACHINE_STATUSES,
  PRODUCTION_PRIORITIES,
  PRODUCTION_ROUTE_STEP_KINDS,
} from "@/lib/production/catalog";
import { PRODUCTION_STATUSES } from "@/lib/production/status";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined));

export const productionStatusSchema = z.enum(PRODUCTION_STATUSES);
export const productionPrioritySchema = z.enum(PRODUCTION_PRIORITIES);
export const machineStatusSchema = z.enum(MACHINE_STATUSES);
export const routeStepKindSchema = z.enum(PRODUCTION_ROUTE_STEP_KINDS);

export const createProductionOrderSchema = z.object({
  orderId: z.string().trim().min(1, "La orden de trabajo es obligatoria"),
  orderItemId: z.string().trim().min(1, "La partida es obligatoria. Cada pieza tiene su número de parte en producción."),
  routeId: optionalText(80),
  description: z
    .string()
    .trim()
    .min(4, "La descripción es obligatoria")
    .max(2000),
  partNumber: optionalText(80),
  quantity: z.coerce
    .number({ error: "Cantidad inválida" })
    .positive("La cantidad debe ser mayor a 0"),
  unit: z.string().trim().min(1).max(20).default("pza"),
  promisedDate: z.coerce.date({ error: "La fecha prometida es obligatoria" }),
  priority: productionPrioritySchema.default("produccion_normal"),
  notes: optionalText(4000),
  workCenterId: optionalText(80),
  machineId: optionalText(80),
  operatorUserId: optionalText(80),
  documentIds: z.array(z.string().trim().min(1)).optional().default([]),
});

export const updateProductionOrderSchema = z.object({
  id: z.string().trim().min(1, "El número de parte es obligatorio"),
  description: z
    .string()
    .trim()
    .min(4, "La descripción es obligatoria")
    .max(2000),
  partNumber: optionalText(80),
  quantity: z.coerce
    .number({ error: "Cantidad inválida" })
    .positive("La cantidad debe ser mayor a 0"),
  unit: z.string().trim().min(1).max(20),
  promisedDate: z.coerce.date({ error: "La fecha prometida es obligatoria" }),
  priority: productionPrioritySchema,
  notes: optionalText(4000),
  routeId: optionalText(80),
  workCenterId: optionalText(80),
  machineId: optionalText(80),
  operatorUserId: optionalText(80),
});

export const productionIdSchema = z.object({
  id: z.string().trim().min(1, "El número de parte es obligatorio"),
});

export const changeProductionStatusSchema = z.object({
  id: z.string().trim().min(1, "El número de parte es obligatorio"),
  status: productionStatusSchema,
  pauseReasonId: optionalText(80),
});

export const assignProductionSchema = z.object({
  id: z.string().trim().min(1, "El número de parte es obligatorio"),
  workCenterId: optionalText(80),
  machineId: optionalText(80),
  operatorUserId: optionalText(80),
});

export const workCenterSchema = z.object({
  id: optionalText(80),
  code: z
    .string()
    .trim()
    .min(2, "El código es obligatorio")
    .max(40)
    .regex(/^[a-z0-9_]+$/, "Usa minúsculas, números y guion bajo"),
  name: z.string().trim().min(2, "El nombre es obligatorio").max(80),
  description: optionalText(500),
  sortOrder: z.coerce.number().int().min(0).max(9999).default(0),
  active: z.coerce.boolean().default(true),
});

export const machineSchema = z.object({
  id: optionalText(80),
  name: z.string().trim().min(2, "El nombre es obligatorio").max(80),
  brand: optionalText(80),
  model: optionalText(80),
  year: z.coerce
    .number()
    .int()
    .min(1970)
    .max(new Date().getFullYear() + 1)
    .optional()
    .nullable(),
  workCenterId: z.string().trim().min(1, "El centro de trabajo es obligatorio"),
  responsibleUserId: optionalText(80),
  hoursPerShift: z.coerce
    .number({ error: "Horas por turno inválidas" })
    .positive()
    .max(24)
    .default(8),
  capacity: optionalText(200),
  hourlyCost: z.preprocess(
    (value) => (value === "" || value === undefined ? null : value),
    z.coerce.number().min(0).nullable().optional(),
  ),
  bendLengthMm: z.preprocess(
    (value) => (value === "" || value === undefined ? null : value),
    z.coerce.number().min(0).nullable().optional(),
  ),
  tonnageTon: z.preprocess(
    (value) => (value === "" || value === undefined ? null : value),
    z.coerce.number().min(0).nullable().optional(),
  ),
  calculatorSpecs: z
    .record(z.string(), z.union([z.number(), z.null()]))
    .optional(),
  notes: optionalText(2000),
  status: machineStatusSchema.default("disponible"),
  active: z.coerce.boolean().default(true),
  commissionedAt: z.coerce.date().optional().nullable(),
  decommissionedAt: z.coerce.date().optional().nullable(),
});

export const productionRouteSchema = z.object({
  id: optionalText(80),
  code: z
    .string()
    .trim()
    .min(1, "El código es obligatorio")
    .max(40)
    .regex(/^[a-z0-9_]+$/, "Usa minúsculas, números y guion bajo"),
  name: z.string().trim().min(2, "El nombre es obligatorio").max(80),
  description: optionalText(500),
  active: z.coerce.boolean().default(true),
  steps: z
    .array(
      z.object({
        kind: routeStepKindSchema,
        workCenterId: optionalText(80),
        name: z.string().trim().min(2).max(80),
      }),
    )
    .min(1, "La ruta necesita al menos un paso"),
});

export const startTimeEntrySchema = z.object({
  productionOrderId: z.string().trim().min(1, "El número de parte es obligatorio"),
  operationId: optionalText(80),
  machineId: optionalText(80),
  operatorUserId: optionalText(80),
  notes: optionalText(500),
  startedAt: z.coerce.date().optional(),
});

export const stopTimeEntrySchema = z.object({
  id: z.string().trim().min(1, "El registro es obligatorio"),
  endedAt: z.coerce.date().optional(),
});

export const logDowntimeSchema = z.object({
  productionOrderId: z.string().trim().min(1, "El número de parte es obligatorio"),
  reasonId: z.string().trim().min(1, "El motivo es obligatorio"),
  machineId: optionalText(80),
  notes: optionalText(500),
  startedAt: z.coerce.date().optional(),
  endedAt: z.coerce.date().optional().nullable(),
});

export const createReworkSchema = z
  .object({
    productionOrderId: z.string().trim().min(1, "El número de parte es obligatorio"),
    partNumber: optionalText(80),
    quantity: z.coerce.number().min(0, "El retrabajo no puede ser negativo").default(0),
    scrapQuantity: z.coerce.number().min(0).default(0),
    rootCause: optionalText(2000),
    laborHours: z.coerce.number().min(0).max(999).default(0),
    machineHours: z.coerce.number().min(0).max(999).default(0),
    notes: optionalText(2000),
  })
  .refine((data) => data.quantity > 0 || data.scrapQuantity > 0, {
    message: "Indica piezas de retrabajo o de scrap.",
  });

export const releaseReworkSchema = z.object({
  id: z.string().trim().min(1, "El retrabajo es obligatorio"),
});

export type CreateProductionOrderInput = z.infer<
  typeof createProductionOrderSchema
>;
export type UpdateProductionOrderInput = z.infer<
  typeof updateProductionOrderSchema
>;
export type ChangeProductionStatusInput = z.infer<
  typeof changeProductionStatusSchema
>;
export type AssignProductionInput = z.infer<typeof assignProductionSchema>;
export type WorkCenterInput = z.infer<typeof workCenterSchema>;
export type MachineInput = z.infer<typeof machineSchema>;
export type ProductionRouteInput = z.infer<typeof productionRouteSchema>;
export type StartTimeEntryInput = z.infer<typeof startTimeEntrySchema>;
export type StopTimeEntryInput = z.infer<typeof stopTimeEntrySchema>;
export type LogDowntimeInput = z.infer<typeof logDowntimeSchema>;
export type CreateReworkInput = z.infer<typeof createReworkSchema>;
