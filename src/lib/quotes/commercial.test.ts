import { describe, expect, it } from "vitest";
import {
  defaultTaxPercent,
  isAllowedTaxPercent,
  resolveAddressee,
} from "./commercial";

describe("quote commercial", () => {
  it("allows only 0, 8 and 16 IVA", () => {
    expect(isAllowedTaxPercent(0)).toBe(true);
    expect(isAllowedTaxPercent(8)).toBe(true);
    expect(isAllowedTaxPercent(16)).toBe(true);
    expect(isAllowedTaxPercent(4)).toBe(false);
  });

  it("defaults USD to 0 and MXN to 16", () => {
    expect(defaultTaxPercent("usd")).toBe(0);
    expect(defaultTaxPercent("mxn")).toBe(16);
  });

  it("resolves department addressee from department then title", () => {
    expect(
      resolveAddressee({
        mode: "departamento",
        name: "Ana Pérez",
        department: "Compras",
        title: "Buyer",
        phone: "6561110000",
      }).line,
    ).toBe("Compras");
    expect(
      resolveAddressee({
        mode: "departamento",
        name: "Ana Pérez",
        department: "",
        title: "Ingeniería",
        phone: null,
      }).line,
    ).toBe("Ingeniería");
  });

  it("resolves person addressee from name", () => {
    const result = resolveAddressee({
      mode: "nombre",
      name: "Ana Pérez",
      department: "Compras",
      title: "Buyer",
      phone: "656",
    });
    expect(result.line).toBe("Ana Pérez");
    expect(result.phone).toBe("656");
  });
});
