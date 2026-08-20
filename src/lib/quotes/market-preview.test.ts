import { describe, expect, it } from "vitest";
import { DEFAULT_PLANT_RATES } from "./plant-rates";
import {
  buildPreviewCosting,
  parseAgentJson,
  previewGrandTotal,
  scalePreviewItem,
} from "./market-preview";

describe("parseAgentJson", () => {
  it("reads JSON from a fenced agent reply", () => {
    const parsed = parseAgentJson(
      'Listo.\n```json\n{"items":[{"part_name":"Bracket","material":"A36","thickness_in":0.12}]}\n```\n',
    );
    expect(parsed.items).toHaveLength(1);
    expect(parsed.items[0]?.part_name).toBe("Bracket");
  });
});

describe("market preview pricing", () => {
  it("starts at quantity 1 and scales the lote when qty changes", () => {
    const costing = buildPreviewCosting(
      {
        part_name: "Bracket",
        material: "A36",
        thickness_in: 0.12,
        unit_weight_lb: 2,
        cut_length_in: 40,
        bends: 2,
        market_cost_per_kg: 40,
      },
      DEFAULT_PLANT_RATES,
      1,
    );
    expect(costing.quantity).toBe(1);
    expect(costing.supplier_name).toBe("Mercado (preliminar)");
    expect(costing.breakdown?.unit_price).toBeGreaterThan(0);

    const scaled = scalePreviewItem(
      { id: "1", sourceFile: "a.pdf", description: "Bracket", costing },
      10,
      DEFAULT_PLANT_RATES,
    );
    expect(scaled.costing.quantity).toBe(10);
    expect(scaled.costing.breakdown?.total ?? 0).toBeGreaterThan(costing.breakdown?.total ?? 0);
    expect(previewGrandTotal([scaled])).toBe(scaled.costing.breakdown?.total);
  });
});
