export const QUOTE_ITEM_KINDS = ["pieza", "servicio_ingenieria"] as const;

export type QuoteItemKind = (typeof QUOTE_ITEM_KINDS)[number];

export const QUOTE_ITEM_KIND_LABELS: Record<QuoteItemKind, string> = {
  pieza: "Pieza",
  servicio_ingenieria: "Servicio de ingeniería",
};

export const ENGINEERING_SERVICE_DESCRIPTION = "Servicio de ingeniería";
export const ENGINEERING_SERVICE_UNIT = "serv";

export function isManufacturingItem(kind: string | null | undefined): boolean {
  return kind !== "servicio_ingenieria";
}
