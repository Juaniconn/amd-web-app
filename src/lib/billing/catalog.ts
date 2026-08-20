export const INVOICE_STATUSES = [
  "borrador",
  "emitida",
  "parcial",
  "pagada",
  "cancelada",
] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  borrador: "Borrador",
  emitida: "Enviada al cliente",
  parcial: "Pago parcial",
  pagada: "Terminada",
  cancelada: "Cancelada",
};

export const PAYMENT_METHODS = [
  "transferencia",
  "cheque",
  "efectivo",
  "otro",
] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  transferencia: "Transferencia",
  cheque: "Cheque",
  efectivo: "Efectivo",
  otro: "Otro",
};

export function invoiceStatusFromPaid(paid: number, total: number): InvoiceStatus {
  if (total <= 0) return paid > 0 ? "pagada" : "emitida";
  if (paid <= 0) return "emitida";
  if (paid + 0.009 >= total) return "pagada";
  return "parcial";
}

export function canRegisterPayment(status: InvoiceStatus) {
  return status === "emitida" || status === "parcial";
}

export function canIssueInvoice(status: InvoiceStatus) {
  return status === "borrador";
}
