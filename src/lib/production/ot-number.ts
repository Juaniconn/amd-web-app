export function workOrderNumber(orderNumber: string) {
  return `OT-${orderNumber}`;
}

export function partIdentity(partNumber: string | null | undefined, fallback: string) {
  const value = partNumber?.trim();
  return value ? value : fallback;
}

export function otNumberForPartida(orderNumber: string, position: number) {
  return `OT-${orderNumber}-${String(position).padStart(2, "0")}`;
}

export function nextOtNumberForPartida(
  orderNumber: string,
  position: number,
  existingNumbers: string[],
) {
  const base = otNumberForPartida(orderNumber, position);
  const taken = new Set(existingNumbers);
  if (!taken.has(base)) return base;
  let revision = 2;
  while (taken.has(`${base}-R${revision}`)) {
    revision += 1;
  }
  return `${base}-R${revision}`;
}
