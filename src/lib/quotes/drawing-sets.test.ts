import { describe, expect, it } from "vitest";
import { drawingSetLabel, groupDrawingSets } from "./drawing-sets";

describe("groupDrawingSets", () => {
  it("pairs pdf and dxf with the same stem", () => {
    const sets = groupDrawingSets([
      { originalName: "BRACKET-REV-A.pdf" },
      { originalName: "BRACKET-REV-A.dxf" },
    ]);
    expect(sets).toHaveLength(1);
    expect(sets[0]?.pdf?.originalName).toBe("BRACKET-REV-A.pdf");
    expect(sets[0]?.cad?.originalName).toBe("BRACKET-REV-A.dxf");
    expect(drawingSetLabel(sets[0]!)).toBe("BRACKET-REV-A");
  });

  it("pairs a single unmatched pdf with a single unmatched dxf", () => {
    const sets = groupDrawingSets([
      { originalName: "plano cliente.pdf" },
      { originalName: "pieza.dxf" },
    ]);
    expect(sets).toHaveLength(1);
    expect(sets[0]?.files).toHaveLength(2);
  });

  it("pairs pdf and STEP with the same stem", () => {
    const sets = groupDrawingSets([
      { originalName: "BRACKET-REV-A.pdf" },
      { originalName: "BRACKET-REV-A.step" },
    ]);
    expect(sets).toHaveLength(1);
    expect(sets[0]?.cad?.originalName).toBe("BRACKET-REV-A.step");
  });

  it("keeps separate pdfs as separate partidas", () => {
    const sets = groupDrawingSets([
      { originalName: "A.pdf" },
      { originalName: "B.pdf" },
    ]);
    expect(sets).toHaveLength(2);
  });
});
