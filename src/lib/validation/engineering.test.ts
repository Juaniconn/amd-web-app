import { describe, expect, it } from "vitest";
import { createEngineeringRequestSchema } from "./engineering";

describe("engineering validation", () => {
  it("accepts a valid request", () => {
    const result = createEngineeringRequestSchema.safeParse({
      quoteId: "demo-quote-001",
      description: "Diseño de placa CNC",
      projectType: "diseno_nuevo",
      priority: "alta",
    });
    expect(result.success).toBe(true);
  });

  it("requires a description", () => {
    const result = createEngineeringRequestSchema.safeParse({
      quoteId: "demo-quote-001",
      description: "ab",
      projectType: "diseno_nuevo",
    });
    expect(result.success).toBe(false);
  });
});
