import { describe, expect, it } from "vitest";
import {
  adjustStockSchema,
  createMaterialSchema,
  issueStockSchema,
} from "./inventory";

describe("inventory validation", () => {
  it("requires a description and unit to create a material", () => {
    const result = createMaterialSchema.safeParse({
      description: "Placa 6061",
      category: "materia_prima",
      unitId: "uom-kg",
      isCritical: false,
      active: true,
    });
    expect(result.success).toBe(true);
  });

  it("requires a reason for adjustments and issues", () => {
    expect(
      adjustStockSchema.safeParse({
        materialId: "m1",
        quantity: "1",
        direction: "out",
        reason: "ab",
      }).success,
    ).toBe(false);
    expect(
      issueStockSchema.safeParse({
        materialId: "m1",
        quantity: "1",
        reason: "Entrega a piso CNC",
      }).success,
    ).toBe(true);
  });
});
