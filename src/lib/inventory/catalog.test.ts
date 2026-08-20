import { describe, expect, it } from "vitest";
import {
  addQty,
  availableQty,
  displayQty,
  formatQty,
  minQty,
  parseQty,
  qtyGt,
  subQty,
} from "./catalog";

describe("inventory quantities", () => {
  it("computes disponible as existencia minus reservado", () => {
    expect(availableQty("20", "8")).toBe("12.0000");
  });

  it("never lets min pick a negative leftover", () => {
    expect(minQty("5", "12")).toBe("5.0000");
  });

  it("adds and subtracts at 4 decimal places", () => {
    expect(addQty("1.1", "2.2")).toBe("3.3000");
    expect(subQty("10", "2.5")).toBe("7.5000");
  });

  it("rejects non numeric input", () => {
    expect(() => parseQty("abc")).toThrow();
  });

  it("formats display without trailing zeros", () => {
    expect(displayQty("12.0000")).toBe("12");
    expect(displayQty("24.0000")).toBe("24");
    expect(displayQty(formatQty("1.5"))).toBe("1.5");
    expect(displayQty(null)).toBe("");
  });

  it("compares shortage the way BUSINESS_SPEC §22 describes", () => {
    const required = "20";
    const disponible = "12";
    expect(qtyGt(required, disponible)).toBe(true);
    expect(subQty(required, disponible)).toBe("8.0000");
  });
});
