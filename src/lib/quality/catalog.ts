export const INSPECTION_TYPES = ["primera_pieza", "en_proceso", "final"] as const;
export type InspectionType = (typeof INSPECTION_TYPES)[number];

export const INSPECTION_TYPE_LABELS: Record<InspectionType, string> = {
  primera_pieza: "Primera pieza",
  en_proceso: "En proceso",
  final: "Final",
};

export const INSPECTION_RESULTS = [
  "pendiente",
  "aprobado",
  "aprobado_observaciones",
  "rechazado",
] as const;
export type InspectionResult = (typeof INSPECTION_RESULTS)[number];

export const INSPECTION_RESULT_LABELS: Record<InspectionResult, string> = {
  pendiente: "Borrador",
  aprobado: "Aprobado",
  aprobado_observaciones: "Aprobado con observaciones",
  rechazado: "Rechazado",
};

export const NCR_STATUSES = [
  "abierta",
  "en_analisis",
  "retrabajo",
  "cerrada",
  "cancelada",
] as const;
export type NcrStatus = (typeof NCR_STATUSES)[number];

export const NCR_STATUS_LABELS: Record<NcrStatus, string> = {
  abierta: "Abierta",
  en_analisis: "En análisis",
  retrabajo: "Retrabajo",
  cerrada: "Cerrada",
  cancelada: "Cancelada",
};

const NCR_TRANSITIONS: Record<NcrStatus, NcrStatus[]> = {
  abierta: ["en_analisis", "retrabajo", "cerrada", "cancelada"],
  en_analisis: ["retrabajo", "cerrada", "cancelada"],
  retrabajo: ["cerrada", "cancelada"],
  cerrada: [],
  cancelada: [],
};

export function canTransitionNcr(from: NcrStatus, to: NcrStatus) {
  return NCR_TRANSITIONS[from]?.includes(to) ?? false;
}
