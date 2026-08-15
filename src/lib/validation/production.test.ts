import { describe, expect, it } from "vitest";
import {
  createProductionOrderSchema,
  machineSchema,
} from "./production";

describe("production validation", () => {
  it("defaults priority to producción normal", () => {
    const result = createProductionOrderSchema.safeParse({
      orderId: "demo-quote-005-order",
      orderItemId: "demo-item-001",
      description: "Fabricar eje torneado",
      quantity: 10,
      promisedDate: "2026-08-20",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.priority).toBe("produccion_normal");
    }
  });

  it("requires a manufacturing line item for each OT", () => {
    const result = createProductionOrderSchema.safeParse({
      orderId: "demo-quote-005-order",
      description: "Fabricar eje torneado",
      quantity: 10,
      promisedDate: "2026-08-20",
    });
    expect(result.success).toBe(false);
  });

  it("requires promised date and description", () => {
    const result = createProductionOrderSchema.safeParse({
      orderId: "demo-quote-005-order",
      description: "ab",
      quantity: 1,
    });
    expect(result.success).toBe(false);
  });

  it("requires a work center on machines", () => {
    const result = machineSchema.safeParse({
      name: "VMC #6",
      hoursPerShift: 8,
    });
    expect(result.success).toBe(false);
  });
});
