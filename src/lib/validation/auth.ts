import { z } from "zod";

export const roleIdSchema = z.enum([
  "administrador",
  "direccion",
  "ventas",
  "ingenieria",
  "compras",
  "produccion",
  "calidad",
  "almacen",
]);

export const loginSchema = z.object({
  email: z.string().trim().email("Correo inválido"),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
});

export const createUserSchema = z.object({
  name: z.string().trim().min(2, "El nombre es obligatorio").max(120),
  email: z.string().trim().email("Correo inválido").max(255),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres").max(128),
  roleId: roleIdSchema,
});

export const updateUserSchema = z
  .object({
    id: z.string().trim().min(1, "El usuario es obligatorio"),
    name: z.string().trim().min(2, "El nombre es obligatorio").max(120),
    email: z.string().trim().email("Correo inválido").max(255),
    roleId: roleIdSchema,
    password: z.string().max(128).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.password && data.password.length > 0 && data.password.length < 8) {
      ctx.addIssue({
        code: "custom",
        path: ["password"],
        message: "La contraseña debe tener al menos 8 caracteres",
      });
    }
  });

export const deleteUserSchema = z.object({
  id: z.string().trim().min(1, "El usuario es obligatorio"),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type DeleteUserInput = z.infer<typeof deleteUserSchema>;
