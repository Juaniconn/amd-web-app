import "server-only";

import { and, eq, gte, inArray, lte, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  customers,
  inventoryBalances,
  laborHours,
  machineHours,
  machines,
  materials,
  orders,
  productionOperations,
  productionOrders,
  userRoles,
  users,
  workCenters,
} from "@/db/schema";
import { ACTIVE_PRODUCTION_STATUSES, OPERATION_ACTIVE_STATUSES } from "@/lib/production/status";

export type TvMachineStatus = {
  id: string;
  name: string;
  workCenter: string;
  status: "disponible" | "en_produccion" | "ocupada" | "mantenimiento" | "fuera_de_servicio";
  operatorName: string | null;
  currentPartNumber: string | null;
};

export type TvOrder = {
  id: string;
  number: string;
  customerName: string;
  totalParts: number;
  doneParts: number;
  status: string;
  promisedDate: Date | null;
  isDelayed: boolean;
};

export type TvDashboard = {
  generatedAt: string;
  orders: TvOrder[];
  machines: TvMachineStatus[];
  operators: TvOperator[];
  materialAlerts: TvMaterialAlert[];
  metrics: {
    activeParts: number;
    delayedParts: number;
    machineHoursToday: number;
    laborHoursToday: number;
    partsInProgress: number;
    partsInQuality: number;
    activeOperators: number;
  };
};

export type TvOperator = {
  id: string;
  name: string;
  activeOperations: number;
  currentPartNumber: string | null;
};

export type TvMaterialAlert = {
  id: string;
  materialName: string;
  code: string;
  currentStock: number;
  minStock: number;
  tone: "urgent" | "warning";
};

export async function getTvDashboard(): Promise<TvDashboard> {
  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);

  const activeRows = await db
    .select()
    .from(productionOrders)
    .where(
      and(
        inArray(productionOrders.status, ACTIVE_PRODUCTION_STATUSES),
        ne(productionOrders.status, "cancelada"),
      ),
    );
  const activeParts = activeRows.length;

  const delayedRows = await db
    .select()
    .from(productionOrders)
    .where(
      and(
        lte(productionOrders.promisedDate, now),
        inArray(productionOrders.status, ["pendiente", "liberada", "programada", "en_produccion", "pausada", "esperando_material"]),
      ),
    );
  const delayedParts = delayedRows.length;

  const machineHoursRows = await db
    .select()
    .from(machineHours)
    .where(gte(machineHours.startedAt, startOfDay));
  const machineHoursToday = machineHoursRows.reduce(
    (acc, row) => acc + (row.durationMinutes ?? 0),
    0,
  );

  const laborHoursRows = await db
    .select()
    .from(laborHours)
    .where(gte(laborHours.startedAt, startOfDay));
  const laborHoursToday = laborHoursRows.reduce(
    (acc, row) => acc + (row.durationMinutes ?? 0),
    0,
  );

  const inProgressRows = await db
    .select()
    .from(productionOrders)
    .where(eq(productionOrders.status, "en_produccion"));
  const partsInProgress = inProgressRows.length;

  const qualityRows = await db
    .select()
    .from(productionOrders)
    .where(eq(productionOrders.status, "calidad"));
  const partsInQuality = qualityRows.length;

  const ordersWithParts = await db
    .select({
      id: orders.id,
      number: orders.number,
      customerName: customers.legalName,
      promisedDate: orders.promisedDate,
    })
    .from(orders)
    .innerJoin(customers, eq(orders.customerId, customers.id))
    .where(
      inArray(orders.status, ["pendiente", "aprobado", "en_produccion"]),
    )
    .limit(20);

  const orderProgress = await Promise.all(
    ordersWithParts.map(async (order) => {
      const total = await db
        .select()
        .from(productionOrders)
        .where(
          and(
            eq(productionOrders.orderId, order.id),
            ne(productionOrders.status, "cancelada"),
          ),
        );
      const done = await db
        .select()
        .from(productionOrders)
        .where(
          and(
            eq(productionOrders.orderId, order.id),
            inArray(productionOrders.status, ["terminada", "entregada"]),
          ),
        );
      const totalCount = total.length;
      const doneCount = done.length;
      const isDelayed = totalCount > 0 && doneCount < totalCount && !!order.promisedDate && order.promisedDate < now;
      return {
        ...order,
        totalParts: totalCount,
        doneParts: doneCount,
        status: "active",
        isDelayed,
      };
    }),
  );

  const machineRows = await db
    .select({
      id: machines.id,
      name: machines.name,
      workCenter: workCenters.name,
      status: machines.status,
      operatorName: users.name,
    })
    .from(machines)
    .innerJoin(workCenters, eq(machines.workCenterId, workCenters.id))
    .leftJoin(users, eq(machines.responsibleUserId, users.id))
    .where(eq(machines.active, true));

  const machinesWithParts = await Promise.all(
    machineRows.map(async (machine) => {
      const currentJob = await db
        .select({ number: productionOrders.number })
        .from(productionOrders)
        .where(
          and(
            eq(productionOrders.machineId, machine.id),
            eq(productionOrders.status, "en_produccion"),
          ),
        )
        .limit(1);
      return {
        ...machine,
        currentPartNumber: currentJob[0]?.number ?? null,
      };
    }),
  );

  const operatorRows = await db
    .select({
      id: users.id,
      name: users.name,
    })
    .from(users)
    .innerJoin(userRoles, eq(users.id, userRoles.userId))
    .where(eq(userRoles.roleId, "produccion"))
    .orderBy(users.name);

  const operatorsWithLoad: TvOperator[] = await Promise.all(
    operatorRows.map(async (op) => {
      const activeOps = await db
        .select({ id: productionOperations.id })
        .from(productionOperations)
        .where(
          and(
            eq(productionOperations.operatorUserId, op.id),
            inArray(productionOperations.status, OPERATION_ACTIVE_STATUSES),
          ),
        );
      const currentJob = await db
        .select({ number: productionOrders.number })
        .from(productionOrders)
        .innerJoin(
          productionOperations,
          eq(productionOrders.id, productionOperations.productionOrderId),
        )
        .where(
          and(
            eq(productionOperations.operatorUserId, op.id),
            inArray(productionOperations.status, OPERATION_ACTIVE_STATUSES),
          ),
        )
        .limit(1);
      return {
        id: op.id,
        name: op.name,
        activeOperations: activeOps.length,
        currentPartNumber: currentJob[0]?.number ?? null,
      };
    }),
  );

  const activeOperators = operatorsWithLoad.filter((op) => op.activeOperations > 0).length;

  const lowStockMaterials = await db
    .select({
      id: materials.id,
      materialName: materials.description,
      code: materials.code,
      minStock: materials.minStock,
    })
    .from(materials)
    .where(
      and(
        eq(materials.active, true),
        sql`${materials.minStock} is not null`,
      ),
    );

  const materialAlerts: TvMaterialAlert[] = [];
  for (const mat of lowStockMaterials) {
    const [balance] = await db
      .select({ onHand: sql<number>`coalesce(sum(${inventoryBalances.onHand}), 0)` })
      .from(inventoryBalances)
      .where(eq(inventoryBalances.materialId, mat.id));
    const onHand = Number(balance?.onHand ?? 0);
    const minStock = Number(mat.minStock ?? 0);
    if (onHand < minStock) {
      materialAlerts.push({
        id: mat.id,
        materialName: mat.materialName,
        code: mat.code ?? "",
        currentStock: onHand,
        minStock,
        tone: onHand === 0 ? "urgent" : "warning",
      });
    }
  }

  return {
    generatedAt: now.toISOString(),
    orders: orderProgress,
    machines: machinesWithParts,
    operators: operatorsWithLoad,
    materialAlerts,
    metrics: {
      activeParts,
      delayedParts,
      machineHoursToday,
      laborHoursToday,
      partsInProgress,
      partsInQuality,
      activeOperators,
    },
  };
}
