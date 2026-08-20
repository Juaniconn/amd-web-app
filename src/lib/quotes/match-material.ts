export type SheetMaterialMatch = {
  id: string;
  code: string;
  description: string;
  grade: string | null;
  thicknessIn: number | null;
  costPerKg: number | null;
  supplierId: string | null;
  supplierName: string | null;
};

export function matchSheetMaterial(
  materialText: string | null | undefined,
  thicknessIn: number | null | undefined,
  catalog: SheetMaterialMatch[],
): SheetMaterialMatch | null {
  if (catalog.length === 0) return null;
  const needle = String(materialText || "").toUpperCase();
  const thickness = thicknessIn == null ? null : Number(thicknessIn);

  const gradeHits = catalog.filter((row) => {
    const grade = (row.grade || "").toUpperCase();
    if (!grade) return false;
    if (!needle) return true;
    return needle.includes(grade) || grade.includes(needle);
  });
  const pool = gradeHits.length > 0 ? gradeHits : catalog;

  if (thickness != null && Number.isFinite(thickness)) {
    const withThickness = pool
      .filter((row) => row.thicknessIn != null)
      .map((row) => ({ row, delta: Math.abs(Number(row.thicknessIn) - thickness) }))
      .sort((a, b) => a.delta - b.delta);
    if (withThickness[0] && withThickness[0].delta <= 0.005) {
      return withThickness[0].row;
    }
  }

  return pool[0] ?? catalog[0] ?? null;
}
