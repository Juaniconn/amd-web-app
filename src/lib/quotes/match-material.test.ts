import { describe, expect, it } from "vitest";
import { matchSheetMaterial } from "./match-material";
import { priceQuoteItem } from "./costing";

const catalog = [
  {
    id: "a36-120",
    code: "MAT-A36-0120",
    description: "A36 0.120",
    grade: "A36",
    thicknessIn: 0.12,
    costPerKg: 38,
    supplierId: "kalisch",
    supplierName: "Kalisch",
  },
  {
    id: "304-120",
    code: "MAT-304-0120",
    description: "304 0.120",
    grade: "304",
    thicknessIn: 0.12,
    costPerKg: 95,
    supplierId: "kloeckner",
    supplierName: "Kloeckner",
  },
];

describe("calculator ERP catalogs", () => {
  it("matches A36 0.120 from drawing text", () => {
    const hit = matchSheetMaterial("ASTM A36 HRPO", 0.12, catalog);
    expect(hit?.id).toBe("a36-120");
  });

  it("uses the catalog kg cost instead of the A36 fallback", () => {
    const a36 = priceQuoteItem({
      quantity: 1,
      unit_weight_lb: 2.20462,
      scrap_weight_lb: 0,
      cost_per_kg: 38,
    });
    const ss = priceQuoteItem({
      quantity: 1,
      unit_weight_lb: 2.20462,
      scrap_weight_lb: 0,
      cost_per_kg: 95,
    });
    expect(ss.material_cost).toBeGreaterThan(a36.material_cost);
    expect(ss.material_cost).toBeCloseTo(95, 0);
  });
});
