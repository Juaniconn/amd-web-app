import { describe, expect, it } from "vitest";
import { buildPreviewCosting, type QuoteAgentExtract } from "./market-preview";
import { DEFAULT_PLANT_RATES } from "./plant-rates";

/**
 * El preliminar de mercado debe conservar el número de parte extraído del
 * plano: es el dato que el usuario necesita ver junto al costo, y el que se
 * copia a la partida al confirmar.
 */
describe("buildPreviewCosting · número de parte", () => {
  it("conserva número de parte y revisión del plano", () => {
    // Dato real del plano 100752-REV-B.pdf
    const extract: QuoteAgentExtract = {
      source_file: "100752-REV-B.pdf",
      part_number: "100752",
      part_name: "BRACKET, MOUNTING PUMP SUCTION MANIFOLD",
      revision: "B",
      material: "A36",
      thickness_in: 0.25,
      cut_length_in: 40,
      holes: 4,
      bends: 2,
    };

    const costing = buildPreviewCosting(extract, DEFAULT_PLANT_RATES, 1);

    expect(costing.part_number).toBe("100752");
    expect(costing.revision).toBe("B");
    expect(costing.part_name).toBe("BRACKET, MOUNTING PUMP SUCTION MANIFOLD");
  });

  it("deja el número de parte nulo cuando el plano no lo trae", () => {
    const costing = buildPreviewCosting(
      { source_file: "sin-parte.pdf", part_number: null, material: "A36" },
      DEFAULT_PLANT_RATES,
      1,
    );

    expect(costing.part_number).toBeNull();
  });

  it("conserva el número de parte al recalcular por cantidad", () => {
    // Cambiar la cantidad en la previsualización no debe perder el dato:
    // el recálculo ocurre en el ERP, sin relanzar el agente (ADR-059).
    const extract: QuoteAgentExtract = {
      source_file: "100752-REV-B.pdf",
      part_number: "100752",
      revision: "B",
      material: "A36",
      cut_length_in: 40,
    };

    const uno = buildPreviewCosting(extract, DEFAULT_PLANT_RATES, 1);
    const diez = buildPreviewCosting(extract, DEFAULT_PLANT_RATES, 10);

    expect(diez.part_number).toBe(uno.part_number);
    expect(diez.revision).toBe(uno.revision);
    expect(diez.quantity).toBe(10);
  });
});
