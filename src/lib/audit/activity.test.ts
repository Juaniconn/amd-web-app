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

  it("describes an engineering release", () => {
    expect(
      activitySummary({
        actorName: "Luis Ingeniería",
        action: "released",
        entityType: "engineering_request",
        entityLabel: "ING-2026-00001",
      }),
    ).toBe("Luis Ingeniería liberó la solicitud de ingeniería ING-2026-00001.");
  });

  it("describes a production order creation", () => {
    expect(
      activitySummary({
        actorName: "Supervisor Piso",
        action: "created",
        entityType: "production_order",
        entityLabel: "OP-2026-00001",
      }),
    ).toBe("Supervisor Piso creó la orden de trabajo OP-2026-00001.");
  });

  it("describes an inventory movement", () => {
    expect(
      activitySummary({
        actorName: "Almacén",
        action: "stock_moved",
        entityType: "inventory_movement",
        entityLabel: "Entrada 10 kg · DEMO_MAT_001",
      }),
    ).toBe("Almacén registró un movimiento de inventario en Entrada 10 kg · DEMO_MAT_001.");
  });

  it("describes an order approval", () => {
    expect(
      activitySummary({
        actorName: "Ana Ventas",
        action: "approved",
        entityType: "order",
        entityLabel: "AMD-2026-00001",
      }),
    ).toBe("Ana Ventas aprobó el pedido AMD-2026-00001.");
  });

  it("describes a project creation", () => {
    expect(
      activitySummary({
        actorName: "Ana Ventas",
        action: "created",
        entityType: "project",
        entityLabel: "PRY-2026-00001",
      }),
    ).toBe("Ana Ventas creó el proyecto PRY-2026-00001.");
  });

  it("describes a quote conversion", () => {
    expect(
      activitySummary({
        actorName: "Ana Ventas",
        action: "converted",
        entityType: "quote",
        entityLabel: "COT-2026-00004 → AMD-2026-00001",
      }),
    ).toBe(
      "Ana Ventas convirtió la cotización COT-2026-00004 → AMD-2026-00001 en pedido.",
    );
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
