export function calculateOrderProgress(doneParts: number, totalParts: number): number {
  if (totalParts === 0) return 0;
  return Math.round((doneParts / totalParts) * 100);
}

export function formatMachineStatus(status: string): string {
  const labels: Record<string, string> = {
    disponible: "Disponible",
    en_produccion: "En Producción",
    ocupada: "Ocupada",
    mantenimiento: "Mantenimiento",
    fuera_de_servicio: "Fuera de Servicio",
  };
  return labels[status] ?? status;
}

export function formatMaterialAlert(input: {
  materialName: string;
  code: string;
  currentStock: number;
  minStock: number;
}): { title: string; description: string; tone: "urgent" | "warning" | "info" } {
  const ratio = input.minStock > 0 ? input.currentStock / input.minStock : 0;
  const tone: "urgent" | "warning" | "info" = ratio === 0 ? "urgent" : ratio < 0.5 ? "urgent" : "warning";
  return {
    title: `${input.materialName} bajo mínimo`,
    description: `Stock actual: ${input.currentStock} · Mínimo: ${input.minStock} (${input.code})`,
    tone,
  };
}

export function calculateActiveOperators(
  operators: { id: string; name: string; activeOperations: number }[],
): number {
  return operators.filter((op) => op.activeOperations > 0).length;
}

export function sortOrdersByPriority<T extends { isDelayed: boolean; promisedDate: string }>(
  orders: T[],
): T[] {
  return [...orders].sort((a, b) => {
    if (a.isDelayed && !b.isDelayed) return -1;
    if (!a.isDelayed && b.isDelayed) return 1;
    return new Date(a.promisedDate).getTime() - new Date(b.promisedDate).getTime();
  });
}