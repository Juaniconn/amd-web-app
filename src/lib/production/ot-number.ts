export function workOrderNumber(orderNumber: string) {
  return `OT-${orderNumber}`;
}

export function partIdentity(partNumber: string | null | undefined, fallback: string) {
  const value = partNumber?.trim();
  return value ? value : fallback;
}

/**
 * Folio del número de parte en producción.
 *
 * Nomenclatura oficial (ADR-062): el prefijo es `NP-` (Número de Parte), no
 * `OT-`. La OT es la orden de trabajo comercial (`orders`, `AMD-YYYY-NNNNN`);
 * cada número de parte de esa OT es un registro de piso distinto. Usar `OT-`
 * en ambos niveles hacía que el mismo término nombrara dos entidades.
 *
 *   OT   (orders)             AMD-2026-00001
 *   NP   (production_orders)  NP-AMD-2026-00001-01
 *
 * El folio conserva el número de la OT para no perder trazabilidad.
 */
export function partNumberFolio(orderNumber: string, position: number) {
  return `NP-${orderNumber}-${String(position).padStart(2, "0")}`;
}

export function nextPartNumberFolio(
  orderNumber: string,
  position: number,
  existingNumbers: string[],
) {
  const base = partNumberFolio(orderNumber, position);
  const taken = new Set(existingNumbers);
  if (!taken.has(base)) return base;
  let revision = 2;
  while (taken.has(`${base}-R${revision}`)) {
    revision += 1;
  }
  return `${base}-R${revision}`;
}

/**
 * Alias de compatibilidad. Los folios históricos con prefijo `OT-` y `OP-`
 * se conservan en la base; solo los nuevos usan `NP-`.
 * @deprecated usar `partNumberFolio`
 */
export const otNumberForPartida = partNumberFolio;

/** @deprecated usar `nextPartNumberFolio` */
export const nextOtNumberForPartida = nextPartNumberFolio;
