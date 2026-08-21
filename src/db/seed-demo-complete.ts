import { eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { hashPassword } from "better-auth/crypto";
import { accounts, users, userRoles } from "./schema";

type Actor = { id: string; name: string } | null;

export async function seedDemoComplete(db: PostgresJsDatabase, actor: Actor) {
  const now = new Date();
  const YEAR = now.getFullYear();

  // Create operator users (role: produccion)
  const operators = [
    { id: "op-juan-martinez", name: "Juan Martínez", email: "juan.martinez@amd-demo.local", password: "operador123" },
    { id: "op-ramiro-sanchez", name: "Ramiro Sánchez", email: "ramiro.sanchez@amd-demo.local", password: "operador123" },
    { id: "op-luis-hernandez", name: "Luis Hernández", email: "luis.hernandez@amd-demo.local", password: "operador123" },
    { id: "op-ana-torres", name: "Ana Torres", email: "ana.torres@amd-demo.local", password: "operador123" },
    { id: "op-carlos-diaz", name: "Carlos Díaz", email: "carlos.diaz@amd-demo.local", password: "operador123" },
  ];

  for (const op of operators) {
    const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, op.email)).limit(1);
    if (existing.length === 0) {
      const hashed = await hashPassword(op.password);
      await db.insert(users).values({
        id: op.id,
        name: op.name,
        email: op.email,
        emailVerified: true,
        createdAt: now,
        updatedAt: now,
      });
      await db.insert(accounts).values({
        id: crypto.randomUUID(),
        accountId: op.id,
        providerId: "credential",
        userId: op.id,
        password: hashed,
        createdAt: now,
        updatedAt: now,
      });
      await db.insert(userRoles).values({
        userId: op.id,
        roleId: "produccion",
        createdAt: now,
      });
      console.log(`✓ Operador creado: ${op.name} (${op.email}) — password: ${op.password}`);
    }
  }

  // Create demo admin (role: administrador)
  const adminEmail = "admin@amd-demo.local";
  const adminPassword = "admin12345";
  const existingAdmin = await db.select({ id: users.id }).from(users).where(eq(users.email, adminEmail)).limit(1);
  if (existingAdmin.length === 0) {
    const adminId = "admin-demo";
    const hashed = await hashPassword(adminPassword);
    await db.insert(users).values({
      id: adminId,
      name: "Administrador Demo",
      email: adminEmail,
      emailVerified: true,
      createdAt: now,
      updatedAt: now,
    });
    await db.insert(accounts).values({
      id: crypto.randomUUID(),
      accountId: adminId,
      providerId: "credential",
      userId: adminId,
      password: hashed,
      createdAt: now,
      updatedAt: now,
    });
    await db.insert(userRoles).values({
      userId: adminId,
      roleId: "administrador",
      createdAt: now,
    });
    console.log(`✓ Admin creado: ${adminEmail} — password: ${adminPassword}`);
  }

  console.log("✓ Usuarios de demo creados (5 operadores + 1 admin)");
}
