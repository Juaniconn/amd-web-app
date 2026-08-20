export {
  MACHINE_KINDS,
  MACHINE_KIND_LABELS,
  type MachineKind,
} from "@/lib/production/catalog";

export const SUPPLIER_CLASSIFICATIONS = [
  "mejor_tiempo",
  "mejor_proveedor",
  "mejor_costo",
  "calidad_mill",
  "backup_us",
] as const;
export type SupplierClassification = (typeof SUPPLIER_CLASSIFICATIONS)[number];

export const SUPPLIER_CLASSIFICATION_LABELS: Record<SupplierClassification, string> = {
  mejor_tiempo: "Mejor tiempo",
  mejor_proveedor: "Mejor proveedor",
  mejor_costo: "Mejor costo potencial",
  calidad_mill: "Calidad mill",
  backup_us: "Respaldo US",
};

export function supplierClassificationLabel(value: string | null | undefined) {
  if (!value) return null;
  if (value in SUPPLIER_CLASSIFICATION_LABELS) {
    return SUPPLIER_CLASSIFICATION_LABELS[value as SupplierClassification];
  }
  return value;
}

export type QuoteCostingCatalog = {
  materialId?: string | null;
  materialCode?: string | null;
  materialLabel?: string | null;
  costPerKg?: number | null;
  supplierId?: string | null;
  supplierName?: string | null;
  laserMachineId?: string | null;
  laserName?: string | null;
  laserHourly?: number | null;
  pressBrakeId?: string | null;
  pressName?: string | null;
  pressHourly?: number | null;
};
