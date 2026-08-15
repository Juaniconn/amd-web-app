import { describe, expect, it } from "vitest";
import {
  canEditQuote,
  canEditQuoteItems,
  canMarkQuoteSent,
  canTransitionQuote,
  isQuoteExpired,
} from "./status";

describe("quote status machine", () => {
  it("allows draft to internal review or sent", () => {
    expect(canTransitionQuote("borrador", "en_revision")).toBe(true);
    expect(canTransitionQuote("borrador", "enviada")).toBe(true);
    expect(canTransitionQuote("borrador", "aprobada")).toBe(false);
  });

  it("allows sent to approved, rejected or expired", () => {
    expect(canTransitionQuote("enviada", "aprobada")).toBe(true);
    expect(canTransitionQuote("enviada", "rechazada")).toBe(true);
    expect(canTransitionQuote("enviada", "expirada")).toBe(true);
    expect(canTransitionQuote("enviada", "borrador")).toBe(false);
  });

  it("only converts from approved", () => {
    expect(canTransitionQuote("aprobada", "convertida")).toBe(true);
    expect(canTransitionQuote("enviada", "convertida")).toBe(false);
    expect(canTransitionQuote("convertida", "borrador")).toBe(false);
  });

  it("locks commercial edits after send", () => {
    expect(canEditQuote("borrador")).toBe(true);
    expect(canEditQuote("en_revision")).toBe(true);
    expect(canEditQuote("enviada")).toBe(false);
    expect(canEditQuote("convertida")).toBe(false);
  });

  it("detects expiry only for sent quotes past validUntil", () => {
    const past = new Date("2026-01-01T00:00:00Z");
    const now = new Date("2026-08-13T00:00:00Z");
    expect(isQuoteExpired("enviada", past, now)).toBe(true);
    expect(isQuoteExpired("borrador", past, now)).toBe(false);
    expect(isQuoteExpired("enviada", null, now)).toBe(false);
  });

  it("blocks sending without priced items", () => {
    expect(canMarkQuoteSent({ itemCount: 0, itemsHaveUnitPrice: true }).ok).toBe(
      false,
    );
    expect(
      canMarkQuoteSent({ itemCount: 2, itemsHaveUnitPrice: false }).ok,
    ).toBe(false);
    expect(canMarkQuoteSent({ itemCount: 1, itemsHaveUnitPrice: true }).ok).toBe(
      true,
    );
  });

  it("locks design+fabrication items until engineering is released", () => {
    expect(
      canEditQuoteItems({
        status: "borrador",
        rfqType: "diseno_fabricacion",
        engineeringReleased: false,
      }),
    ).toBe(false);
    expect(
      canEditQuoteItems({
        status: "borrador",
        rfqType: "diseno_fabricacion",
        engineeringReleased: true,
      }),
    ).toBe(true);
    expect(
      canEditQuoteItems({
        status: "borrador",
        rfqType: "solo_fabricacion",
        engineeringReleased: false,
      }),
    ).toBe(true);
  });

  it("blocks sending a design RFQ before engineering release", () => {
    expect(
      canMarkQuoteSent({
        itemCount: 1,
        itemsHaveUnitPrice: true,
        rfqType: "diseno_fabricacion",
        engineeringReleased: false,
      }).ok,
    ).toBe(false);
  });
});
