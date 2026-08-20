import { z } from "zod";
import { DELIVERY_STATUSES } from "@/lib/deliveries/catalog";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined));

export const deliveryStatusSchema = z.enum(DELIVERY_STATUSES);

export const createDeliverySchema = z.object({
  orderId: z.string().trim().min(1, "La orden de trabajo es obligatoria"),
  productionOrderId: optionalText(80),
  branchId: optionalText(80),
  scheduledDate: optionalText(40),
  carrier: optionalText(120),
  trackingNumber: optionalText(80),
  quantity: z.coerce.number().positive().optional(),
  shippingAddress: optionalText(300),
  shippingCity: optionalText(120),
  shippingState: optionalText(120),
  shippingCountry: optionalText(80),
  notes: optionalText(2000),
});

export const updateDeliverySchema = createDeliverySchema.extend({
  id: z.string().trim().min(1),
});

export const changeDeliveryStatusSchema = z.object({
  id: z.string().trim().min(1),
  status: deliveryStatusSchema,
  trackingNumber: optionalText(80),
  notes: optionalText(2000),
});

export type CreateDeliveryInput = z.infer<typeof createDeliverySchema>;
export type UpdateDeliveryInput = z.infer<typeof updateDeliverySchema>;
export type ChangeDeliveryStatusInput = z.infer<typeof changeDeliveryStatusSchema>;
