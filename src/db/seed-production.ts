import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import {
  downtimeReasons,
  machines,
  productionRouteSteps,
  productionRoutes,
  workCenters,
} from "./schema";
import {
  OFFICIAL_DOWNTIME_REASON_SEEDS,
  OFFICIAL_WORK_CENTER_SEEDS,
} from "../lib/production/catalog";
import { machineKindFromCenterCode } from "../lib/quotes/center-calculator";

const CENTER_IDS: Record<string, string> = Object.fromEntries(
  OFFICIAL_WORK_CENTER_SEEDS.map((center) => [center.code, `wc-${center.code}`]),
);

const MACHINES = [
  {
    id: "m-vmc-1",
    name: "VMC #1",
    workCenter: "cnc",
    brand: "HAAS",
    model: "VF-2",
    hourlyCost: "850",
    specs: { setupMin: 20, engineeringHours: 1 },
  },
  {
    id: "m-vmc-2",
    name: "VMC #2",
    workCenter: "cnc",
    brand: "HAAS",
    model: "VF-3",
    hourlyCost: "850",
    specs: { setupMin: 20, engineeringHours: 1 },
  },
  {
    id: "m-vmc-3",
    name: "VMC #3",
    workCenter: "cnc",
    hourlyCost: "800",
    specs: { setupMin: 25 },
  },
  {
    id: "m-vmc-4",
    name: "VMC #4",
    workCenter: "cnc",
    hourlyCost: "800",
    specs: { setupMin: 25 },
  },
  {
    id: "m-vmc-5",
    name: "VMC #5",
    workCenter: "cnc",
    hourlyCost: "800",
    specs: { setupMin: 25 },
  },
  {
    id: "m-torno-1",
    name: "Torno #1",
    workCenter: "tornos",
    hourlyCost: "720",
    specs: { setupMin: 15 },
  },
  {
    id: "m-torno-2",
    name: "Torno #2",
    workCenter: "tornos",
    hourlyCost: "720",
    specs: { setupMin: 15 },
  },
  {
    id: "m-laser-1",
    name: "Láser #1",
    workCenter: "laser",
    brand: "Bystronic",
    model: "Bysprint 3015",
    hourlyCost: "1200",
    specs: {
      cutSpeedIpm: 100,
      pierceSec: 1.2,
      loadMin: 1.5,
      unloadMin: 1,
      bedXMm: 3000,
      bedYMm: 1500,
    },
    notes: "Mesa 3000×1500 mm. Tarifa de demostración; Dirección puede ajustarla.",
  },
  {
    id: "m-laser-2",
    name: "Láser #2",
    workCenter: "laser",
    hourlyCost: "1100",
    specs: {
      cutSpeedIpm: 90,
      pierceSec: 1.4,
      loadMin: 1.5,
      unloadMin: 1,
      bedXMm: 2500,
      bedYMm: 1250,
    },
  },
  {
    id: "m-press-brake",
    name: "Press Brake",
    workCenter: "doblado",
    brand: "DURMA",
    model: "AD-S 30220",
    hourlyCost: "650",
    bendLengthMm: "3050",
    tonnageTon: "220",
    specs: { setupMin: 12, secPerHit: 18 },
    notes: "DURMA AD-S 30220. 220 t, 3050 mm.",
  },
  {
    id: "m-wire-edm",
    name: "Wire EDM",
    workCenter: "wire_edm",
    hourlyCost: "980",
    specs: { setupMin: 30 },
  },
  {
    id: "m-grinder",
    name: "Surface Grinder",
    workCenter: "rectificado",
    hourlyCost: "620",
    specs: { setupMin: 18 },
  },
  {
    id: "m-injection",
    name: "Injection Molding",
    workCenter: "moldeo",
    hourlyCost: "540",
    specs: { setupMin: 40 },
  },
  {
    id: "m-router",
    name: "Router CNC",
    workCenter: "router_cnc",
    hourlyCost: "480",
    specs: { setupMin: 15 },
  },
  {
    id: "m-weld",
    name: "Soldadura",
    workCenter: "soldadura",
    hourlyCost: "420",
    specs: { setupMin: 10 },
  },
  {
    id: "m-ensamble",
    name: "Banco de ensamble",
    workCenter: "ensamble",
    hourlyCost: "280",
    specs: { packingUnit: 75 },
  },
  {
    id: "m-proto",
    name: "CAM / Prototipado",
    workCenter: "prototipado",
    hourlyCost: "450",
    specs: { engineeringHours: 1.5 },
  },
  {
    id: "m-calidad",
    name: "CMM / Calidad",
    workCenter: "calidad",
    hourlyCost: "390",
  },
] as const;

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

export async function seedProductionCatalogs(
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
        isDemo: false,
        createdBy: actor?.id ?? null,
        updatedBy: actor?.id ?? null,
      })
      .onConflictDoUpdate({
        target: workCenters.id,
        set: { name: center.name, active: true, isDemo: false, updatedAt: now },
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
    const kind = machineKindFromCenterCode(machine.workCenter);
    const [existing] = await db
      .select({
        id: machines.id,
        hourlyCost: machines.hourlyCost,
        calculatorSpecs: machines.calculatorSpecs,
      })
      .from(machines)
      .where(eq(machines.id, machine.id))
      .limit(1);

    const values = {
      name: machine.name,
      brand: "brand" in machine ? machine.brand : null,
      model: "model" in machine ? machine.model : null,
      workCenterId: CENTER_IDS[machine.workCenter],
      hoursPerShift: "8",
      status: "disponible" as const,
      active: true,
      commissionedAt: now,
      isDemo: false,
      kind,
      hourlyCost: existing?.hourlyCost ?? machine.hourlyCost,
      bendLengthMm: "bendLengthMm" in machine ? machine.bendLengthMm : null,
      tonnageTon: "tonnageTon" in machine ? machine.tonnageTon : null,
      calculatorSpecs:
        existing?.calculatorSpecs ??
        ("specs" in machine ? { ...machine.specs } : null),
      notes: "notes" in machine ? machine.notes : null,
      createdBy: actor?.id ?? null,
      updatedBy: actor?.id ?? null,
    };

    if (existing) {
      await db
        .update(machines)
        .set({
          name: values.name,
          brand: values.brand,
          model: values.model,
          workCenterId: values.workCenterId,
          status: values.status,
          isDemo: false,
          kind,
          hourlyCost: values.hourlyCost,
          bendLengthMm: values.bendLengthMm,
          tonnageTon: values.tonnageTon,
          calculatorSpecs: values.calculatorSpecs,
          notes: values.notes,
          updatedAt: now,
        })
        .where(eq(machines.id, machine.id));
    } else {
      await db.insert(machines).values({
        id: machine.id,
        ...values,
      });
    }
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

  console.log("Seeded production catalogs (centers, machines, routes).");
}
