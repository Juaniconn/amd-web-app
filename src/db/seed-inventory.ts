import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import {
  OFFICIAL_UOM_SEEDS,
  OFFICIAL_WAREHOUSE_SEEDS,
} from "../lib/inventory/catalog";
import { unitsOfMeasure, warehouses } from "./schema";

export async function seedInventoryCatalogs(db: PostgresJsDatabase) {
  const now = new Date();

  for (const warehouse of OFFICIAL_WAREHOUSE_SEEDS) {
    await db
      .insert(warehouses)
      .values({
        id: warehouse.id,
        code: warehouse.code,
        name: warehouse.name,
        description: warehouse.description,
        sortOrder: warehouse.sortOrder,
        active: true,
        isOfficialSeed: true,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: warehouses.id,
        set: {
          name: warehouse.name,
          description: warehouse.description,
          sortOrder: warehouse.sortOrder,
          active: true,
          isOfficialSeed: true,
          updatedAt: now,
        },
      });
  }

  for (const unit of OFFICIAL_UOM_SEEDS) {
    await db
      .insert(unitsOfMeasure)
      .values({
        id: unit.id,
        code: unit.code,
        name: unit.name,
        integerOnly: unit.integerOnly,
        sortOrder: unit.sortOrder,
        active: true,
        isOfficialSeed: true,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: unitsOfMeasure.id,
        set: {
          name: unit.name,
          integerOnly: unit.integerOnly,
          sortOrder: unit.sortOrder,
          active: true,
          isOfficialSeed: true,
          updatedAt: now,
        },
      });
  }

  console.log("Seeded inventory catalogs (warehouses and units).");
}
