import { describe, expect, it } from "vitest";
import {
  nextPartNumberFolio,
  partIdentity,
  partNumberFolio,
  workOrderNumber,
} from "./ot-number";

describe("workOrderNumber", () => {
  it("prefija el número de la OT comercial", () => {
    // La OT sí lleva prefijo OT-: es la orden de trabajo (tabla orders).
    expect(workOrderNumber("PED-2026-00001")).toBe("OT-PED-2026-00001");
  });
});

describe("partIdentity", () => {
  it("prefiere el número de parte del plano", () => {
    expect(partIdentity("AMD-100", "NP-PED-2026-00001-01")).toBe("AMD-100");
  });

  it("usa el folio cuando no hay número de plano", () => {
    expect(partIdentity(null, "NP-PED-2026-00001-01")).toBe("NP-PED-2026-00001-01");
    expect(partIdentity("  ", "NP-PED-2026-00001-01")).toBe("NP-PED-2026-00001-01");
  });
});

describe("partNumberFolio", () => {
  it("usa prefijo NP- con el número de OT y la partida", () => {
    // ADR-062: el número de parte en producción NO usa OT-, para no nombrar
    // dos entidades distintas con el mismo término.
    expect(partNumberFolio("AMD-2026-00001", 1)).toBe("NP-AMD-2026-00001-01");
    expect(partNumberFolio("AMD-2026-00001", 12)).toBe("NP-AMD-2026-00001-12");
  });

  it("conserva el número de la OT dentro del folio", () => {
    expect(partNumberFolio("AMD-2026-00001", 3)).toContain("AMD-2026-00001");
  });

  it("agrega sufijo de revisión cuando el folio base ya existe", () => {
    expect(nextPartNumberFolio("AMD-2026-00001", 1, ["NP-AMD-2026-00001-01"])).toBe(
      "NP-AMD-2026-00001-01-R2",
    );
    expect(
      nextPartNumberFolio("AMD-2026-00001", 1, [
        "NP-AMD-2026-00001-01",
        "NP-AMD-2026-00001-01-R2",
      ]),
    ).toBe("NP-AMD-2026-00001-01-R3");
  });
});
