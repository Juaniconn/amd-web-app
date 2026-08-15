import { z } from "zod";
import { PROJECT_STATUSES } from "@/lib/projects/status";

export const projectStatusSchema = z.enum(PROJECT_STATUSES);

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined));

export const projectIdSchema = z.object({
  id: z.string().trim().min(1, "El proyecto es obligatorio"),
});

export const createProjectSchema = z.object({
  name: z.string().trim().min(2, "El nombre es obligatorio").max(200),
  customerId: z.string().trim().min(1, "El cliente es obligatorio"),
  description: optionalText(4000),
  ownerUserId: optionalText(80),
  startDate: z.coerce.date().optional().nullable(),
  estimatedEndDate: z.coerce.date().optional().nullable(),
  notes: optionalText(4000),
});

export const updateProjectSchema = createProjectSchema.extend({
  id: z.string().trim().min(1, "El proyecto es obligatorio"),
});

export const changeProjectStatusSchema = z.object({
  id: z.string().trim().min(1, "El proyecto es obligatorio"),
  status: projectStatusSchema,
});

export const attachProjectMemberSchema = z.object({
  projectId: z.string().trim().min(1, "El proyecto es obligatorio"),
  entityId: z.string().trim().min(1, "El registro es obligatorio"),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type ChangeProjectStatusInput = z.infer<typeof changeProjectStatusSchema>;
