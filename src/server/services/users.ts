import { hashPassword } from "better-auth/crypto";
import { and, count, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { accounts, userRoles, users } from "@/db/schema";
import { AppError } from "@/lib/errors";
import { ROLE_IDS } from "@/lib/permissions/catalog";
import type {
  CreateUserInput,
  UpdateUserInput,
} from "@/lib/validation/auth";

export async function createUserWithRole(input: CreateUserInput) {
  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, input.email.toLowerCase()))
    .limit(1);

  if (existing.length > 0) {
    throw new AppError(
      "Ya existe un usuario con ese correo.",
      "USER_EXISTS",
      409,
    );
  }

  const hashedPassword = await hashPassword(input.password);
  const userId = crypto.randomUUID();
  const now = new Date();

  await db.transaction(async (tx) => {
    await tx.insert(users).values({
      id: userId,
      name: input.name,
      email: input.email.toLowerCase(),
      emailVerified: true,
      createdAt: now,
      updatedAt: now,
    });

    await tx.insert(accounts).values({
      id: crypto.randomUUID(),
      accountId: userId,
      providerId: "credential",
      userId,
      password: hashedPassword,
      createdAt: now,
      updatedAt: now,
    });

    await tx.insert(userRoles).values({
      userId,
      roleId: input.roleId,
    });
  });

  return { id: userId };
}

async function countAdministrators() {
  const [row] = await db
    .select({ value: count() })
    .from(userRoles)
    .where(eq(userRoles.roleId, ROLE_IDS.administrador));
  return Number(row.value);
}

async function userHasRole(userId: string, roleId: string) {
  const rows = await db
    .select({ userId: userRoles.userId })
    .from(userRoles)
    .where(and(eq(userRoles.userId, userId), eq(userRoles.roleId, roleId)))
    .limit(1);
  return rows.length > 0;
}

export async function updateUserWithRole(input: UpdateUserInput) {
  const [current] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, input.id))
    .limit(1);

  if (!current) {
    throw new AppError("El usuario no existe.", "USER_NOT_FOUND", 404);
  }

  const email = input.email.toLowerCase();
  const duplicate = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.email, email), ne(users.id, input.id)))
    .limit(1);

  if (duplicate.length > 0) {
    throw new AppError(
      "Ya existe un usuario con ese correo.",
      "USER_EXISTS",
      409,
    );
  }

  const isAdmin = await userHasRole(input.id, ROLE_IDS.administrador);
  if (
    isAdmin &&
    input.roleId !== ROLE_IDS.administrador &&
    (await countAdministrators()) <= 1
  ) {
    throw new AppError(
      "No se puede quitar el rol Administrador del último administrador.",
      "LAST_ADMIN",
      409,
    );
  }

  const now = new Date();
  const nextPassword = input.password?.trim() ?? "";

  await db.transaction(async (tx) => {
    await tx
      .update(users)
      .set({
        name: input.name,
        email,
        updatedAt: now,
      })
      .where(eq(users.id, input.id));

    await tx.delete(userRoles).where(eq(userRoles.userId, input.id));
    await tx.insert(userRoles).values({
      userId: input.id,
      roleId: input.roleId,
    });

    if (nextPassword.length > 0) {
      const hashedPassword = await hashPassword(nextPassword);
      await tx
        .update(accounts)
        .set({
          password: hashedPassword,
          updatedAt: now,
        })
        .where(
          and(
            eq(accounts.userId, input.id),
            eq(accounts.providerId, "credential"),
          ),
        );
    }
  });

  return { id: input.id };
}

export async function deleteUser(userId: string, actorUserId: string) {
  if (userId === actorUserId) {
    throw new AppError(
      "No puedes eliminar tu propio usuario.",
      "SELF_DELETE",
      409,
    );
  }

  const [current] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!current) {
    throw new AppError("El usuario no existe.", "USER_NOT_FOUND", 404);
  }

  const isAdmin = await userHasRole(userId, ROLE_IDS.administrador);
  if (isAdmin && (await countAdministrators()) <= 1) {
    throw new AppError(
      "No se puede eliminar el último administrador.",
      "LAST_ADMIN",
      409,
    );
  }

  await db.delete(users).where(eq(users.id, userId));
  return { id: userId };
}
