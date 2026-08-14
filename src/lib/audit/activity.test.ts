import { describe, expect, it } from "vitest";
import { activitySummary, pickChangedFields } from "./activity";

describe("activitySummary", () => {
  it("builds a customer creation summary", () => {
    expect(
      activitySummary({
        actorName: "Ana Ventas",
        action: "created",
        entityType: "customer",
        entityLabel: "Cliente Industrial A",
      }),
    ).toBe("Ana Ventas creó el cliente Cliente Industrial A.");
  });

  it("uses Sistema when there is no actor", () => {
    expect(
      activitySummary({
        actorName: null,
        action: "deleted",
        entityType: "customer",
        entityLabel: "Maquiladora A",
      }),
    ).toBe("Sistema archivó el cliente Maquiladora A.");
  });

  it("describes a primary contact change", () => {
    expect(
      activitySummary({
        actorName: "Juan",
        action: "primary_contact_changed",
        entityType: "contact",
        entityLabel: "Ana Compras",
      }),
    ).toBe("Juan marcó a Ana Compras como contacto principal.");
  });
});

describe("pickChangedFields", () => {
  it("returns only fields that changed", () => {
    const result = pickChangedFields(
      { legalName: "A", city: "Juárez", notes: null },
      { legalName: "A", city: "Chihuahua", notes: "Nueva nota" },
    );
    expect(result.previousValue).toEqual({
      city: "Juárez",
      notes: null,
    });
    expect(result.newValue).toEqual({
      city: "Chihuahua",
      notes: "Nueva nota",
    });
  });
});
