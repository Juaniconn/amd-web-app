import { describe, expect, it } from "vitest";
import {
  createContactSchema,
  createCustomerSchema,
  updateCustomerSchema,
} from "./customers";

describe("customer validation", () => {
  it("accepts a valid customer payload", () => {
    const result = createCustomerSchema.safeParse({
      legalName: "Cliente Industrial A",
      tradeName: "CIA",
      rfc: "XAXX010101000",
      phone: "656-100-0001",
      email: "contacto@cliente-industrial-a.example",
      city: "Ciudad Juárez",
      state: "Chihuahua",
      country: "México",
      type: "industrial",
      status: "activo",
      notes: "Cliente demo",
    });
    expect(result.success).toBe(true);
  });

  it("requires a company name", () => {
    const result = createCustomerSchema.safeParse({
      legalName: "A",
      type: "industrial",
      status: "activo",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid RFC", () => {
    const result = createCustomerSchema.safeParse({
      legalName: "Cliente Industrial A",
      rfc: "ABC",
      type: "industrial",
      status: "activo",
    });
    expect(result.success).toBe(false);
  });

  it("treats blank optional fields as undefined", () => {
    const result = createCustomerSchema.safeParse({
      legalName: "Cliente Industrial A",
      tradeName: "  ",
      rfc: "",
      email: "",
      type: "maquiladora",
      status: "activo",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.tradeName).toBeUndefined();
      expect(result.data.rfc).toBeUndefined();
      expect(result.data.email).toBeUndefined();
      expect(result.data.country).toBe("México");
    }
  });

  it("requires an id when updating", () => {
    const result = updateCustomerSchema.safeParse({
      legalName: "Cliente Industrial A",
      type: "industrial",
      status: "activo",
    });
    expect(result.success).toBe(false);
  });
});

describe("contact validation", () => {
  it("accepts a valid contact", () => {
    const result = createContactSchema.safeParse({
      customerId: "customer-1",
      name: "Ana Compras",
      title: "Compras",
      email: "ana@cliente.example",
      isPrimary: true,
    });
    expect(result.success).toBe(true);
  });

  it("rejects a contact without a name", () => {
    const result = createContactSchema.safeParse({
      customerId: "customer-1",
      name: "A",
      isPrimary: false,
    });
    expect(result.success).toBe(false);
  });
});
