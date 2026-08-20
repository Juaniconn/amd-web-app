import { config } from "dotenv";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { hashPassword } from "better-auth/crypto";
import { accounts, permissions, rolePermissions, roles, userRoles, users } from "./schema";
import { PERMISSIONS, ROLES } from "../lib/permissions/catalog";
import { seedInventoryCatalogs } from "./seed-inventory";
import { seedProductionCatalogs } from "./seed-production";
import { seedCalculatorCatalogs } from "./seed-calculator";
import { seedBetaFlow } from "./seed-beta-flow";
import { wipeOperationalData } from "./seed-wipe";

config({ path: ".env.local" });
config();

async function seed() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }

  const client = postgres(url, { max: 1 });
  const db = drizzle(client);

  try {
    for (const [id, permission] of Object.entries(PERMISSIONS)) {
      await db
        .insert(permissions)
        .values({
          id,
          name: permission.name,
          description: permission.description,
        })
        .onConflictDoUpdate({
          target: permissions.id,
          set: {
            name: permission.name,
            description: permission.description,
            updatedAt: new Date(),
          },
        });
    }

    for (const [id, role] of Object.entries(ROLES)) {
      await db
        .insert(roles)
        .values({
          id,
          name: role.name,
          description: role.description,
        })
        .onConflictDoUpdate({
          target: roles.id,
          set: {
            name: role.name,
            description: role.description,
            updatedAt: new Date(),
          },
        });

      await db.delete(rolePermissions).where(eq(rolePermissions.roleId, id));
      if (role.permissions.length > 0) {
        await db.insert(rolePermissions).values(
          role.permissions.map((permissionId) => ({
            roleId: id,
            permissionId,
          })),
        );
      }
    }

    const adminEmail = (
      process.env.SEED_ADMIN_EMAIL ?? "admin@amd-operations.local"
    ).toLowerCase();
    const adminPassword = process.env.SEED_ADMIN_PASSWORD;
    const adminName = process.env.SEED_ADMIN_NAME ?? "Administrador AMD";

    if (!adminPassword || adminPassword.length < 8) {
      throw new Error(
        "SEED_ADMIN_PASSWORD must be set and at least 8 characters.",
      );
    }

    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, adminEmail))
      .limit(1);

    if (existing.length === 0) {
      const userId = crypto.randomUUID();
      const now = new Date();
      const hashedPassword = await hashPassword(adminPassword);

      await db.insert(users).values({
        id: userId,
        name: adminName,
        email: adminEmail,
        emailVerified: true,
        createdAt: now,
        updatedAt: now,
      });

      await db.insert(accounts).values({
        id: crypto.randomUUID(),
        accountId: userId,
        providerId: "credential",
        userId,
        password: hashedPassword,
        createdAt: now,
        updatedAt: now,
      });

      await db.insert(userRoles).values({
        userId,
        roleId: "administrador",
      });

      console.log(`Seeded admin user ${adminEmail}`);
    } else {
      console.log(`Admin user ${adminEmail} already exists`);
    }

    const [admin] = await db
      .select({ id: users.id, name: users.name })
      .from(users)
      .where(eq(users.email, adminEmail))
      .limit(1);

    await wipeOperationalData(db);
    await seedInventoryCatalogs(db);
    await seedProductionCatalogs(db, admin ?? null);
    await seedCalculatorCatalogs(db, admin ?? null);
    await seedBetaFlow(db, admin ?? null);

    console.log(
      "Foundation, plant catalogs and beta walkthrough seed completed. Official branches CJS/GDL/ELP come from migration 0009.",
    );
  } finally {
    await client.end({ timeout: 5 });
  }
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
