import "server-only";

import { and, asc, eq, isNull, ne } from "drizzle-orm";
import { db } from "@/db";
import { branches, orders, quotes } from "@/db/schema";
import { AppError } from "@/lib/errors";
import type { CreateBranchInput, UpdateBranchInput } from "@/lib/validation/branches";
import { recordActivity } from "@/server/services/activity";
import type { Actor } from "@/server/services/customers";

export const OFFICIAL_BRANCH_SEED = [
  {
    id: "amd-branch-cjs",
    code: "CJS",
    name: "AMD México — Ciudad Juárez",
    city: "Ciudad Juárez",
    state: "Chihuahua",
    country: "México",
  },
  {
    id: "amd-branch-gdl",
    code: "GDL",
    name: "AMD México — Guadalajara",
    city: "Guadalajara",
    state: "Jalisco",
    country: "México",
  },
  {
    id: "amd-branch-elp",
    code: "ELP",
    name: "AMD México — El Paso",
    city: "El Paso",
    state: "Texas",
    country: "Estados Unidos",
  },
] as const;

export type BranchRow = typeof branches.$inferSelect;

function snapshot(row: BranchRow) {
  return {
    code: row.code,
    name: row.name,
    city: row.city,
    status: row.status,
    rfc: row.rfc,
    phone: row.phone,
  };
}

async function assertUniqueCode(code: string, excludeId?: string) {
  const filters = [eq(branches.code, code), isNull(branches.deletedAt)];
  if (excludeId) filters.push(ne(branches.id, excludeId));
  const [existing] = await db
    .select({ id: branches.id })
    .from(branches)
    .where(and(...filters))
    .limit(1);
  if (existing) {
    throw new AppError("Ya existe una sucursal con ese código.", "BRANCH_CODE_TAKEN", 400);
  }
}

export async function listBranches(options?: { activeOnly?: boolean }) {
  const filters = [isNull(branches.deletedAt)];
  if (options?.activeOnly) filters.push(eq(branches.status, "activo"));
  return db
    .select()
    .from(branches)
    .where(and(...filters))
    .orderBy(asc(branches.name));
}

export async function getBranchById(id: string) {
  const [row] = await db.select().from(branches).where(eq(branches.id, id)).limit(1);
  return row ?? null;
}

export async function requireActiveBranch(id: string) {
  const row = await getBranchById(id);
  if (!row || row.deletedAt) {
    throw new AppError("La sucursal no existe.", "BRANCH_NOT_FOUND", 404);
  }
  if (row.status !== "activo") {
    throw new AppError("La sucursal está inactiva.", "BRANCH_INACTIVE", 400);
  }
  return row;
}

export function branchSnapshotFields(row: BranchRow) {
  return {
    branchId: row.id,
    branchName: row.name,
    branchCode: row.code,
    branchAddress: row.address,
    branchCity: row.city,
    branchState: row.state,
    branchCountry: row.country,
    branchPostalCode: row.postalCode,
    branchPhone: row.phone,
    branchEmail: row.email,
    branchRfc: row.rfc,
  };
}

export async function createBranch(input: CreateBranchInput, actor: Actor) {
  await assertUniqueCode(input.code);
  const id = crypto.randomUUID();
  const now = new Date();
  await db.transaction(async (tx) => {
    await tx.insert(branches).values({
      id,
      code: input.code,
      name: input.name,
      address: input.address ?? null,
      city: input.city ?? null,
      state: input.state ?? null,
      country: input.country,
      postalCode: input.postalCode ?? null,
      phone: input.phone ?? null,
      email: input.email ?? null,
      rfc: input.rfc ? input.rfc.toUpperCase() : null,
      status: input.status,
      createdBy: actor.userId,
      updatedBy: actor.userId,
      createdAt: now,
      updatedAt: now,
    });
    await recordActivity(tx, {
      actorUserId: actor.userId,
      actorName: actor.name,
      action: "created",
      entityType: "branch",
      entityId: id,
      entityLabel: `${input.code} ${input.name}`,
    });
  });
  return { id };
}

export async function updateBranch(input: UpdateBranchInput, actor: Actor) {
  const current = await getBranchById(input.id);
  if (!current || current.deletedAt) {
    throw new AppError("La sucursal no existe.", "BRANCH_NOT_FOUND", 404);
  }
  await assertUniqueCode(input.code, input.id);
  await db.transaction(async (tx) => {
    await tx
      .update(branches)
      .set({
        code: input.code,
        name: input.name,
        address: input.address ?? null,
        city: input.city ?? null,
        state: input.state ?? null,
        country: input.country,
        postalCode: input.postalCode ?? null,
        phone: input.phone ?? null,
        email: input.email ?? null,
        rfc: input.rfc ? input.rfc.toUpperCase() : null,
        status: input.status,
        updatedBy: actor.userId,
        updatedAt: new Date(),
      })
      .where(eq(branches.id, input.id));
    await recordActivity(tx, {
      actorUserId: actor.userId,
      actorName: actor.name,
      action: "updated",
      entityType: "branch",
      entityId: input.id,
      entityLabel: `${input.code} ${input.name}`,
      previousValue: snapshot(current),
      newValue: {
        code: input.code,
        name: input.name,
        city: input.city ?? null,
        status: input.status,
        rfc: input.rfc ?? null,
        phone: input.phone ?? null,
      },
    });
  });
  return { id: input.id };
}

export async function archiveBranch(id: string, actor: Actor) {
  const current = await getBranchById(id);
  if (!current || current.deletedAt) {
    throw new AppError("La sucursal no existe.", "BRANCH_NOT_FOUND", 404);
  }
  if (current.isOfficialSeed) {
    throw new AppError(
      "No se puede eliminar una sucursal oficial. Desactívala.",
      "BRANCH_OFFICIAL",
      400,
    );
  }
  const [quoteRef] = await db
    .select({ id: quotes.id })
    .from(quotes)
    .where(eq(quotes.branchId, id))
    .limit(1);
  const [orderRef] = await db
    .select({ id: orders.id })
    .from(orders)
    .where(eq(orders.branchId, id))
    .limit(1);
  if (quoteRef || orderRef) {
    throw new AppError(
      "No se puede eliminar. Hay cotizaciones o pedidos de esta sucursal. Desactívala.",
      "BRANCH_IN_USE",
      400,
    );
  }
  const now = new Date();
  await db.transaction(async (tx) => {
    await tx
      .update(branches)
      .set({
        deletedAt: now,
        status: "inactivo",
        updatedBy: actor.userId,
        updatedAt: now,
      })
      .where(eq(branches.id, id));
    await recordActivity(tx, {
      actorUserId: actor.userId,
      actorName: actor.name,
      action: "deleted",
      entityType: "branch",
      entityId: id,
      entityLabel: `${current.code} ${current.name}`,
    });
  });
  return { id };
}
