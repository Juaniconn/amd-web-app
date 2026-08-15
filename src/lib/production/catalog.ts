export const PRODUCTION_PRIORITIES = [
  "urgente",
  "compromiso_inmediato",
  "programada",
  "produccion_normal",
] as const;

export type ProductionPriority = (typeof PRODUCTION_PRIORITIES)[number];

export const PRODUCTION_PRIORITY_RANK: Record<ProductionPriority, 1 | 2 | 3 | 4> =
  {
    urgente: 1,
    compromiso_inmediato: 2,
    programada: 3,
    produccion_normal: 4,
  };

export const PRODUCTION_PRIORITY_LABELS: Record<ProductionPriority, string> = {
  urgente: "Urgente",
  compromiso_inmediato: "Compromiso inmediato",
  programada: "Programada",
  produccion_normal: "Producción normal",
};

export function productionPriorityVariant(
  priority: ProductionPriority,
): "destructive" | "default" | "secondary" | "outline" {
  if (priority === "urgente") return "destructive";
  if (priority === "compromiso_inmediato") return "default";
  if (priority === "programada") return "secondary";
  return "outline";
}

export const DEFAULT_PRODUCTION_PRIORITY: ProductionPriority =
  "produccion_normal";

/** Orden del selector: default primero, no el rango 1–4. */
export const PRODUCTION_PRIORITY_OPTIONS: ProductionPriority[] = [
  "produccion_normal",
  "programada",
  "compromiso_inmediato",
  "urgente",
];

export const MACHINE_STATUSES = [
  "disponible",
  "en_produccion",
  "ocupada",
  "mantenimiento",
  "fuera_de_servicio",
] as const;

export type MachineStatus = (typeof MACHINE_STATUSES)[number];

export const MACHINE_STATUS_LABELS: Record<MachineStatus, string> = {
  disponible: "Disponible",
  en_produccion: "En producción",
  ocupada: "Ocupada",
  mantenimiento: "Mantenimiento",
  fuera_de_servicio: "Fuera de servicio",
};

export const PRODUCTION_ROUTE_STEP_KINDS = [
  "ingenieria",
  "produccion",
  "calidad",
  "entrega",
] as const;

export type ProductionRouteStepKind =
  (typeof PRODUCTION_ROUTE_STEP_KINDS)[number];

export const PRODUCTION_ROUTE_STEP_KIND_LABELS: Record<
  ProductionRouteStepKind,
  string
> = {
  ingenieria: "Ingeniería",
  produccion: "Producción",
  calidad: "Calidad",
  entrega: "Entrega",
};

export const OFFICIAL_WORK_CENTER_SEEDS = [
  { code: "cnc", name: "CNC", sortOrder: 10 },
  { code: "tornos", name: "Tornos", sortOrder: 20 },
  { code: "laser", name: "Láser", sortOrder: 30 },
  { code: "doblado", name: "Doblado", sortOrder: 40 },
  { code: "wire_edm", name: "Wire EDM", sortOrder: 50 },
  { code: "soldadura", name: "Soldadura", sortOrder: 60 },
  { code: "ensamble", name: "Ensamble", sortOrder: 70 },
  { code: "calidad", name: "Calidad", sortOrder: 80 },
  { code: "router_cnc", name: "Router CNC", sortOrder: 90 },
  { code: "rectificado", name: "Rectificado", sortOrder: 100 },
  { code: "moldeo", name: "Moldeo", sortOrder: 110 },
  { code: "prototipado", name: "Prototipado", sortOrder: 120 },
] as const;

export const OFFICIAL_DOWNTIME_REASON_SEEDS = [
  { code: "falla_mecanica", name: "Falla Mecánica", sortOrder: 10 },
  { code: "setup", name: "Setup", sortOrder: 20 },
  { code: "falta_material", name: "Falta Material", sortOrder: 30 },
  { code: "espera_calidad", name: "Espera Calidad", sortOrder: 40 },
  { code: "falta_operador", name: "Falta Operador", sortOrder: 50 },
  { code: "espera_programa", name: "Espera Programa", sortOrder: 60 },
  { code: "espera_plano", name: "Espera Plano", sortOrder: 70 },
] as const;

export type ProductionMonitoring = "en_tiempo" | "en_riesgo" | "retrasada";

export const PRODUCTION_MONITORING_LABELS: Record<ProductionMonitoring, string> =
  {
    en_tiempo: "En tiempo",
    en_riesgo: "En riesgo",
    retrasada: "Retrasada",
  };

const RISK_WINDOW_MS = 2 * 24 * 60 * 60 * 1000;

export function productionMonitoring(
  promisedDate: Date,
  status: string,
  now = new Date(),
): ProductionMonitoring {
  if (
    status === "terminada" ||
    status === "entregada" ||
    status === "cancelada"
  ) {
    return promisedDate.getTime() < now.getTime() ? "retrasada" : "en_tiempo";
  }
  if (promisedDate.getTime() < now.getTime()) return "retrasada";
  if (promisedDate.getTime() - now.getTime() <= RISK_WINDOW_MS) {
    return "en_riesgo";
  }
  return "en_tiempo";
}

export function durationMinutes(startedAt: Date, endedAt: Date): number {
  const minutes = Math.round((endedAt.getTime() - startedAt.getTime()) / 60000);
  return Math.max(0, minutes);
}

export function minutesToHours(minutes: number): number {
  return Math.round((minutes / 60) * 100) / 100;
}

export function formatHoursMinutes(totalMinutes: number): string {
  const minutes = Math.max(0, Math.round(totalMinutes));
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest} min`;
  if (rest === 0) return `${hours} h`;
  return `${hours} h ${rest} min`;
}

export function hoursToMinutes(hours: number): number {
  return Math.round(Math.max(0, hours) * 60);
}
