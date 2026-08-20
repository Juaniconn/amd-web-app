import { describe, expect, it } from "vitest";
import { nextOtNumberForPartida, otNumberForPartida, partIdentity, workOrderNumber } from "./ot-number";

describe("workOrderNumber", () => {
  it("prefixes the commercial order number", () => {
    expect(workOrderNumber("PED-2026-00001")).toBe("OT-PED-2026-00001");
  });
});

describe("partIdentity", () => {
  it("prefers the drawing part number", () => {
    expect(partIdentity("AMD-100", "OT-PED-2026-00001-01")).toBe("AMD-100");
  });

  it("falls back when the drawing number is missing", () => {
    expect(partIdentity(null, "OT-PED-2026-00001-01")).toBe("OT-PED-2026-00001-01");
    expect(partIdentity("  ", "OT-PED-2026-00001-01")).toBe("OT-PED-2026-00001-01");
  });
});

describe("otNumberForPartida", () => {
  it("uses the order number and padded partida", () => {
    expect(otNumberForPartida("AMD-2026-00001", 1)).toBe("OT-AMD-2026-00001-01");
    expect(otNumberForPartida("AMD-2026-00001", 12)).toBe("OT-AMD-2026-00001-12");
  });

  it("adds a revision suffix when the base OT already exists", () => {
    expect(nextOtNumberForPartida("AMD-2026-00001", 1, ["OT-AMD-2026-00001-01"])).toBe(
      "OT-AMD-2026-00001-01-R2",
    );
    expect(
      nextOtNumberForPartida("AMD-2026-00001", 1, [
        "OT-AMD-2026-00001-01",
        "OT-AMD-2026-00001-01-R2",
      ]),
    ).toBe("OT-AMD-2026-00001-01-R3");
  });
});
