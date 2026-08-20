export const SUPPLIER_STATUSES = ["activo", "inactivo"] as const;
export type SupplierStatus = (typeof SUPPLIER_STATUSES)[number];

export const SUPPLIER_STATUS_LABELS: Record<SupplierStatus, string> = {
  activo: "Activo",
  inactivo: "Inactivo",
};

export const PURCHASE_REQUEST_STATUSES = [
  "borrador",
  "solicitada",
  "convertida",
  "cancelada",
] as const;
export type PurchaseRequestStatus = (typeof PURCHASE_REQUEST_STATUSES)[number];

export const PURCHASE_REQUEST_STATUS_LABELS: Record<PurchaseRequestStatus, string> = {
  borrador: "Borrador",
  solicitada: "Solicitada",
  convertida: "Convertida a OC",
  cancelada: "Cancelada",
};

export function canConvertPurchaseRequest(status: PurchaseRequestStatus) {
  return status === "borrador" || status === "solicitada";
}

export const PURCHASE_ORDER_STATUSES = [
  "borrador",
  "enviada",
  "confirmada",
  "parcial",
  "recibida",
  "cerrada",
  "cancelada",
] as const;
export type PurchaseOrderStatus = (typeof PURCHASE_ORDER_STATUSES)[number];

export const PURCHASE_ORDER_STATUS_LABELS: Record<PurchaseOrderStatus, string> = {
  borrador: "Borrador",
  enviada: "Enviada",
  confirmada: "Confirmada",
  parcial: "Recepción parcial",
  recibida: "Recibida",
  cerrada: "Cerrada",
  cancelada: "Cancelada",
};

const PO_TRANSITIONS: Record<PurchaseOrderStatus, PurchaseOrderStatus[]> = {
  borrador: ["enviada", "cancelada"],
  enviada: ["confirmada", "cancelada"],
  confirmada: ["parcial", "recibida", "cancelada"],
  parcial: ["recibida", "cancelada"],
  recibida: ["cerrada"],
  cerrada: [],
  cancelada: [],
};

export function canTransitionPurchaseOrder(
  from: PurchaseOrderStatus,
  to: PurchaseOrderStatus,
) {
  return PO_TRANSITIONS[from]?.includes(to) ?? false;
}

export function canReceivePurchaseOrder(status: PurchaseOrderStatus) {
  return status === "enviada" || status === "confirmada" || status === "parcial";
}

export function canEditPurchaseOrder(status: PurchaseOrderStatus) {
  return status === "borrador";
}
