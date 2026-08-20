import { describe, expect, it } from "vitest";
import { addQuoteItemSchema, createQuoteSchema } from "./quotes";

describe("quote validation", () => {
  it("accepts a valid RFQ payload", () => {
    const result = createQuoteSchema.safeParse({
      customerId: "demo-customer-001",
      branchId: "amd-branch-cjs",
      currency: "mxn",
      paymentTerm: "net_30",
      notes: "Placas CNC",
    });
    expect(result.success).toBe(true);
  });

  it("requires engineering type when the RFQ needs design", () => {
    const result = createQuoteSchema.safeParse({
      customerId: "demo-customer-001",
      branchId: "amd-branch-cjs",
      currency: "mxn",
      rfqType: "diseno_fabricacion",
      requiresEngineering: true,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.engineeringType).toBe("diseno_nuevo");
      expect(result.data.requiresEngineering).toBe(true);
    }
  });

  it("requires a customer", () => {
    const result = createQuoteSchema.safeParse({
      currency: "mxn",
    });
    expect(result.success).toBe(false);
  });

  it("accepts currency-formatted prices", () => {
    const result = addQuoteItemSchema.safeParse({
      quoteId: "demo-quote-001",
      description: "Placa aluminio",
      quantity: "24",
      unitPrice: "$1,850.00",
      taxPercent: 16,
      estimatedCost: "$42.00",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.quantity).toBe(24);
      expect(result.data.unitPrice).toBe(1850);
      expect(result.data.estimatedCost).toBe(42);
    }
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

  it("rejects empty required amounts so the user can type the number", () => {
    const result = addQuoteItemSchema.safeParse({
      quoteId: "demo-quote-001",
      description: "Placa aluminio",
      quantity: "",
      unitPrice: "",
      taxPercent: "",
      estimatedCost: "",
    });
    expect(result.success).toBe(false);
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

  it("rejects IVA outside 0, 8 or 16", () => {
    const result = addQuoteItemSchema.safeParse({
      quoteId: "demo-quote-001",
      description: "Placa aluminio",
      quantity: 1,
      unitPrice: 10,
      taxPercent: 4,
      estimatedCost: 0,
    });
    expect(result.success).toBe(false);
  });
});
