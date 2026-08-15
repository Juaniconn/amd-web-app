export const ORDER_STATUSES = [
  "borrador",
  "pendiente",
  "aprobado",
  "en_produccion",
  "completado",
  "cancelado",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  borrador: "Borrador",
  pendiente: "Pendiente",
  aprobado: "Aprobado",
  en_produccion: "En producción",
  completado: "Completado",
  cancelado: "Cancelado",
};

const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  borrador: ["pendiente", "cancelado"],
  pendiente: ["borrador", "aprobado", "cancelado"],
  aprobado: ["en_produccion", "cancelado"],
  en_produccion: ["completado", "cancelado"],
  completado: [],
  cancelado: [],
};

export const ACTIVE_ORDER_STATUSES: OrderStatus[] = [
  "borrador",
  "pendiente",
  "aprobado",
  "en_produccion",
];

export const OT_ELIGIBLE_ORDER_STATUSES: OrderStatus[] = [
  "aprobado",
  "en_produccion",
];

export const TERMINAL_ORDER_STATUSES: OrderStatus[] = [
  "completado",
  "cancelado",
];

export function canTransitionOrder(from: OrderStatus, to: OrderStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

export function assertOrderTransition(from: OrderStatus, to: OrderStatus) {
  if (!canTransitionOrder(from, to)) {
    throw new Error(
      `No se puede cambiar un pedido de ${ORDER_STATUS_LABELS[from]} a ${ORDER_STATUS_LABELS[to]}.`,
    );
  }
}

export function canEditOrder(status: OrderStatus): boolean {
  return status !== "completado" && status !== "cancelado";
}

export function canIssueOtFromOrderStatus(status: OrderStatus): boolean {
  return OT_ELIGIBLE_ORDER_STATUSES.includes(status);
}

export function isActiveOrderStatus(status: OrderStatus): boolean {
  return ACTIVE_ORDER_STATUSES.includes(status);
}

export function permissionForOrderTransition(
  to: OrderStatus,
): "orders:update" | "orders:approve" | "orders:cancel" {
  if (to === "aprobado") return "orders:approve";
  if (to === "cancelado") return "orders:cancel";
  return "orders:update";
}

export const ORDER_ORIGIN_LABELS = {
  rfq_directa: "RFQ directa",
  rfq_ingenieria: "RFQ + Ingeniería",
} as const;
