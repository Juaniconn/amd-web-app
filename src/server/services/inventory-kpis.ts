import "server-only";

import { and, eq, gte, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  inventoryBalances,
  inventoryMovements,
  materials,
} from "@/db/schema";

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export async function getInventoryDashboardStats() {
  const today = startOfToday();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [itemsWithStock] = await db
    .select({ value: sql<number>`count(*)::int` })
    .from(inventoryBalances)
    .where(sql`${inventoryBalances.onHand} > 0`);

  const [criticalLow] = await db
    .select({ value: sql<number>`count(*)::int` })
    .from(materials)
    .innerJoin(
      inventoryBalances,
      and(
        eq(inventoryBalances.materialId, materials.id),
        eq(inventoryBalances.warehouseId, materials.warehouseId),
      ),
    )
    .where(
      and(
        eq(materials.isCritical, true),
        eq(materials.active, true),
        sql`${materials.minStock} is not null`,
        sql`(${inventoryBalances.onHand} - ${inventoryBalances.reserved}) <= ${materials.minStock}`,
      ),
    );

  const [reservedLines] = await db
    .select({ value: sql<number>`count(*)::int` })
    .from(inventoryBalances)
    .where(sql`${inventoryBalances.reserved} > 0`);

  const [consumedToday] = await db
    .select({ value: sql<number>`count(*)::int` })
    .from(inventoryMovements)
    .where(
      and(
        eq(inventoryMovements.type, "consumo"),
        gte(inventoryMovements.createdAt, today),
        lt(inventoryMovements.createdAt, tomorrow),
      ),
    );

  const [movementsToday] = await db
    .select({ value: sql<number>`count(*)::int` })
    .from(inventoryMovements)
    .where(
      and(
        gte(inventoryMovements.createdAt, today),
        lt(inventoryMovements.createdAt, tomorrow),
      ),
    );

  const [adjustmentsToday] = await db
    .select({ value: sql<number>`count(*)::int` })
    .from(inventoryMovements)
    .where(
      and(
        eq(inventoryMovements.type, "ajuste"),
        gte(inventoryMovements.createdAt, today),
        lt(inventoryMovements.createdAt, tomorrow),
      ),
    );

  return {
    itemsWithStock: Number(itemsWithStock?.value ?? 0),
    criticalLowStock: Number(criticalLow?.value ?? 0),
    reservedLines: Number(reservedLines?.value ?? 0),
    consumedToday: Number(consumedToday?.value ?? 0),
    movementsToday: Number(movementsToday?.value ?? 0),
    adjustmentsToday: Number(adjustmentsToday?.value ?? 0),
  };
}
