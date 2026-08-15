import { describe, expect, it } from "vitest";
import { isManufacturingItem } from "./items";

describe("quote item kinds", () => {
  it("treats engineering service lines as non-manufacturing", () => {
    expect(isManufacturingItem("servicio_ingenieria")).toBe(false);
    expect(isManufacturingItem("pieza")).toBe(true);
    expect(isManufacturingItem(undefined)).toBe(true);
  });
});
