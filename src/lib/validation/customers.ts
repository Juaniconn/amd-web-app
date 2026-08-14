import { z } from "zod";

export const CUSTOMER_TYPES = [
  "industrial",
  "maquiladora",
  "comercial",
  "otro",
] as const;

export const CUSTOMER_STATUSES = ["activo", "inactivo"] as const;

export const CUSTOMER_TYPE_LABELS: Record<(typeof CUSTOMER_TYPES)[number], string> =
  {
    industrial: "Industrial",
    maquiladora: "Maquiladora",
    comercial: "Comercial",
    otro: "Otro",
  };

export const CUSTOMER_STATUS_LABELS: Record<
  (typeof CUSTOMER_STATUSES)[number],
  string
> = {
  activo: "Activo",
  inactivo: "Inactivo",
};

export const customerTypeSchema = z.enum(CUSTOMER_TYPES);
export const customerStatusSchema = z.enum(CUSTOMER_STATUSES);

export type CustomerType = (typeof CUSTOMER_TYPES)[number];
export type CustomerStatus = (typeof CUSTOMER_STATUSES)[number];

const optionalText = (max: number, message?: string) =>
  z
    .string()
    .trim()
    .max(max, message ?? `Máximo ${max} caracteres`)
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

const optionalRfc = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value && value.length > 0 ? value.toUpperCase() : undefined))
  .refine(
    (value) => value === undefined || /^[A-Z0-9Ñ&]{12,13}$/.test(value),
    "El RFC debe tener 12 o 13 caracteres alfanuméricos",
  );

const customerFields = {
  legalName: z
    .string()
    .trim()
    .min(2, "El nombre de empresa es obligatorio")
    .max(200),
  tradeName: optionalText(200),
  rfc: optionalRfc,
  phone: optionalText(40),
  email: optionalEmail,
  address: optionalText(300),
  city: optionalText(120),
  state: optionalText(120),
  country: z
    .string()
    .trim()
    .max(80)
    .optional()
    .transform((value) => (value && value.length > 0 ? value : "México")),
  type: customerTypeSchema,
  status: customerStatusSchema,
  notes: optionalText(4000),
};

export const createCustomerSchema = z.object(customerFields);

export const updateCustomerSchema = z.object({
  id: z.string().trim().min(1, "El cliente es obligatorio"),
  ...customerFields,
});

export const archiveCustomerSchema = z.object({
  id: z.string().trim().min(1, "El cliente es obligatorio"),
});

const contactFields = {
  name: z.string().trim().min(2, "El nombre es obligatorio").max(120),
  title: optionalText(120),
  email: optionalEmail,
  phone: optionalText(40),
  whatsapp: optionalText(40),
  department: optionalText(120),
  isPrimary: z.boolean(),
  notes: optionalText(2000),
};

export const createContactSchema = z.object({
  customerId: z.string().trim().min(1, "El cliente es obligatorio"),
  ...contactFields,
});

export const updateContactSchema = z.object({
  id: z.string().trim().min(1, "El contacto es obligatorio"),
  customerId: z.string().trim().min(1, "El cliente es obligatorio"),
  ...contactFields,
});

export const archiveContactSchema = z.object({
  id: z.string().trim().min(1, "El contacto es obligatorio"),
  customerId: z.string().trim().min(1, "El cliente es obligatorio"),
});

export const setPrimaryContactSchema = z.object({
  id: z.string().trim().min(1, "El contacto es obligatorio"),
  customerId: z.string().trim().min(1, "El cliente es obligatorio"),
});

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
export type ArchiveCustomerInput = z.infer<typeof archiveCustomerSchema>;
export type CreateContactInput = z.infer<typeof createContactSchema>;
export type UpdateContactInput = z.infer<typeof updateContactSchema>;
export type ArchiveContactInput = z.infer<typeof archiveContactSchema>;
export type SetPrimaryContactInput = z.infer<typeof setPrimaryContactSchema>;
