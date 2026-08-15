import { z } from "zod";
import {
  ENGINEERING_PRIORITIES,
  ENGINEERING_STATUSES,
} from "@/lib/engineering/status";
import { QUOTE_ENGINEERING_TYPES } from "@/lib/quotes/rfq";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined));

export const engineeringStatusSchema = z.enum(ENGINEERING_STATUSES);
export const engineeringPrioritySchema = z.enum(ENGINEERING_PRIORITIES);
export const engineeringProjectTypeSchema = z.enum(QUOTE_ENGINEERING_TYPES);

export const createEngineeringRequestSchema = z.object({
  quoteId: z.string().trim().min(1, "La cotización es obligatoria"),
  description: z
    .string()
    .trim()
    .min(4, "La descripción es obligatoria")
    .max(2000),
  notes: optionalText(4000),
  projectType: engineeringProjectTypeSchema,
  priority: engineeringPrioritySchema.default("media"),
  dueDate: z.coerce.date().optional().nullable(),
  assigneeUserId: optionalText(80),
});

export const updateEngineeringRequestSchema = z.object({
  id: z.string().trim().min(1, "La solicitud es obligatoria"),
  description: z
    .string()
    .trim()
    .min(4, "La descripción es obligatoria")
    .max(2000),
  notes: optionalText(4000),
  projectType: engineeringProjectTypeSchema,
  priority: engineeringPrioritySchema,
  dueDate: z.coerce.date().optional().nullable(),
});

export const engineeringIdSchema = z.object({
  id: z.string().trim().min(1, "La solicitud es obligatoria"),
});

export const assignEngineeringSchema = z.object({
  id: z.string().trim().min(1, "La solicitud es obligatoria"),
  assigneeUserId: z.string().trim().min(1, "El responsable es obligatorio"),
});

export const changeEngineeringStatusSchema = z.object({
  id: z.string().trim().min(1, "La solicitud es obligatoria"),
  status: engineeringStatusSchema,
});

export const logEngineeringHoursSchema = z.object({
  engineeringRequestId: z.string().trim().min(1, "La solicitud es obligatoria"),
  hours: z.coerce
    .number({ error: "Horas inválidas" })
    .positive("Las horas deben ser mayores a 0")
    .max(24, "Registra como máximo 24 horas por captura"),
  note: optionalText(500),
  workedOn: z.coerce.date().optional(),
});

export const startEngineeringHoursSchema = z.object({
  engineeringRequestId: z.string().trim().min(1, "La solicitud es obligatoria"),
  note: optionalText(500),
});

export const stopEngineeringHoursSchema = z.object({
  id: z.string().trim().min(1, "El registro es obligatorio"),
});

export const deleteEngineeringDocumentSchema = z.object({
  id: z.string().trim().min(1, "El archivo es obligatorio"),
  engineeringRequestId: z.string().trim().min(1, "La solicitud es obligatoria"),
});

export type CreateEngineeringRequestInput = z.infer<
  typeof createEngineeringRequestSchema
>;
export type UpdateEngineeringRequestInput = z.infer<
  typeof updateEngineeringRequestSchema
>;
export type AssignEngineeringInput = z.infer<typeof assignEngineeringSchema>;
export type ChangeEngineeringStatusInput = z.infer<
  typeof changeEngineeringStatusSchema
>;
export type LogEngineeringHoursInput = z.infer<typeof logEngineeringHoursSchema>;
export type StartEngineeringHoursInput = z.infer<
  typeof startEngineeringHoursSchema
>;
export type StopEngineeringHoursInput = z.infer<
  typeof stopEngineeringHoursSchema
>;
