import { describe, expect, it } from "vitest";
import { canCreateProductionOrder } from "./gates";

describe("production create gates", () => {
  it("blocks design-only RFQs", () => {
    const result = canCreateProductionOrder({
      origin: "rfq_ingenieria",
      rfqType: "diseno_solamente",
      engineeringStatus: "liberado",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("DESIGN_ONLY_NO_OP");
  });

  it("requires released engineering when origin is rfq_ingenieria", () => {
    const blocked = canCreateProductionOrder({
      origin: "rfq_ingenieria",
      rfqType: "diseno_fabricacion",
      engineeringStatus: "aprobado",
    });
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) expect(blocked.code).toBe("ENGINEERING_NOT_RELEASED");

    const allowed = canCreateProductionOrder({
      origin: "rfq_ingenieria",
      rfqType: "diseno_fabricacion",
      engineeringStatus: "liberado",
    });
    expect(allowed.ok).toBe(true);
  });

  it("allows rfq_directa without engineering", () => {
    const result = canCreateProductionOrder({
      origin: "rfq_directa",
      rfqType: "solo_fabricacion",
      engineeringStatus: null,
    });
    expect(result.ok).toBe(true);
  });
});
