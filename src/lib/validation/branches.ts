import { z } from "zod";
import { BRANCH_STATUSES } from "@/lib/branches/catalog";

export const branchStatusSchema = z.enum(BRANCH_STATUSES);

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined));

const optionalEmail = z
  .string()
  .trim()
  .max(255)
  .optional()
  .transform((value) => (value && value.length > 0 ? value : undefined))
  .refine(
    (value) => value === undefined || z.string().email().safeParse(value).success,
    "Correo inválido",
  );

const branchFields = {
  name: z.string().trim().min(2, "El nombre es obligatorio").max(200),
  code: z
    .string()
    .trim()
    .min(2, "El código es obligatorio")
    .max(8)
    .transform((value) => value.toUpperCase())
    .refine((value) => /^[A-Z0-9]+$/.test(value), "Usa solo letras y números"),
  address: optionalText(300),
  city: optionalText(120),
  state: optionalText(120),
  country: z
    .string()
    .trim()
    .max(80)
    .optional()
    .transform((value) => (value && value.length > 0 ? value : "México")),
  postalCode: optionalText(20),
  phone: optionalText(40),
  email: optionalEmail,
  rfc: optionalText(20),
  status: branchStatusSchema.default("activo"),
};

export const createBranchSchema = z.object(branchFields).superRefine((data, ctx) => {
  const country = data.country.toLowerCase();
  const isMx = country.includes("méxico") || country.includes("mexico");
  if (isMx && data.rfc && !/^[A-Z0-9Ñ&]{12,13}$/i.test(data.rfc)) {
    ctx.addIssue({
      code: "custom",
      path: ["rfc"],
      message: "El RFC mexicano debe tener 12 o 13 caracteres",
    });
  }
});

export const updateBranchSchema = z.object({
  id: z.string().trim().min(1, "La sucursal es obligatoria"),
  ...branchFields,
}).superRefine((data, ctx) => {
  const country = data.country.toLowerCase();
  const isMx = country.includes("méxico") || country.includes("mexico");
  if (isMx && data.rfc && !/^[A-Z0-9Ñ&]{12,13}$/i.test(data.rfc)) {
    ctx.addIssue({
      code: "custom",
      path: ["rfc"],
      message: "El RFC mexicano debe tener 12 o 13 caracteres",
    });
  }
});

export const branchIdSchema = z.object({
  id: z.string().trim().min(1, "La sucursal es obligatoria"),
});

export type CreateBranchInput = z.infer<typeof createBranchSchema>;
export type UpdateBranchInput = z.infer<typeof updateBranchSchema>;
