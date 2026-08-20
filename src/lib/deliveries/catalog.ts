export const DELIVERY_STATUSES = [
  "pendiente",
  "preparando",
  "enviado",
  "entregado",
  "incidencia",
] as const;
export type DeliveryStatus = (typeof DELIVERY_STATUSES)[number];

export const DELIVERY_STATUS_LABELS: Record<DeliveryStatus, string> = {
  pendiente: "Pendiente",
  preparando: "Preparando",
  enviado: "Enviado",
  entregado: "Entregado",
  incidencia: "Incidencia",
};

const TRANSITIONS: Record<DeliveryStatus, DeliveryStatus[]> = {
  pendiente: ["preparando", "incidencia"],
  preparando: ["enviado", "incidencia"],
  enviado: ["entregado", "incidencia"],
  entregado: [],
  incidencia: ["preparando", "enviado"],
};

export function canTransitionDelivery(from: DeliveryStatus, to: DeliveryStatus) {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

export function canEditDelivery(status: DeliveryStatus) {
  return status === "pendiente" || status === "preparando";
}
