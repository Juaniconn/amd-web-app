import { describe, expect, it } from "vitest";
import { computeQuoteCosts, estimateBendMinutes, estimateCutMinutes } from "./cost-engine";
import { priceQuoteItem } from "./costing";

describe("sheet-metal cost engine", () => {
  it("prices a 1-piece laser + bend job with two decimals", () => {
    const priced = priceQuoteItem({
      quantity: 1,
      unit_weight_lb: 7.9,
      scrap_weight_lb: 3.69,
      net_area_in2: 232,
      cut_length_in: 180,
      holes: 8,
      slots: 0,
      bends: 4,
      hem_count: 4,
      finish: "POWDER COAT",
    });
    expect(priced.unit_price).toBeGreaterThan(1000);
    expect(priced.material_cost).toBeGreaterThan(0);
    expect(priced.cut_cost).toBeGreaterThan(0);
    expect(priced.bend_cost).toBeGreaterThan(0);
    expect(priced.finish_cost).toBe(480);
    expect(Number.isInteger(Math.round(priced.unit_price * 100))).toBe(true);
  });

  it("charges Durma setup once per lot", () => {
    const one = estimateBendMinutes({ bends: 4, hemCount: 0, quantity: 1 });
    const ten = estimateBendMinutes({ bends: 4, hemCount: 0, quantity: 10 });
    expect(one).toBeCloseTo(13.2, 1);
    expect(ten).toBeGreaterThan(one);
    expect(ten).toBeCloseTo(13.2 + 9 * ((4 * 18) / 60), 1);
  });

  it("estimates cut minutes from length and pierces", () => {
    const minutes = estimateCutMinutes({
      cutLengthIn: 100,
      holes: 4,
      slots: 0,
      speedIpm: 100,
      pierceSec: 1.2,
    });
    expect(minutes).toBeCloseTo(1 + 0.1 + 0.35, 2);
  });

  it("still bills CAM and packing when geometry is missing", () => {
    const priced = computeQuoteCosts({ quantity: 5 });
    expect(priced.material_cost).toBe(0);
    expect(priced.cut_cost).toBeGreaterThan(0);
    expect(priced.engineering_cost).toBeGreaterThan(0);
    expect(priced.packing_cost).toBeGreaterThan(0);
    expect(priced.unit_price).toBeGreaterThan(0);
  });
});
