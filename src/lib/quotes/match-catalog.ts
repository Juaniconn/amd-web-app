import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { materials, suppliers } from "@/db/schema";
import { piecesFromSheet } from "@/lib/quotes/nest";

export { piecesFromSheet };

export type CatalogMatch = {
  materialId: string;
  materialCode: string;
  materialDescription: string;
  supplierId: string | null;
  supplierName: string | null;
  grade: string | null;
  thicknessIn: number | null;
  costPerKg: number | null;
  densityGCm3: number | null;
  sheetWidthIn: number | null;
  sheetLengthIn: number | null;
  piecesPerStock: number | null;
};

function num(value: string | number | null | undefined) {
  if (value == null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function tokens(value: string | null | undefined) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, " ")
    .split(/\s+/)
    .filter((token) => token.length >= 2);
}

function scoreMatch(
  haystack: string,
  needle: string,
  thicknessIn: number | null,
  candidateThickness: number | null,
) {
  const hay = tokens(haystack);
  const need = tokens(needle);
  let score = 0;
  if (need.length === 0) {
    if (
      thicknessIn != null &&
      candidateThickness != null &&
      Math.abs(thicknessIn - candidateThickness) <= 0.02
    ) {
      return 0.5;
    }
    return 0;
  }
  let hits = 0;
  for (const token of need) {
    if (hay.some((part) => part.includes(token) || token.includes(part))) hits += 1;
  }
  score = hits / need.length;
  if (
    thicknessIn != null &&
    candidateThickness != null &&
    Math.abs(thicknessIn - candidateThickness) <= 0.02
  ) {
    score += 0.35;
  }
  return score;
}

export async function matchMaterialFromDrawing(input: {
  materialText?: string | null;
  thicknessIn?: number | null;
  blankWidthIn?: number | null;
  blankLengthIn?: number | null;
}): Promise<CatalogMatch | null> {
  const rows = await db
    .select({
      id: materials.id,
      code: materials.code,
      description: materials.description,
      grade: materials.grade,
      thicknessIn: materials.thicknessIn,
      costPerKg: materials.costPerKg,
      densityGCm3: materials.densityGCm3,
      sheetWidthIn: materials.sheetWidthIn,
      sheetLengthIn: materials.sheetLengthIn,
      supplierId: materials.supplierId,
      supplierName: suppliers.legalName,
    })
    .from(materials)
    .leftJoin(suppliers, eq(suppliers.id, materials.supplierId))
    .where(and(eq(materials.active, true), eq(materials.category, "materia_prima")));

  const needle = input.materialText ?? "";
  const thickness = input.thicknessIn ?? null;
  let best: { row: (typeof rows)[number]; score: number } | null = null;
  for (const row of rows) {
    const haystack = `${row.code} ${row.description} ${row.grade ?? ""}`;
    const score = scoreMatch(haystack, needle, thickness, num(row.thicknessIn));
    if (!best || score > best.score) best = { row, score };
  }
  if (!best || best.score < 0.25) {
    const withSheet = rows.find((row) => num(row.sheetWidthIn) && num(row.costPerKg));
    if (!withSheet) return null;
    best = { row: withSheet, score: 0 };
  }

  const row = best.row;
  return {
    materialId: row.id,
    materialCode: row.code,
    materialDescription: row.description,
    supplierId: row.supplierId,
    supplierName: row.supplierName,
    grade: row.grade,
    thicknessIn: num(row.thicknessIn),
    costPerKg: num(row.costPerKg),
    densityGCm3: num(row.densityGCm3),
    sheetWidthIn: num(row.sheetWidthIn),
    sheetLengthIn: num(row.sheetLengthIn),
    piecesPerStock: piecesFromSheet({
      blankWidthIn: input.blankWidthIn,
      blankLengthIn: input.blankLengthIn,
      sheetWidthIn: num(row.sheetWidthIn),
      sheetLengthIn: num(row.sheetLengthIn),
    }),
  };
}
