import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import {
  activityLogs,
  downtimeReasons,
  engineeringRequests,
  laborHours,
  machineHours,
  machines,
  orderItems,
  orders,
  productionDowntime,
  productionOperations,
  productionOrders,
  productionRouteSteps,
  productionRoutes,
  productionRework,
  quoteItems,
  quotes,
  workCenters,
} from "./schema";
import { activitySummary } from "../lib/audit/activity";
import {
  OFFICIAL_DOWNTIME_REASON_SEEDS,
  OFFICIAL_WORK_CENTER_SEEDS,
} from "../lib/production/catalog";
import type { ProductionStatus } from "../lib/production/status";
import type { ProductionPriority } from "../lib/production/catalog";

const CENTER_IDS: Record<string, string> = Object.fromEntries(
  OFFICIAL_WORK_CENTER_SEEDS.map((center) => [center.code, `wc-${center.code}`]),
);

const MACHINES = [
  { id: "m-vmc-1", name: "VMC #1", workCenter: "cnc" },
  { id: "m-vmc-2", name: "VMC #2", workCenter: "cnc" },
  { id: "m-vmc-3", name: "VMC #3", workCenter: "cnc" },
  { id: "m-vmc-4", name: "VMC #4", workCenter: "cnc" },
  { id: "m-vmc-5", name: "VMC #5", workCenter: "cnc" },
  { id: "m-torno-1", name: "Torno #1", workCenter: "tornos" },
  { id: "m-torno-2", name: "Torno #2", workCenter: "tornos" },
  { id: "m-laser-1", name: "Láser #1", workCenter: "laser" },
  { id: "m-laser-2", name: "Láser #2", workCenter: "laser" },
  { id: "m-press-brake", name: "Press Brake", workCenter: "doblado" },
  { id: "m-wire-edm", name: "Wire EDM", workCenter: "wire_edm" },
  { id: "m-grinder", name: "Surface Grinder", workCenter: "rectificado" },
  { id: "m-injection", name: "Injection Molding", workCenter: "moldeo" },
  { id: "m-router", name: "Router CNC", workCenter: "router_cnc" },
  { id: "m-weld", name: "Soldadura", workCenter: "soldadura" },
];

type DemoOp = {
  id: string;
  number: string;
  orderId: string;
  routeId: string;
  description: string;
  partNumber: string;
  quantity: string;
  promisedDays: number;
  priority: ProductionPriority;
  status: ProductionStatus;
  workCenter: string;
  machineId: string;
  notes: string;
};

const DEMO_OPS: DemoOp[] = [
  {
    id: "demo-op-001",
    number: "DEMO_OP_001",
    orderId: "demo-quote-005-order",
    routeId: "route-a",
    description: "Eje torneado — OT demo de pieza maquinada.",
    partNumber: "AMD-TRN-01",
    quantity: "12",
    promisedDays: 3,
    priority: "urgente",
    status: "en_produccion",
    workCenter: "tornos",
    machineId: "m-torno-1",
    notes: "DEMO. No es producción real de AMD.",
  },
  {
    id: "demo-op-002",
    number: "DEMO_OP_002",
    orderId: "demo-quote-005-order",
    routeId: "route-a",
    description: "Segunda OT del pedido DEMO_PEDIDO_005.",
    partNumber: "AMD-TRN-01",
    quantity: "8",
    promisedDays: -2,
    priority: "compromiso_inmediato",
    status: "programada",
    workCenter: "cnc",
    machineId: "m-vmc-1",
    notes: "Retrasada a propósito para KPI demo.",
  },
  {
    id: "demo-op-003",
    number: "DEMO_OP_003",
    orderId: "demo-quote-015-order",
    routeId: "route-a",
    description: "OT pendiente de liberación.",
    partNumber: "AMD-TRN-02",
    quantity: "20",
    promisedDays: 10,
    priority: "produccion_normal",
    status: "pendiente",
    workCenter: "cnc",
    machineId: "m-vmc-2",
    notes: "DEMO.",
  },
  {
    id: "demo-op-004",
    number: "DEMO_OP_004",
    orderId: "demo-quote-015-order",
    routeId: "route-c",
    description: "Pieza Wire EDM demo.",
    partNumber: "AMD-EDM-01",
    quantity: "4",
    promisedDays: 6,
    priority: "programada",
    status: "liberada",
    workCenter: "wire_edm",
    machineId: "m-wire-edm",
    notes: "DEMO ruta C.",
  },
  {
    id: "demo-op-005",
    number: "DEMO_OP_005",
    orderId: "demo-quote-015-order",
    routeId: "route-a",
    description: "OT en calidad.",
    partNumber: "AMD-TRN-02",
    quantity: "6",
    promisedDays: 1,
    priority: "compromiso_inmediato",
    status: "calidad",
    workCenter: "calidad",
    machineId: "m-vmc-3",
    notes: "Espera cierre físico de Calidad. DEMO.",
  },
  {
    id: "demo-op-006",
    number: "DEMO_OP_006",
    orderId: "demo-quote-005-order",
    routeId: "route-a",
    description: "OT terminada con cierre físico.",
    partNumber: "AMD-TRN-01",
    quantity: "10",
    promisedDays: -1,
    priority: "produccion_normal",
    status: "terminada",
    workCenter: "cnc",
    machineId: "m-vmc-4",
    notes: "Cerrada físicamente. Pendiente cierre administrativo. DEMO.",
  },
  {
    id: "demo-op-007",
    number: "DEMO_OP_007",
    orderId: "demo-quote-008-order",
    routeId: "route-b",
    description: "Gabinete metálico — origen RFQ + Ingeniería.",
    partNumber: "AMD-LS-A36",
    quantity: "25",
    promisedDays: 4,
    priority: "programada",
    status: "pausada",
    workCenter: "laser",
    machineId: "m-laser-1",
    notes: "Pausada por setup. DEMO.",
  },
  {
    id: "demo-op-008",
    number: "DEMO_OP_008",
    orderId: "demo-quote-008-order",
    routeId: "route-b",
    description: "OT entregada demo (handoff a logística).",
    partNumber: "AMD-LS-A36",
    quantity: "5",
    promisedDays: -5,
    priority: "produccion_normal",
    status: "entregada",
    workCenter: "soldadura",
    machineId: "m-weld",
    notes: "Cierre administrativo demo. Entregas completas son Fase 9.",
  },
];

const ROUTE_STEPS: Record<
  string,
  { kind: "ingenieria" | "produccion" | "calidad" | "entrega"; center?: string; name: string }[]
> = {
  "route-a": [
    { kind: "ingenieria", name: "Ingeniería" },
    { kind: "produccion", center: "cnc", name: "CNC" },
    { kind: "calidad", center: "calidad", name: "Calidad" },
    { kind: "entrega", name: "Entrega" },
  ],
  "route-b": [
    { kind: "ingenieria", name: "Ingeniería" },
    { kind: "produccion", center: "laser", name: "Láser" },
    { kind: "produccion", center: "doblado", name: "Doblado" },
    { kind: "produccion", center: "soldadura", name: "Soldadura" },
    { kind: "calidad", center: "calidad", name: "Calidad" },
    { kind: "entrega", name: "Entrega" },
  ],
  "route-c": [
    { kind: "ingenieria", name: "Ingeniería" },
    { kind: "produccion", center: "cnc", name: "CNC" },
    { kind: "produccion", center: "wire_edm", name: "Wire EDM" },
    { kind: "calidad", center: "calidad", name: "Calidad" },
    { kind: "entrega", name: "Entrega" },
  ],
};

async function ensureEngineeringOrder(
  db: PostgresJsDatabase,
  actor: { id: string; name: string } | null,
) {
  const [quote] = await db
    .select()
    .from(quotes)
    .where(eq(quotes.id, "demo-quote-008"))
    .limit(1);
  if (!quote) return;

  const [eng] = await db
    .select({ id: engineeringRequests.id, status: engineeringRequests.status })
    .from(engineeringRequests)
    .where(eq(engineeringRequests.id, "demo-eng-008"))
    .limit(1);
  if (!eng || eng.status !== "liberado") return;

  const now = new Date();
  const orderId = "demo-quote-008-order";
  const [item] = await db
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, orderId))
    .limit(1);

  await db
    .insert(orders)
    .values({
      id: orderId,
      number: "DEMO_PEDIDO_008",
      customerId: quote.customerId,
      quoteId: quote.id,
      origin: "rfq_ingenieria",
      engineeringRequestId: eng.id,
      currency: quote.currency,
      total: quote.total,
      status: "en_produccion",
      ownerUserId: actor?.id ?? null,
      promisedDate: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
      notes: quote.notes,
      isDemo: true,
      createdBy: actor?.id ?? null,
      updatedBy: actor?.id ?? null,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: orders.number,
      set: {
        origin: "rfq_ingenieria",
        engineeringRequestId: eng.id,
        updatedAt: now,
      },
    });

  if (!item) {
    const lines = await db
      .select()
      .from(quoteItems)
      .where(eq(quoteItems.quoteId, quote.id));
    if (lines.length > 0) {
      await db.delete(orderItems).where(eq(orderItems.orderId, orderId));
      await db.insert(orderItems).values(
        lines.map((line) => ({
          id: `${orderId}-item-${line.position}`,
          orderId,
          position: line.position,
          description: line.description,
          partNumber: line.partNumber,
          quantity: line.quantity,
          unit: line.unit,
          unitPrice: line.unitPrice,
          discountPercent: line.discountPercent,
          taxPercent: line.taxPercent,
          lineSubtotal: line.lineSubtotal,
          lineTax: line.lineTax,
          lineTotal: line.lineTotal,
        })),
      );
    }
  }

  await db
    .update(quotes)
    .set({
      convertedOrderId: orderId,
      status: "convertida",
      updatedAt: now,
    })
    .where(eq(quotes.id, quote.id));
}

export async function seedProductionDemo(
  db: PostgresJsDatabase,
  actor: { id: string; name: string } | null,
) {
  const now = new Date();

  for (const center of OFFICIAL_WORK_CENTER_SEEDS) {
    await db
      .insert(workCenters)
      .values({
        id: CENTER_IDS[center.code],
        code: center.code,
        name: center.name,
        sortOrder: center.sortOrder,
        active: true,
        isDemo: true,
        createdBy: actor?.id ?? null,
        updatedBy: actor?.id ?? null,
      })
      .onConflictDoUpdate({
        target: workCenters.id,
        set: { name: center.name, active: true, updatedAt: now },
      });
  }

  for (const reason of OFFICIAL_DOWNTIME_REASON_SEEDS) {
    await db
      .insert(downtimeReasons)
      .values({
        id: `dr-${reason.code}`,
        code: reason.code,
        name: reason.name,
        sortOrder: reason.sortOrder,
        active: true,
        isOfficialSeed: true,
      })
      .onConflictDoUpdate({
        target: downtimeReasons.id,
        set: { name: reason.name, active: true, updatedAt: now },
      });
  }

  for (const machine of MACHINES) {
    await db
      .insert(machines)
      .values({
        id: machine.id,
        name: machine.name,
        workCenterId: CENTER_IDS[machine.workCenter],
        hoursPerShift: "8",
        status: "disponible",
        active: true,
        commissionedAt: now,
        isDemo: true,
        notes: "Equipo DEMO. No inventar capacidades técnicas.",
        createdBy: actor?.id ?? null,
        updatedBy: actor?.id ?? null,
      })
      .onConflictDoUpdate({
        target: machines.id,
        set: {
          name: machine.name,
          workCenterId: CENTER_IDS[machine.workCenter],
          updatedAt: now,
        },
      });
  }

  const routes = [
    {
      id: "route-a",
      code: "ruta_a",
      name: "Ruta A — Pieza Maquinada",
      description: "Ingeniería → CNC → Calidad → Entrega",
    },
    {
      id: "route-b",
      code: "ruta_b",
      name: "Ruta B — Gabinete Metálico",
      description: "Ingeniería → Láser → Doblado → Soldadura → Calidad → Entrega",
    },
    {
      id: "route-c",
      code: "ruta_c",
      name: "Ruta C — Wire EDM",
      description: "Ingeniería → CNC → Wire EDM → Calidad → Entrega",
    },
  ];

  for (const route of routes) {
    await db
      .insert(productionRoutes)
      .values({
        id: route.id,
        code: route.code,
        name: route.name,
        description: route.description,
        active: true,
        isOfficialSeed: true,
        createdBy: actor?.id ?? null,
        updatedBy: actor?.id ?? null,
      })
      .onConflictDoUpdate({
        target: productionRoutes.id,
        set: { name: route.name, description: route.description, updatedAt: now },
      });
    await db
      .delete(productionRouteSteps)
      .where(eq(productionRouteSteps.routeId, route.id));
    await db.insert(productionRouteSteps).values(
      ROUTE_STEPS[route.id].map((step, index) => ({
        id: `${route.id}-step-${index + 1}`,
        routeId: route.id,
        position: index + 1,
        kind: step.kind,
        workCenterId: step.center ? CENTER_IDS[step.center] : null,
        name: step.name,
      })),
    );
  }

  await ensureEngineeringOrder(db, actor);

  for (const demo of DEMO_OPS) {
    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, demo.orderId))
      .limit(1);
    if (!order) continue;

    const promisedDate = new Date(now.getTime() + demo.promisedDays * 24 * 60 * 60 * 1000);
    const released = demo.status !== "pendiente";
    const scheduled = [
      "programada",
      "en_produccion",
      "pausada",
      "esperando_material",
      "calidad",
      "terminada",
      "entregada",
    ].includes(demo.status);
    const started = [
      "en_produccion",
      "pausada",
      "calidad",
      "terminada",
      "entregada",
    ].includes(demo.status);
    const inQuality = ["calidad", "terminada", "entregada"].includes(demo.status);
    const finished = ["terminada", "entregada"].includes(demo.status);
    const delivered = demo.status === "entregada";

    await db
      .insert(productionOrders)
      .values({
        id: demo.id,
        number: demo.number,
        orderId: order.id,
        customerId: order.customerId,
        quoteId: order.quoteId,
        engineeringRequestId: order.engineeringRequestId,
        origin: order.origin,
        routeId: demo.routeId,
        description: demo.description,
        partNumber: demo.partNumber,
        quantity: demo.quantity,
        unit: "pza",
        promisedDate,
        priority: demo.priority,
        status: demo.status,
        notes: demo.notes,
        workCenterId: CENTER_IDS[demo.workCenter],
        machineId: demo.machineId,
        operatorUserId: actor?.id ?? null,
        pauseReasonId: demo.status === "pausada" ? "dr-setup" : null,
        releasedAt: released ? now : null,
        scheduledAt: scheduled ? now : null,
        startedAt: started ? now : null,
        pausedAt: demo.status === "pausada" ? now : null,
        qualityAt: inQuality ? now : null,
        physicallyClosedAt: finished ? now : null,
        physicallyClosedBy: finished ? actor?.id ?? null : null,
        administrativelyClosedAt: delivered ? now : null,
        administrativelyClosedBy: delivered ? actor?.id ?? null : null,
        deliveredAt: delivered ? now : null,
        isDemo: true,
        createdBy: actor?.id ?? null,
        updatedBy: actor?.id ?? null,
      })
      .onConflictDoUpdate({
        target: productionOrders.id,
        set: {
          status: demo.status,
          promisedDate,
          updatedAt: now,
        },
      });

    await db
      .delete(productionOperations)
      .where(eq(productionOperations.productionOrderId, demo.id));
    const steps = ROUTE_STEPS[demo.routeId];
    await db.insert(productionOperations).values(
      steps.map((step, index) => ({
        id: `${demo.id}-op-${index + 1}`,
        productionOrderId: demo.id,
        routeStepId: `${demo.routeId}-step-${index + 1}`,
        position: index + 1,
        kind: step.kind,
        workCenterId: step.center ? CENTER_IDS[step.center] : null,
        name: step.name,
        status:
          step.kind === "ingenieria"
            ? ("omitida" as const)
            : finished
              ? ("terminada" as const)
              : ("pendiente" as const),
      })),
    );

    const existingLog = await db
      .select({ id: activityLogs.id })
      .from(activityLogs)
      .where(eq(activityLogs.id, `${demo.id}-created`))
      .limit(1);
    if (existingLog.length === 0) {
      await db.insert(activityLogs).values({
        id: `${demo.id}-created`,
        actorUserId: actor?.id ?? null,
        action: "created",
        entityType: "production_order",
        entityId: demo.id,
        parentEntityType: "order",
        parentEntityId: order.id,
        summary: activitySummary({
          actorName: actor?.name ?? null,
          action: "created",
          entityType: "production_order",
          entityLabel: demo.number,
        }),
        newValue: { number: demo.number, source: "demo-seed" },
      });
    }
  }

  await db.delete(machineHours).where(eq(machineHours.id, "demo-mh-001"));
  await db.insert(machineHours).values({
    id: "demo-mh-001",
    productionOrderId: "demo-op-001",
    machineId: "m-torno-1",
    operatorUserId: actor?.id ?? null,
    startedAt: new Date(now.getTime() - 3 * 60 * 60 * 1000),
    endedAt: now,
    durationMinutes: 180,
    notes: "Corrida DEMO.",
    createdBy: actor?.id ?? null,
  });

  await db.delete(laborHours).where(eq(laborHours.id, "demo-lh-001"));
  if (actor) {
    await db.insert(laborHours).values({
      id: "demo-lh-001",
      productionOrderId: "demo-op-001",
      operatorUserId: actor.id,
      startedAt: new Date(now.getTime() - 3 * 60 * 60 * 1000),
      endedAt: now,
      durationMinutes: 180,
      notes: "Operación DEMO.",
      createdBy: actor.id,
    });
  }

  await db.delete(productionDowntime).where(eq(productionDowntime.id, "demo-dt-001"));
  await db.insert(productionDowntime).values({
    id: "demo-dt-001",
    productionOrderId: "demo-op-007",
    machineId: "m-laser-1",
    reasonId: "dr-setup",
    startedAt: now,
    notes: "Setup DEMO.",
    createdBy: actor?.id ?? null,
  });

  await db.delete(productionRework).where(eq(productionRework.id, "demo-rw-001"));
  await db.insert(productionRework).values({
    id: "demo-rw-001",
    productionOrderId: "demo-op-005",
    partNumber: "AMD-TRN-02",
    quantity: "2",
    scrapQuantity: "1",
    rootCause: "Cota fuera de tolerancia. DEMO.",
    laborHours: "1.50",
    machineHours: "0.75",
    qualityReleased: false,
    createdBy: actor?.id ?? null,
  });

  await db
    .update(machines)
    .set({ status: "en_produccion", updatedAt: now })
    .where(eq(machines.id, "m-torno-1"));

  console.log(`Seeded ${DEMO_OPS.length} demo production orders.`);
}
