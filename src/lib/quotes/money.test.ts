import { describe, expect, it } from "vitest";
import {
  calculateLineTotals,
  calculateQuoteTotals,
  formatMoney,
  roundMoney,
  taxPercentForCurrency,
} from "./money";

describe("quote money", () => {
  it("rounds to two decimal places", () => {
    expect(roundMoney(10.126)).toBe(10.13);
    expect(formatMoney(10)).toBe("10.00");
  });

  it("calculates a priced line with IVA 16% and margin", () => {
    const line = calculateLineTotals({
      quantity: 10,
      unitPrice: 100,
      discountPercent: 0,
      taxPercent: 16,
      estimatedCost: 60,
    });

    expect(line.lineSubtotal).toBe(1000);
    expect(line.lineTax).toBe(160);
    expect(line.lineTotal).toBe(1160);
    expect(line.lineEstimatedCost).toBe(600);
    expect(line.lineProfit).toBe(400);
    expect(line.lineMarginPercent).toBe(40);
  });

  it("applies discount before tax", () => {
    const line = calculateLineTotals({
      quantity: 2,
      unitPrice: 100,
      discountPercent: 10,
      taxPercent: 16,
      estimatedCost: 40,
    });

    expect(line.lineSubtotal).toBe(180);
    expect(line.lineTax).toBe(28.8);
    expect(line.lineTotal).toBe(208.8);
    expect(line.lineEstimatedCost).toBe(80);
    expect(line.lineProfit).toBe(100);
    expect(line.lineMarginPercent).toBe(55.56);
  });

  it("returns null margin when subtotal is zero", () => {
    const line = calculateLineTotals({
      quantity: 0,
      unitPrice: 100,
      discountPercent: 0,
      taxPercent: 16,
      estimatedCost: 10,
    });
    expect(line.lineSubtotal).toBe(0);
    expect(line.lineMarginPercent).toBeNull();
  });

  it("sums header totals from lines", () => {
    const a = calculateLineTotals({
      quantity: 1,
      unitPrice: 100,
      discountPercent: 0,
      taxPercent: 16,
      estimatedCost: 40,
    });
    const b = calculateLineTotals({
      quantity: 2,
      unitPrice: 50,
      discountPercent: 0,
      taxPercent: 16,
      estimatedCost: 20,
    });
    const header = calculateQuoteTotals([a, b]);
    expect(header.subtotal).toBe(200);
    expect(header.taxTotal).toBe(32);
    expect(header.total).toBe(232);
    expect(header.estimatedCost).toBe(80);
    expect(header.estimatedProfit).toBe(120);
    expect(header.marginPercent).toBe(60);
  });

  it("does not charge IVA on USD", () => {
    expect(taxPercentForCurrency("usd")).toBe(0);
    expect(taxPercentForCurrency("USD")).toBe(0);
    expect(taxPercentForCurrency("mxn")).toBe(16);
    const line = calculateLineTotals({
      quantity: 1,
      unitPrice: 100,
      discountPercent: 0,
      taxPercent: taxPercentForCurrency("usd"),
      estimatedCost: 40,
    });
    expect(line.lineTax).toBe(0);
    expect(line.lineTotal).toBe(100);
  });
});
