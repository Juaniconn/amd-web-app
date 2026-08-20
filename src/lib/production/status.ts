export const PRODUCTION_STATUSES = [
  "pendiente",
  "liberada",
  "programada",
  "en_produccion",
  "pausada",
  "esperando_material",
  "calidad",
  "terminada",
  "entregada",
  "cancelada",
] as const;

export type ProductionStatus = (typeof PRODUCTION_STATUSES)[number];

export const PRODUCTION_STATUS_LABELS: Record<ProductionStatus, string> = {
  pendiente: "Pendiente",
  liberada: "Liberada",
  programada: "Programada",
  en_produccion: "En Producción",
  pausada: "Pausada",
  esperando_material: "Esperando Material",
  calidad: "Calidad",
  terminada: "Terminada",
  entregada: "Entregada",
  cancelada: "Cancelada",
};

const TRANSITIONS: Record<ProductionStatus, ProductionStatus[]> = {
  pendiente: ["liberada", "cancelada"],
  liberada: ["programada", "esperando_material", "cancelada"],
  programada: ["en_produccion", "esperando_material", "cancelada"],
  en_produccion: ["pausada", "esperando_material", "calidad", "cancelada"],
  pausada: ["en_produccion", "esperando_material", "cancelada"],
  esperando_material: ["liberada", "programada", "en_produccion", "cancelada"],
  calidad: ["terminada", "en_produccion"],
  terminada: ["entregada"],
  entregada: [],
  cancelada: [],
};

export const TERMINAL_PRODUCTION_STATUSES: ProductionStatus[] = [
  "entregada",
  "cancelada",
];

export const ACTIVE_PRODUCTION_STATUSES: ProductionStatus[] = [
  "pendiente",
  "liberada",
  "programada",
  "en_produccion",
  "pausada",
  "esperando_material",
  "calidad",
];

export const CLOSED_PRODUCTION_STATUSES: ProductionStatus[] = [
  "terminada",
  "entregada",
];

export function canTransitionProduction(
  from: ProductionStatus,
  to: ProductionStatus,
): boolean {
  return TRANSITIONS[from].includes(to);
}

export function assertProductionTransition(
  from: ProductionStatus,
  to: ProductionStatus,
) {
  if (!canTransitionProduction(from, to)) {
    throw new Error(
      `No se puede cambiar un número de parte de ${PRODUCTION_STATUS_LABELS[from]} a ${PRODUCTION_STATUS_LABELS[to]}.`,
    );
  }
}

export function canEditProduction(status: ProductionStatus): boolean {
  return status !== "entregada" && status !== "cancelada";
}

export function canAssignProduction(status: ProductionStatus): boolean {
  return (
    status === "liberada" ||
    status === "programada" ||
    status === "en_produccion" ||
    status === "pausada" ||
    status === "esperando_material"
  );
}

export function canLogProductionTime(status: ProductionStatus): boolean {
  return status === "en_produccion" || status === "pausada" || status === "calidad";
}

export function isActiveProductionStatus(status: ProductionStatus): boolean {
  return ACTIVE_PRODUCTION_STATUSES.includes(status);
}

export function requiresDowntimeReason(to: ProductionStatus): boolean {
  return to === "pausada";
}

export function permissionForProductionTransition(
  to: ProductionStatus,
):
  | "production:update"
  | "production:schedule"
  | "production:cancel"
  | "production:close"
  | "quality:release" {
  if (to === "cancelada") return "production:cancel";
  if (to === "programada") return "production:schedule";
  if (to === "terminada") return "quality:release";
  if (to === "entregada") return "production:close";
  return "production:update";
}
