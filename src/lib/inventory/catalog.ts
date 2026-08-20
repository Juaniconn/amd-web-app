export const MATERIAL_CATEGORIES = [
  "materia_prima",
  "consumibles",
  "herramientas",
  "producto_terminado",
] as const;

export type MaterialCategory = (typeof MATERIAL_CATEGORIES)[number];

export const MATERIAL_CATEGORY_LABELS: Record<MaterialCategory, string> = {
  materia_prima: "Materia Prima",
  consumibles: "Consumibles",
  herramientas: "Herramientas",
  producto_terminado: "Producto Terminado",
};

export const INVENTORY_MOVEMENT_TYPES = [
  "entrada",
  "salida",
  "ajuste",
  "reserva",
  "liberacion",
  "consumo",
] as const;

export type InventoryMovementType = (typeof INVENTORY_MOVEMENT_TYPES)[number];

export const INVENTORY_MOVEMENT_TYPE_LABELS: Record<
  InventoryMovementType,
  string
> = {
  entrada: "Entrada",
  salida: "Salida",
  ajuste: "Ajuste",
  reserva: "Reserva",
  liberacion: "Liberación",
  consumo: "Consumo",
};

export const OFFICIAL_WAREHOUSE_SEEDS = [
  {
    id: "wh-mp",
    code: "mp",
    name: "Materia Prima",
    description: "Material que se transforma en la pieza.",
    sortOrder: 10,
  },
  {
    id: "wh-cons",
    code: "cons",
    name: "Consumibles",
    description: "Insumos que no son la pieza.",
    sortOrder: 20,
  },
  {
    id: "wh-herr",
    code: "herr",
    name: "Herramientas",
    description: "Herramental de piso por cantidad. Sin préstamos.",
    sortOrder: 30,
  },
  {
    id: "wh-pt",
    code: "pt",
    name: "Producto Terminado",
    description: "Piezas tras cierre físico. Salida en Entregas.",
    sortOrder: 40,
  },
] as const;

export const DEFAULT_WAREHOUSE_BY_CATEGORY: Record<MaterialCategory, string> = {
  materia_prima: "wh-mp",
  consumibles: "wh-cons",
  herramientas: "wh-herr",
  producto_terminado: "wh-pt",
};

export const OFFICIAL_UOM_SEEDS = [
  { id: "uom-pza", code: "pza", name: "Pieza", integerOnly: true, sortOrder: 10 },
  { id: "uom-kg", code: "kg", name: "Kg", integerOnly: false, sortOrder: 20 },
  { id: "uom-m", code: "m", name: "Metro", integerOnly: false, sortOrder: 30 },
  { id: "uom-l", code: "l", name: "Litro", integerOnly: false, sortOrder: 40 },
  { id: "uom-hoja", code: "hoja", name: "Hoja", integerOnly: true, sortOrder: 50 },
  {
    id: "uom-barra",
    code: "barra",
    name: "Barra",
    integerOnly: true,
    sortOrder: 60,
  },
] as const;

const SCALE = 10000;

export function parseQty(value: string | number): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) {
    throw new Error("La cantidad no es un número válido.");
  }
  return Math.round(n * SCALE) / SCALE;
}

export function formatQty(value: string | number): string {
  return parseQty(value).toFixed(4);
}

export function addQty(a: string | number, b: string | number): string {
  return formatQty(parseQty(a) + parseQty(b));
}

export function subQty(a: string | number, b: string | number): string {
  return formatQty(parseQty(a) - parseQty(b));
}

export function minQty(a: string | number, b: string | number): string {
  return formatQty(Math.min(parseQty(a), parseQty(b)));
}

export function qtyGt(a: string | number, b: string | number): boolean {
  return parseQty(a) > parseQty(b);
}

export function qtyGte(a: string | number, b: string | number): boolean {
  return parseQty(a) >= parseQty(b);
}

export function qtyEq(a: string | number, b: string | number): boolean {
  return parseQty(a) === parseQty(b);
}

export function availableQty(onHand: string | number, reserved: string | number) {
  return subQty(onHand, reserved);
}

export function displayQty(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "";
  const n = parseQty(value);
  if (Number.isInteger(n)) return String(n);
  return n.toFixed(4).replace(/0+$/, "").replace(/\.$/, "");
}

export function inputQty(value: string | number | null | undefined): string {
  const shown = displayQty(value);
  return shown || "0";
}
