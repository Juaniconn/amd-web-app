import { eq, inArray } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { activitySummary } from "../lib/audit/activity";
import {
  DEFAULT_WAREHOUSE_BY_CATEGORY,
  formatQty,
  OFFICIAL_UOM_SEEDS,
  OFFICIAL_WAREHOUSE_SEEDS,
} from "../lib/inventory/catalog";
import {
  activityLogs,
  inventoryBalances,
  inventoryMovements,
  materials,
  productionOrderMaterials,
  productionOrders,
  unitsOfMeasure,
  warehouses,
} from "./schema";

type DemoMaterial = {
  id: string;
  code: string;
  description: string;
  category: "materia_prima" | "consumibles" | "herramientas" | "producto_terminado";
  unitId: string;
  isCritical: boolean;
  minStock: string | null;
  onHand: string;
  notes: string;
};

const DEMO_MATERIALS: DemoMaterial[] = [
  {
    id: "demo-mat-001",
    code: "DEMO_MAT_001",
    description: "Placa aluminio 6061 — DEMO",
    category: "materia_prima",
    unitId: "uom-kg",
    isCritical: false,
    minStock: "20",
    onHand: "100",
    notes: "Material demo. No es stock real de AMD.",
  },
  {
    id: "demo-mat-002",
    code: "DEMO_MAT_002",
    description: "PEEK barra — DEMO crítico",
    category: "materia_prima",
    unitId: "uom-kg",
    isCritical: true,
    minStock: "10",
    onHand: "5",
    notes: "Crítico con bajo stock a propósito para KPI demo.",
  },
  {
    id: "demo-mat-003",
    code: "DEMO_MAT_003",
    description: "Insertos de uso general — DEMO",
    category: "consumibles",
    unitId: "uom-pza",
    isCritical: false,
    minStock: null,
    onHand: "40",
    notes: "Consumible demo.",
  },
  {
    id: "demo-mat-004",
    code: "DEMO_MAT_004",
    description: "Pieza terminada eje demo — DEMO",
    category: "producto_terminado",
    unitId: "uom-pza",
    isCritical: false,
    minStock: null,
    onHand: "0",
    notes: "PT demo. Entrada al cierre físico si se declara en la OT.",
  },
];

export async function seedInventoryDemo(
  db: PostgresJsDatabase,
  admin: { id: string; name: string } | null,
) {
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

  const demoIds = DEMO_MATERIALS.map((item) => item.id);
  await db
    .delete(inventoryMovements)
    .where(inArray(inventoryMovements.materialId, demoIds));
  await db
    .delete(productionOrderMaterials)
    .where(inArray(productionOrderMaterials.materialId, demoIds));
  await db
    .delete(inventoryBalances)
    .where(inArray(inventoryBalances.materialId, demoIds));
  await db.delete(activityLogs).where(inArray(activityLogs.entityId, demoIds));
  await db.delete(materials).where(eq(materials.isDemo, true));

  for (const item of DEMO_MATERIALS) {
    const warehouseId = DEFAULT_WAREHOUSE_BY_CATEGORY[item.category];
    await db.insert(materials).values({
      id: item.id,
      code: item.code,
      description: item.description,
      category: item.category,
      unitId: item.unitId,
      warehouseId,
      isCritical: item.isCritical,
      active: true,
      minStock: item.minStock,
      notes: item.notes,
      isDemo: true,
      createdBy: admin?.id ?? null,
      updatedBy: admin?.id ?? null,
      createdAt: now,
      updatedAt: now,
    });
    await db.insert(inventoryBalances).values({
      id: `bal-${item.id}`,
      materialId: item.id,
      warehouseId,
      onHand: formatQty(item.onHand),
      reserved: "0",
      updatedAt: now,
    });
    if (Number(item.onHand) > 0) {
      await db.insert(inventoryMovements).values({
        id: `mov-in-${item.id}`,
        materialId: item.id,
        warehouseId,
        type: "entrada",
        quantity: formatQty(item.onHand),
        onHandDelta: formatQty(item.onHand),
        reservedDelta: "0",
        reason: "Carga inicial DEMO",
        isDemo: true,
        createdBy: admin?.id ?? null,
        createdAt: now,
      });
    }
    await db.insert(activityLogs).values({
      id: `act-mat-${item.id}`,
      actorUserId: admin?.id ?? null,
      action: "created",
      entityType: "material",
      entityId: item.id,
      summary: activitySummary({
        actorName: admin?.name ?? null,
        action: "created",
        entityType: "material",
        entityLabel: item.code,
      }),
      createdAt: now,
    });
  }

  const [demoOt] = await db
    .select({ id: productionOrders.id, number: productionOrders.number })
    .from(productionOrders)
    .where(eq(productionOrders.id, "demo-op-001"))
    .limit(1);

  if (demoOt) {
    const required = "12";
    const reserved = "12";
    const consumed = "2";
    await db.insert(productionOrderMaterials).values({
      id: "demo-ot-mat-001",
      productionOrderId: demoOt.id,
      materialId: "demo-mat-001",
      warehouseId: "wh-mp",
      requiredQty: formatQty(required),
      reservedQty: formatQty(reserved),
      consumedQty: formatQty(consumed),
      createdBy: admin?.id ?? null,
      updatedBy: admin?.id ?? null,
      createdAt: now,
      updatedAt: now,
    });
    await db
      .update(inventoryBalances)
      .set({
        reserved: formatQty(Number(reserved) - Number(consumed)),
        onHand: formatQty(100 - Number(consumed)),
        updatedAt: now,
      })
      .where(eq(inventoryBalances.id, "bal-demo-mat-001"));
    await db.insert(inventoryMovements).values([
      {
        id: "mov-res-demo-ot-001",
        materialId: "demo-mat-001",
        warehouseId: "wh-mp",
        type: "reserva",
        quantity: formatQty(reserved),
        onHandDelta: "0",
        reservedDelta: formatQty(reserved),
        reason: `Reserva OT ${demoOt.number}`,
        productionOrderId: demoOt.id,
        productionOrderMaterialId: "demo-ot-mat-001",
        isDemo: true,
        createdBy: admin?.id ?? null,
        createdAt: now,
      },
      {
        id: "mov-cons-demo-ot-001",
        materialId: "demo-mat-001",
        warehouseId: "wh-mp",
        type: "consumo",
        quantity: formatQty(consumed),
        onHandDelta: formatQty(-Number(consumed)),
        reservedDelta: formatQty(-Number(consumed)),
        reason: `Consumo OT ${demoOt.number}`,
        productionOrderId: demoOt.id,
        productionOrderMaterialId: "demo-ot-mat-001",
        isDemo: true,
        createdBy: admin?.id ?? null,
        createdAt: now,
      },
    ]);
  }

  console.log("Seeded inventory catalogs and DEMO materials.");
}
