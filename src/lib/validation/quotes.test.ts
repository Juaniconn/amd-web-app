import { describe, expect, it } from "vitest";
import { addQuoteItemSchema, createQuoteSchema } from "./quotes";

describe("quote validation", () => {
  it("accepts a valid RFQ payload", () => {
    const result = createQuoteSchema.safeParse({
      customerId: "demo-customer-001",
      currency: "mxn",
      paymentTerms: "30 días",
      notes: "Placas CNC",
    });
    expect(result.success).toBe(true);
  });

  it("requires a customer", () => {
    const result = createQuoteSchema.safeParse({
      currency: "mxn",
    });
    expect(result.success).toBe(false);
  });

  it("accepts a priced line item", () => {
    const result = addQuoteItemSchema.safeParse({
      quoteId: "demo-quote-001",
      description: "Placa aluminio",
      quantity: 10,
      unitPrice: 85,
      discountPercent: 0,
      taxPercent: 16,
      estimatedCost: 42,
    });
    expect(result.success).toBe(true);
  });

  it("rejects a negative price", () => {
    const result = addQuoteItemSchema.safeParse({
      quoteId: "demo-quote-001",
      description: "Placa aluminio",
      quantity: 1,
      unitPrice: -1,
      taxPercent: 16,
      estimatedCost: 0,
    });
    expect(result.success).toBe(false);
  });
});
