import "server-only";

import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  inventoryBalances,
  inventoryMovements,
  materials,
  productionOrderMaterials,
  productionOrders,
  unitsOfMeasure,
  warehouses,
} from "@/db/schema";
import { AppError } from "@/lib/errors";
import {
  addQty,
  availableQty,
  DEFAULT_WAREHOUSE_BY_CATEGORY,
  displayQty,
  formatQty,
  INVENTORY_MOVEMENT_TYPE_LABELS,
  minQty,
  parseQty,
  qtyGt,
  qtyGte,
  subQty,
  type InventoryMovementType,
  type MaterialCategory,
} from "@/lib/inventory/catalog";
import { TERMINAL_PRODUCTION_STATUSES } from "@/lib/production/status";
import type {
  AddOrderMaterialInput,
  AdjustStockInput,
  ConsumeOrderMaterialInput,
  CreateMaterialInput,
  IssueStockInput,
  StockMovementInput,
  UpdateMaterialInput,
} from "@/lib/validation/inventory";
import { recordActivity } from "@/server/services/activity";
import { nextDocumentNumber } from "@/server/services/numbering";

type Actor = { userId: string; name: string };
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

const PAGE_SIZE = 20;

function yearPrefix(prefix: string) {
  return `${prefix}${new Date().getFullYear()}-`;
}

export async function listWarehouses() {
  return db
    .select({
      id: warehouses.id,
      code: warehouses.code,
      name: warehouses.name,
      description: warehouses.description,
      sortOrder: warehouses.sortOrder,
      active: warehouses.active,
    })
    .from(warehouses)
    .orderBy(warehouses.sortOrder, warehouses.name);
}

export async function listUnitsOfMeasure() {
  return db
    .select({
      id: unitsOfMeasure.id,
      code: unitsOfMeasure.code,
      name: unitsOfMeasure.name,
      integerOnly: unitsOfMeasure.integerOnly,
      sortOrder: unitsOfMeasure.sortOrder,
      active: unitsOfMeasure.active,
    })
    .from(unitsOfMeasure)
    .orderBy(unitsOfMeasure.sortOrder, unitsOfMeasure.name);
}

export async function listMaterials(input: {
  q?: string;
  category?: MaterialCategory;
  critical?: boolean;
  active?: boolean;
  lowStock?: boolean;
  page?: number;
}) {
  const page = Math.max(1, input.page ?? 1);
  const filters = [];
  if (input.q) {
    const term = `%${input.q}%`;
    filters.push(or(ilike(materials.code, term), ilike(materials.description, term)));
  }
  if (input.category) filters.push(eq(materials.category, input.category));
  if (input.critical) filters.push(eq(materials.isCritical, true));
  if (input.active !== undefined) filters.push(eq(materials.active, input.active));

  const where = filters.length ? and(...filters) : undefined;

  const [countRow] = await db
    .select({ value: sql<number>`count(*)::int` })
    .from(materials)
    .where(where);

  const rows = await db
    .select({
      id: materials.id,
      code: materials.code,
      description: materials.description,
      category: materials.category,
      isCritical: materials.isCritical,
      active: materials.active,
      minStock: materials.minStock,
      isDemo: materials.isDemo,
      unitCode: unitsOfMeasure.code,
      unitName: unitsOfMeasure.name,
      warehouseId: warehouses.id,
      warehouseName: warehouses.name,
      onHand: sql<string>`coalesce(${inventoryBalances.onHand}, '0')`,
      reserved: sql<string>`coalesce(${inventoryBalances.reserved}, '0')`,
    })
    .from(materials)
    .innerJoin(unitsOfMeasure, eq(unitsOfMeasure.id, materials.unitId))
    .innerJoin(warehouses, eq(warehouses.id, materials.warehouseId))
    .leftJoin(
      inventoryBalances,
      and(
        eq(inventoryBalances.materialId, materials.id),
        eq(inventoryBalances.warehouseId, materials.warehouseId),
      ),
    )
    .where(where)
    .orderBy(materials.code)
    .limit(PAGE_SIZE)
    .offset((page - 1) * PAGE_SIZE);

  let mapped = rows.map((row) => {
    const available = availableQty(row.onHand, row.reserved);
    const minStock = row.minStock;
    const lowStock =
      row.isCritical &&
      minStock !== null &&
      !qtyGt(available, minStock);
    return {
      ...row,
      available,
      lowStock,
    };
  });

  if (input.lowStock) {
    mapped = mapped.filter((row) => row.lowStock);
  }

  const total = Number(countRow?.value ?? 0);
  return {
    rows: mapped,
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  };
}

export async function getMaterialById(id: string) {
  const [row] = await db
    .select({
      id: materials.id,
      code: materials.code,
      description: materials.description,
      category: materials.category,
      unitId: materials.unitId,
      warehouseId: materials.warehouseId,
      isCritical: materials.isCritical,
      active: materials.active,
      minStock: materials.minStock,
      notes: materials.notes,
      isDemo: materials.isDemo,
      unitCode: unitsOfMeasure.code,
      unitName: unitsOfMeasure.name,
      integerOnly: unitsOfMeasure.integerOnly,
      warehouseName: warehouses.name,
      onHand: sql<string>`coalesce(${inventoryBalances.onHand}, '0')`,
      reserved: sql<string>`coalesce(${inventoryBalances.reserved}, '0')`,
    })
    .from(materials)
    .innerJoin(unitsOfMeasure, eq(unitsOfMeasure.id, materials.unitId))
    .innerJoin(warehouses, eq(warehouses.id, materials.warehouseId))
    .leftJoin(
      inventoryBalances,
      and(
        eq(inventoryBalances.materialId, materials.id),
        eq(inventoryBalances.warehouseId, materials.warehouseId),
      ),
    )
    .where(eq(materials.id, id))
    .limit(1);

  if (!row) return null;
  const available = availableQty(row.onHand, row.reserved);
  return { ...row, available };
}

export async function createMaterial(input: CreateMaterialInput, actor: Actor) {
  const unit = await loadUnit(input.unitId);
  const warehouseId =
    input.warehouseId ?? DEFAULT_WAREHOUSE_BY_CATEGORY[input.category];
  await loadWarehouse(warehouseId);

  return db.transaction(async (tx) => {
    const code = await nextDocumentNumber(tx, "materials", yearPrefix("MAT-"));
    const id = crypto.randomUUID();
    await tx.insert(materials).values({
      id,
      code,
      description: input.description,
      category: input.category,
      unitId: unit.id,
      warehouseId,
      isCritical: input.isCritical,
      active: input.active,
      minStock: input.minStock ? formatQty(input.minStock) : null,
      notes: input.notes ?? null,
      createdBy: actor.userId,
      updatedBy: actor.userId,
    });
    await tx.insert(inventoryBalances).values({
      id: crypto.randomUUID(),
      materialId: id,
      warehouseId,
      onHand: "0",
      reserved: "0",
    });
    await recordActivity(tx, {
      actorUserId: actor.userId,
      actorName: actor.name,
      action: "created",
      entityType: "material",
      entityId: id,
      entityLabel: code,
    });
    return { id, code };
  });
}

export async function updateMaterial(input: UpdateMaterialInput, actor: Actor) {
  const existing = await getMaterialById(input.id);
  if (!existing) {
    throw new AppError("El material no existe.", "MATERIAL_NOT_FOUND", 404);
  }

  await db.transaction(async (tx) => {
    await tx
      .update(materials)
      .set({
        description: input.description,
        isCritical: input.isCritical,
        active: input.active,
        minStock: input.minStock ? formatQty(input.minStock) : null,
        notes: input.notes ?? null,
        updatedBy: actor.userId,
        updatedAt: new Date(),
      })
      .where(eq(materials.id, input.id));
    await recordActivity(tx, {
      actorUserId: actor.userId,
      actorName: actor.name,
      action: "updated",
      entityType: "material",
      entityId: input.id,
      entityLabel: existing.code,
      previousValue: {
        description: existing.description,
        isCritical: existing.isCritical,
        active: existing.active,
        minStock: existing.minStock,
      },
      newValue: {
        description: input.description,
        isCritical: input.isCritical,
        active: input.active,
        minStock: input.minStock ?? null,
      },
    });
  });
}

export async function receiveStock(input: StockMovementInput, actor: Actor) {
  return applyManualMovement({
    type: "entrada",
    materialId: input.materialId,
    warehouseId: input.warehouseId,
    quantity: input.quantity,
    reason: input.reason,
    onHandDelta: formatQty(input.quantity),
    reservedDelta: "0",
    actor,
  });
}

export async function issueStock(input: IssueStockInput, actor: Actor) {
  return applyManualMovement({
    type: "salida",
    materialId: input.materialId,
    warehouseId: input.warehouseId,
    quantity: input.quantity,
    reason: input.reason,
    onHandDelta: formatQty(-parseQty(input.quantity)),
    reservedDelta: "0",
    actor,
  });
}

export async function adjustStock(input: AdjustStockInput, actor: Actor) {
  const signed =
    input.direction === "in"
      ? formatQty(input.quantity)
      : formatQty(-parseQty(input.quantity));
  return applyManualMovement({
    type: "ajuste",
    materialId: input.materialId,
    warehouseId: input.warehouseId,
    quantity: input.quantity,
    reason: input.reason,
    onHandDelta: signed,
    reservedDelta: "0",
    actor,
  });
}

async function applyManualMovement(input: {
  type: InventoryMovementType;
  materialId: string;
  warehouseId?: string;
  quantity: string;
  reason?: string;
  onHandDelta: string;
  reservedDelta: string;
  actor: Actor;
}) {
  const material = await loadMaterial(input.materialId);
  if (!material.active && input.type !== "ajuste") {
    throw new AppError(
      "No se pueden registrar movimientos en un material inactivo.",
      "MATERIAL_INACTIVE",
      409,
    );
  }
  const warehouseId = input.warehouseId ?? material.warehouseId;
  assertQuantityForUnit(input.quantity, material.integerOnly);

  await db.transaction(async (tx) => {
    await applyBalanceAndMovement(tx, {
      material,
      warehouseId,
      type: input.type,
      quantity: formatQty(input.quantity),
      onHandDelta: input.onHandDelta,
      reservedDelta: input.reservedDelta,
      reason: input.reason ?? null,
      actor: input.actor,
      isDemo: material.isDemo,
    });
  });
}

export async function listMovements(input: {
  materialId?: string;
  productionOrderId?: string;
  type?: InventoryMovementType;
  page?: number;
}) {
  const page = Math.max(1, input.page ?? 1);
  const filters = [];
  if (input.materialId) filters.push(eq(inventoryMovements.materialId, input.materialId));
  if (input.productionOrderId) {
    filters.push(eq(inventoryMovements.productionOrderId, input.productionOrderId));
  }
  if (input.type) filters.push(eq(inventoryMovements.type, input.type));
  const where = filters.length ? and(...filters) : undefined;

  const [countRow] = await db
    .select({ value: sql<number>`count(*)::int` })
    .from(inventoryMovements)
    .where(where);

  const rows = await db
    .select({
      id: inventoryMovements.id,
      type: inventoryMovements.type,
      quantity: inventoryMovements.quantity,
      onHandDelta: inventoryMovements.onHandDelta,
      reservedDelta: inventoryMovements.reservedDelta,
      reason: inventoryMovements.reason,
      createdAt: inventoryMovements.createdAt,
      isDemo: inventoryMovements.isDemo,
      materialId: materials.id,
      materialCode: materials.code,
      materialDescription: materials.description,
      warehouseName: warehouses.name,
      unitCode: unitsOfMeasure.code,
      productionOrderId: inventoryMovements.productionOrderId,
      productionOrderNumber: productionOrders.number,
    })
    .from(inventoryMovements)
    .innerJoin(materials, eq(materials.id, inventoryMovements.materialId))
    .innerJoin(warehouses, eq(warehouses.id, inventoryMovements.warehouseId))
    .innerJoin(unitsOfMeasure, eq(unitsOfMeasure.id, materials.unitId))
    .leftJoin(
      productionOrders,
      eq(productionOrders.id, inventoryMovements.productionOrderId),
    )
    .where(where)
    .orderBy(desc(inventoryMovements.createdAt))
    .limit(PAGE_SIZE)
    .offset((page - 1) * PAGE_SIZE);

  const total = Number(countRow?.value ?? 0);
  return {
    rows: rows.map((row) => ({
      ...row,
      typeLabel: INVENTORY_MOVEMENT_TYPE_LABELS[row.type],
    })),
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  };
}

export async function listActiveMaterialsForSelect() {
  return db
    .select({
      id: materials.id,
      code: materials.code,
      description: materials.description,
      unitCode: unitsOfMeasure.code,
      category: materials.category,
      active: materials.active,
    })
    .from(materials)
    .innerJoin(unitsOfMeasure, eq(unitsOfMeasure.id, materials.unitId))
    .where(eq(materials.active, true))
    .orderBy(materials.code);
}

export async function listOrderMaterials(productionOrderId: string) {
  const rows = await db
    .select({
      id: productionOrderMaterials.id,
      productionOrderId: productionOrderMaterials.productionOrderId,
      materialId: productionOrderMaterials.materialId,
      warehouseId: productionOrderMaterials.warehouseId,
      requiredQty: productionOrderMaterials.requiredQty,
      reservedQty: productionOrderMaterials.reservedQty,
      consumedQty: productionOrderMaterials.consumedQty,
      materialCode: materials.code,
      materialDescription: materials.description,
      category: materials.category,
      unitCode: unitsOfMeasure.code,
      warehouseName: warehouses.name,
      onHand: sql<string>`coalesce(${inventoryBalances.onHand}, '0')`,
      reserved: sql<string>`coalesce(${inventoryBalances.reserved}, '0')`,
    })
    .from(productionOrderMaterials)
    .innerJoin(materials, eq(materials.id, productionOrderMaterials.materialId))
    .innerJoin(unitsOfMeasure, eq(unitsOfMeasure.id, materials.unitId))
    .innerJoin(warehouses, eq(warehouses.id, productionOrderMaterials.warehouseId))
    .leftJoin(
      inventoryBalances,
      and(
        eq(inventoryBalances.materialId, productionOrderMaterials.materialId),
        eq(inventoryBalances.warehouseId, productionOrderMaterials.warehouseId),
      ),
    )
    .where(eq(productionOrderMaterials.productionOrderId, productionOrderId))
    .orderBy(materials.code);

  return rows.map((row) => {
    const available = availableQty(row.onHand, row.reserved);
    const shortage = qtyGt(row.requiredQty, row.reservedQty)
      ? subQty(row.requiredQty, row.reservedQty)
      : "0";
    const consumable = subQty(row.reservedQty, row.consumedQty);
    return {
      ...row,
      available,
      shortage,
      consumable,
      covered: qtyGte(row.reservedQty, row.requiredQty),
    };
  });
}

export async function addOrderMaterial(input: AddOrderMaterialInput, actor: Actor) {
  const order = await loadProductionOrder(input.productionOrderId);
  assertOrderAcceptsReservation(order.status);
  const material = await loadMaterial(input.materialId);
  if (!material.active) {
    throw new AppError(
      "No se puede reservar un material inactivo.",
      "MATERIAL_INACTIVE",
      409,
    );
  }
  assertQuantityForUnit(input.quantity, material.integerOnly);

  await db.transaction(async (tx) => {
    const duplicate = await tx
      .select({ id: productionOrderMaterials.id })
      .from(productionOrderMaterials)
      .where(
        and(
          eq(productionOrderMaterials.productionOrderId, order.id),
          eq(productionOrderMaterials.materialId, material.id),
        ),
      )
      .limit(1);
    if (duplicate[0]) {
      throw new AppError(
        "Ese material ya está en la OT.",
        "MATERIAL_ALREADY_ON_OT",
        409,
      );
    }
    await tx.insert(productionOrderMaterials).values({
      id: crypto.randomUUID(),
      productionOrderId: order.id,
      materialId: material.id,
      warehouseId: material.warehouseId,
      requiredQty: formatQty(input.quantity),
      createdBy: actor.userId,
      updatedBy: actor.userId,
    });
    await recordActivity(tx, {
      actorUserId: actor.userId,
      actorName: actor.name,
      action: "updated",
      entityType: "production_order",
      entityId: order.id,
      entityLabel: `${order.number} · material ${material.code}`,
      parentEntityType: "production_order",
      parentEntityId: order.id,
      newValue: { materialId: material.id, requiredQty: formatQty(input.quantity) },
    });
  });
}

export async function removeOrderMaterial(lineId: string, actor: Actor) {
  const line = await loadOrderMaterialLine(lineId);
  if (qtyGt(line.reservedQty, 0) || qtyGt(line.consumedQty, 0)) {
    throw new AppError(
      "No se puede quitar una línea con reserva o consumo. Libera o consume primero.",
      "LINE_IN_USE",
      409,
    );
  }
  const order = await loadProductionOrder(line.productionOrderId);
  assertOrderAcceptsReservation(order.status);

  await db.transaction(async (tx) => {
    await tx
      .delete(productionOrderMaterials)
      .where(eq(productionOrderMaterials.id, lineId));
    await recordActivity(tx, {
      actorUserId: actor.userId,
      actorName: actor.name,
      action: "updated",
      entityType: "production_order",
      entityId: order.id,
      entityLabel: `${order.number} · se quitó ${line.materialCode}`,
      parentEntityType: "production_order",
      parentEntityId: order.id,
    });
  });
}

export async function reserveOrderMaterials(
  productionOrderId: string,
  actor: Actor,
  lineId?: string,
) {
  const order = await loadProductionOrder(productionOrderId);
  assertOrderAcceptsReservation(order.status);

  return db.transaction(async (tx) => {
    const lines = await listOrderMaterials(productionOrderId);
    const targets = lineId ? lines.filter((line) => line.id === lineId) : lines;
    if (targets.length === 0) {
      throw new AppError(
        "La OT no tiene material requerido para reservar.",
        "NO_MATERIAL_LINES",
        409,
      );
    }

    let reservedAny = false;
    let shortage = false;

    for (const line of targets) {
      const needed = subQty(line.requiredQty, line.reservedQty);
      if (!qtyGt(needed, 0)) continue;
      const material = await loadMaterial(line.materialId);
      const balance = await lockBalance(tx, line.materialId, line.warehouseId);
      const disponible = availableQty(balance.onHand, balance.reserved);
      const toReserve = minQty(needed, disponible);
      if (!qtyGt(toReserve, 0)) {
        shortage = true;
        continue;
      }
      reservedAny = true;
      if (qtyGt(needed, toReserve)) shortage = true;

      await applyBalanceAndMovement(tx, {
        material,
        warehouseId: line.warehouseId,
        type: "reserva",
        quantity: toReserve,
        onHandDelta: "0",
        reservedDelta: toReserve,
        reason: `Reserva OT ${order.number}`,
        actor,
        productionOrderId: order.id,
        productionOrderMaterialId: line.id,
        isDemo: order.isDemo || material.isDemo,
      });

      await tx
        .update(productionOrderMaterials)
        .set({
          reservedQty: addQty(line.reservedQty, toReserve),
          updatedBy: actor.userId,
          updatedAt: new Date(),
        })
        .where(eq(productionOrderMaterials.id, line.id));
    }

    if (!reservedAny && shortage) {
      throw new AppError(
        "No hay disponible para reservar. La OT puede pasar a Esperando Material.",
        "NO_AVAILABLE_STOCK",
        409,
      );
    }

    return { shortage, reservedAny };
  });
}

export async function consumeOrderMaterial(
  input: ConsumeOrderMaterialInput,
  actor: Actor,
) {
  const line = await loadOrderMaterialLine(input.lineId);
  const order = await loadProductionOrder(line.productionOrderId);
  if (order.status === "cancelada" || order.status === "entregada") {
    throw new AppError(
      "No se puede consumir material de una OT cerrada o cancelada.",
      "OT_CLOSED",
      409,
    );
  }
  const material = await loadMaterial(line.materialId);
  assertQuantityForUnit(input.quantity, material.integerOnly);
  const consumable = subQty(line.reservedQty, line.consumedQty);
  if (qtyGt(input.quantity, consumable)) {
    throw new AppError(
      `Solo se puede consumir lo reservado y no consumido (${displayQty(consumable)} ${material.unitCode}).`,
      "CONSUME_EXCEEDS_RESERVED",
      409,
    );
  }

  await db.transaction(async (tx) => {
    await applyBalanceAndMovement(tx, {
      material,
      warehouseId: line.warehouseId,
      type: "consumo",
      quantity: formatQty(input.quantity),
      onHandDelta: formatQty(-parseQty(input.quantity)),
      reservedDelta: formatQty(-parseQty(input.quantity)),
      reason: `Consumo OT ${order.number}`,
      actor,
      productionOrderId: order.id,
      productionOrderMaterialId: line.id,
      isDemo: order.isDemo || material.isDemo,
    });
    await tx
      .update(productionOrderMaterials)
      .set({
        consumedQty: addQty(line.consumedQty, input.quantity),
        updatedBy: actor.userId,
        updatedAt: new Date(),
      })
      .where(eq(productionOrderMaterials.id, line.id));
  });
}

export async function releaseReservationsForOrder(
  tx: Tx,
  productionOrderId: string,
  actor: Actor,
) {
  const order = await loadProductionOrder(productionOrderId);
  const lines = await listOrderMaterials(productionOrderId);
  for (const line of lines) {
    const leftover = subQty(line.reservedQty, line.consumedQty);
    if (!qtyGt(leftover, 0)) continue;
    const material = await loadMaterial(line.materialId);
    await applyBalanceAndMovement(tx, {
      material,
      warehouseId: line.warehouseId,
      type: "liberacion",
      quantity: leftover,
      onHandDelta: "0",
      reservedDelta: formatQty(-parseQty(leftover)),
      reason: `Liberación por cancelación OT ${order.number}`,
      actor,
      productionOrderId: order.id,
      productionOrderMaterialId: line.id,
      isDemo: order.isDemo || material.isDemo,
    });
    await tx
      .update(productionOrderMaterials)
      .set({
        reservedQty: line.consumedQty,
        updatedBy: actor.userId,
        updatedAt: new Date(),
      })
      .where(eq(productionOrderMaterials.id, line.id));
  }
}

export async function receiveFinishedGoodsForOrder(
  tx: Tx,
  productionOrderId: string,
  actor: Actor,
) {
  const order = await loadProductionOrder(productionOrderId);
  const lines = await listOrderMaterials(productionOrderId);
  const ptLines = lines.filter((line) => line.category === "producto_terminado");
  for (const line of ptLines) {
    const alreadyIn = line.requiredQty;
    const material = await loadMaterial(line.materialId);
    await applyBalanceAndMovement(tx, {
      material,
      warehouseId: line.warehouseId,
      type: "entrada",
      quantity: alreadyIn,
      onHandDelta: alreadyIn,
      reservedDelta: "0",
      reason: `Entrada PT por cierre físico OT ${order.number}`,
      actor,
      productionOrderId: order.id,
      productionOrderMaterialId: line.id,
      isDemo: order.isDemo || material.isDemo,
    });
  }
}

export async function orderHasUncoveredMaterial(productionOrderId: string) {
  const lines = await listOrderMaterials(productionOrderId);
  if (lines.length === 0) return false;
  return lines.some((line) => qtyGt(line.shortage, 0));
}

async function applyBalanceAndMovement(
  tx: Tx,
  input: {
    material: Awaited<ReturnType<typeof loadMaterial>>;
    warehouseId: string;
    type: InventoryMovementType;
    quantity: string;
    onHandDelta: string;
    reservedDelta: string;
    reason: string | null;
    actor: Actor;
    productionOrderId?: string;
    productionOrderMaterialId?: string;
    isDemo: boolean;
  },
) {
  const balance = await lockBalance(tx, input.material.id, input.warehouseId);
  const nextOnHand = addQty(balance.onHand, input.onHandDelta);
  const nextReserved = addQty(balance.reserved, input.reservedDelta);
  if (parseQty(nextOnHand) < 0) {
    throw new AppError(
      "La existencia no puede quedar negativa.",
      "NEGATIVE_ON_HAND",
      409,
    );
  }
  if (parseQty(nextReserved) < 0) {
    throw new AppError(
      "Lo reservado no puede quedar negativo.",
      "NEGATIVE_RESERVED",
      409,
    );
  }
  if (qtyGt(nextReserved, nextOnHand)) {
    throw new AppError(
      "Lo reservado no puede ser mayor que la existencia.",
      "RESERVED_EXCEEDS_ON_HAND",
      409,
    );
  }

  await tx
    .update(inventoryBalances)
    .set({
      onHand: nextOnHand,
      reserved: nextReserved,
      updatedAt: new Date(),
    })
    .where(eq(inventoryBalances.id, balance.id));

  const movementId = crypto.randomUUID();
  await tx.insert(inventoryMovements).values({
    id: movementId,
    materialId: input.material.id,
    warehouseId: input.warehouseId,
    type: input.type,
    quantity: formatQty(input.quantity),
    onHandDelta: formatQty(input.onHandDelta),
    reservedDelta: formatQty(input.reservedDelta),
    reason: input.reason,
    productionOrderId: input.productionOrderId ?? null,
    productionOrderMaterialId: input.productionOrderMaterialId ?? null,
    isDemo: input.isDemo,
    createdBy: input.actor.userId,
  });

  await recordActivity(tx, {
    actorUserId: input.actor.userId,
    actorName: input.actor.name,
    action: "stock_moved",
    entityType: "inventory_movement",
    entityId: movementId,
    entityLabel: `${INVENTORY_MOVEMENT_TYPE_LABELS[input.type]} ${displayQty(input.quantity)} ${input.material.unitCode} · ${input.material.code}`,
    parentEntityType: input.productionOrderId ? "production_order" : "material",
    parentEntityId: input.productionOrderId ?? input.material.id,
    newValue: {
      type: input.type,
      quantity: formatQty(input.quantity),
      onHand: nextOnHand,
      reserved: nextReserved,
    },
  });
}

async function lockBalance(tx: Tx, materialId: string, warehouseId: string) {
  const existing = await tx
    .select()
    .from(inventoryBalances)
    .where(
      and(
        eq(inventoryBalances.materialId, materialId),
        eq(inventoryBalances.warehouseId, warehouseId),
      ),
    )
    .for("update")
    .limit(1);

  if (existing[0]) return existing[0];

  const id = crypto.randomUUID();
  await tx.insert(inventoryBalances).values({
    id,
    materialId,
    warehouseId,
    onHand: "0",
    reserved: "0",
  });
  const [created] = await tx
    .select()
    .from(inventoryBalances)
    .where(eq(inventoryBalances.id, id))
    .for("update")
    .limit(1);
  if (!created) {
    throw new AppError("No se pudo crear el saldo de inventario.", "BALANCE_CREATE", 500);
  }
  return created;
}

async function loadMaterial(id: string) {
  const [row] = await db
    .select({
      id: materials.id,
      code: materials.code,
      description: materials.description,
      category: materials.category,
      warehouseId: materials.warehouseId,
      active: materials.active,
      isDemo: materials.isDemo,
      integerOnly: unitsOfMeasure.integerOnly,
      unitCode: unitsOfMeasure.code,
    })
    .from(materials)
    .innerJoin(unitsOfMeasure, eq(unitsOfMeasure.id, materials.unitId))
    .where(eq(materials.id, id))
    .limit(1);
  if (!row) {
    throw new AppError("El material no existe.", "MATERIAL_NOT_FOUND", 404);
  }
  return row;
}

async function loadUnit(id: string) {
  const [row] = await db
    .select()
    .from(unitsOfMeasure)
    .where(eq(unitsOfMeasure.id, id))
    .limit(1);
  if (!row || !row.active) {
    throw new AppError("La unidad de medida no es válida.", "UNIT_INVALID", 409);
  }
  return row;
}

async function loadWarehouse(id: string) {
  const [row] = await db
    .select()
    .from(warehouses)
    .where(eq(warehouses.id, id))
    .limit(1);
  if (!row || !row.active) {
    throw new AppError("El almacén no es válido.", "WAREHOUSE_INVALID", 409);
  }
  return row;
}

async function loadProductionOrder(id: string) {
  const [row] = await db
    .select({
      id: productionOrders.id,
      number: productionOrders.number,
      status: productionOrders.status,
      quantity: productionOrders.quantity,
      isDemo: productionOrders.isDemo,
    })
    .from(productionOrders)
    .where(eq(productionOrders.id, id))
    .limit(1);
  if (!row) {
    throw new AppError("La OT no existe.", "OP_NOT_FOUND", 404);
  }
  return row;
}

async function loadOrderMaterialLine(id: string) {
  const [row] = await db
    .select({
      id: productionOrderMaterials.id,
      productionOrderId: productionOrderMaterials.productionOrderId,
      materialId: productionOrderMaterials.materialId,
      warehouseId: productionOrderMaterials.warehouseId,
      requiredQty: productionOrderMaterials.requiredQty,
      reservedQty: productionOrderMaterials.reservedQty,
      consumedQty: productionOrderMaterials.consumedQty,
      materialCode: materials.code,
    })
    .from(productionOrderMaterials)
    .innerJoin(materials, eq(materials.id, productionOrderMaterials.materialId))
    .where(eq(productionOrderMaterials.id, id))
    .limit(1);
  if (!row) {
    throw new AppError("La línea de material no existe.", "LINE_NOT_FOUND", 404);
  }
  return row;
}

function assertOrderAcceptsReservation(status: string) {
  if (TERMINAL_PRODUCTION_STATUSES.includes(status as (typeof TERMINAL_PRODUCTION_STATUSES)[number])) {
    throw new AppError(
      "No se puede reservar material contra una OT entregada o cancelada.",
      "OT_TERMINAL",
      409,
    );
  }
}

function assertQuantityForUnit(quantity: string, integerOnly: boolean) {
  const n = parseQty(quantity);
  if (n <= 0) {
    throw new AppError("La cantidad debe ser mayor a 0.", "QTY_INVALID", 400);
  }
  if (integerOnly && !Number.isInteger(n)) {
    throw new AppError(
      "Esta unidad solo admite cantidades enteras.",
      "QTY_NOT_INTEGER",
      400,
    );
  }
}

export { displayQty };
