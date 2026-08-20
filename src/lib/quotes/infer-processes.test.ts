import { describe, expect, it } from "vitest";
import { inferQuoteProcesses } from "./infer-processes";
import { piecesFromSheet } from "./nest";

describe("inferQuoteProcesses", () => {
  it("builds laser, bend, weld and inspection from CAD + drawing", () => {
    const steps = inferQuoteProcesses({
      cutLengthIn: 12,
      bends: 2,
      hemCount: 0,
      solids: 2,
      holes: 4,
      finish: "powder coat",
    });
    expect(steps.map((step) => step.name)).toEqual([
      "Corte láser",
      "Doblez",
      "Ensamble / soldadura",
      "Acabado",
      "Inspección",
    ]);
    expect(steps[0]?.workCenterCode).toBe("laser");
  });

  it("falls back to fabricación when the drawing has no process clues", () => {
    const steps = inferQuoteProcesses({});
    expect(steps[0]?.name).toBe("Fabricación");
    expect(steps.at(-1)?.name).toBe("Inspección");
  });
});

describe("piecesFromSheet", () => {
  it("picks the better nest orientation", () => {
    expect(
      piecesFromSheet({
        blankWidthIn: 10,
        blankLengthIn: 5,
        sheetWidthIn: 48,
        sheetLengthIn: 96,
      }),
    ).toBe(81);
  });
});
