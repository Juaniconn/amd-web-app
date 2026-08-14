import type { QuoteEngineeringStatus } from "@/lib/quotes/rfq";

export const ENGINEERING_STATUSES = [
  "pendiente",
  "asignado",
  "disenando",
  "revision_interna",
  "esperando_cliente",
  "correcciones",
  "aprobado",
  "liberado",
  "cancelado",
] as const;

export type EngineeringStatus = (typeof ENGINEERING_STATUSES)[number];

export const ENGINEERING_STATUS_LABELS: Record<EngineeringStatus, string> = {
  pendiente: "Pendiente",
  asignado: "Asignado",
  disenando: "Diseñando",
  revision_interna: "Revisión interna",
  esperando_cliente: "Esperando cliente",
  correcciones: "Correcciones",
  aprobado: "Aprobado",
  liberado: "Liberado",
  cancelado: "Cancelado",
};

export const ENGINEERING_PRIORITIES = ["baja", "media", "alta"] as const;
export type EngineeringPriority = (typeof ENGINEERING_PRIORITIES)[number];

export const ENGINEERING_PRIORITY_LABELS: Record<EngineeringPriority, string> = {
  baja: "Baja",
  media: "Media",
  alta: "Alta",
};

const TRANSITIONS: Record<EngineeringStatus, EngineeringStatus[]> = {
  pendiente: ["asignado", "cancelado"],
  asignado: ["disenando", "revision_interna", "cancelado"],
  disenando: ["revision_interna", "correcciones", "cancelado"],
  revision_interna: [
    "disenando",
    "correcciones",
    "esperando_cliente",
    "cancelado",
  ],
  esperando_cliente: ["aprobado", "correcciones", "cancelado"],
  correcciones: ["disenando", "cancelado"],
  aprobado: ["liberado", "correcciones", "cancelado"],
  liberado: [],
  cancelado: [],
};

export const TERMINAL_ENGINEERING_STATUSES: EngineeringStatus[] = [
  "liberado",
  "cancelado",
];

export const OPEN_ENGINEERING_STATUSES: EngineeringStatus[] = [
  "pendiente",
  "asignado",
  "disenando",
  "revision_interna",
  "esperando_cliente",
  "correcciones",
];

export function canTransitionEngineering(
  from: EngineeringStatus,
  to: EngineeringStatus,
): boolean {
  return TRANSITIONS[from].includes(to);
}

export function assertEngineeringTransition(
  from: EngineeringStatus,
  to: EngineeringStatus,
) {
  if (!canTransitionEngineering(from, to)) {
    throw new Error(
      `No se puede cambiar una solicitud de ${ENGINEERING_STATUS_LABELS[from]} a ${ENGINEERING_STATUS_LABELS[to]}.`,
    );
  }
}

export function canEditEngineering(status: EngineeringStatus): boolean {
  return status !== "liberado" && status !== "cancelado";
}

export function canAttachEngineeringFiles(status: EngineeringStatus): boolean {
  return canEditEngineering(status);
}

export function canLogEngineeringHours(status: EngineeringStatus): boolean {
  return (
    status !== "pendiente" &&
    status !== "liberado" &&
    status !== "cancelado"
  );
}

export function isOpenEngineeringStatus(status: EngineeringStatus): boolean {
  return OPEN_ENGINEERING_STATUSES.includes(status);
}

export function quoteEngineeringStatusFromRequest(
  status: EngineeringStatus,
): QuoteEngineeringStatus {
  if (status === "pendiente" || status === "cancelado") return "pendiente";
  if (
    status === "asignado" ||
    status === "disenando" ||
    status === "revision_interna" ||
    status === "correcciones"
  ) {
    return "en_proceso";
  }
  if (status === "esperando_cliente") return "esperando_cliente";
  if (status === "aprobado") return "aprobada";
  return "liberada";
}

export function permissionForEngineeringTransition(
  to: EngineeringStatus,
):
  | "engineering:assign"
  | "engineering:update"
  | "engineering:approve"
  | "engineering:release" {
  if (to === "asignado") return "engineering:assign";
  if (to === "liberado") return "engineering:release";
  if (
    to === "esperando_cliente" ||
    to === "aprobado" ||
    to === "correcciones"
  ) {
    return "engineering:approve";
  }
  return "engineering:update";
}
