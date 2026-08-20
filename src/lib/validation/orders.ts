import { z } from "zod";
import { ORDER_STATUSES } from "@/lib/orders/status";

export const orderStatusSchema = z.enum(ORDER_STATUSES);

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined));

export const orderIdSchema = z.object({
  id: z.string().trim().min(1, "La orden de trabajo es obligatoria"),
});

export const updateOrderSchema = z.object({
  id: z.string().trim().min(1, "La orden de trabajo es obligatoria"),
  ownerUserId: optionalText(80),
  promisedDate: z.coerce.date().optional().nullable(),
  notes: optionalText(4000),
  projectId: optionalText(80),
});

export const changeOrderStatusSchema = z.object({
  id: z.string().trim().min(1, "La orden de trabajo es obligatoria"),
  status: orderStatusSchema,
});

export const attachOrderProjectSchema = z.object({
  id: z.string().trim().min(1, "La orden de trabajo es obligatoria"),
  projectId: z.string().trim().min(1, "El proyecto es obligatorio"),
});

export type UpdateOrderInput = z.infer<typeof updateOrderSchema>;
export type ChangeOrderStatusInput = z.infer<typeof changeOrderStatusSchema>;
