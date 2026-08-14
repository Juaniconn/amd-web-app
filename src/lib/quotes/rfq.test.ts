import { describe, expect, it } from "vitest";
import {
  defaultEngineeringType,
  resolveQuoteEngineeringFields,
  rfqTypeForcesEngineering,
} from "./rfq";

describe("RFQ engineering fields", () => {
  it("forces engineering for design RFQ types", () => {
    expect(rfqTypeForcesEngineering("solo_fabricacion")).toBe(false);
    expect(rfqTypeForcesEngineering("diseno_fabricacion")).toBe(true);
    expect(rfqTypeForcesEngineering("diseno_solamente")).toBe(true);
    expect(rfqTypeForcesEngineering("reverse_engineering")).toBe(true);
  });

  it("defaults reverse engineering type from RFQ type", () => {
    expect(defaultEngineeringType("reverse_engineering")).toBe(
      "reverse_engineering",
    );
    expect(defaultEngineeringType("diseno_fabricacion")).toBe("diseno_nuevo");
    expect(defaultEngineeringType("solo_fabricacion")).toBe(null);
  });

  it("allows optional engineering on fabrication-only RFQs", () => {
    const optional = resolveQuoteEngineeringFields({
      rfqType: "solo_fabricacion",
      requiresEngineering: true,
      engineeringType: "manufacturabilidad",
    });
    expect(optional.requiresEngineering).toBe(true);
    expect(optional.engineeringType).toBe("manufacturabilidad");
  });

  it("clears engineering type when not required", () => {
    const none = resolveQuoteEngineeringFields({
      rfqType: "solo_fabricacion",
      requiresEngineering: false,
      engineeringType: "diseno_nuevo",
    });
    expect(none.requiresEngineering).toBe(false);
    expect(none.engineeringType).toBe(null);
  });
});
