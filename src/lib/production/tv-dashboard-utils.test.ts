import { describe, expect, it } from "vitest";
import {
  calculateOrderProgress,
  formatMachineStatus,
  formatMaterialAlert,
  calculateActiveOperators,
  sortOrdersByPriority,
} from "./tv-dashboard-utils";

describe("TV Dashboard Utils", () => {
  describe("calculateOrderProgress", () => {
    it("returns 0 when total parts is 0", () => {
      expect(calculateOrderProgress(0, 0)).toBe(0);
    });

    it("calculates percentage correctly", () => {
      expect(calculateOrderProgress(5, 10)).toBe(50);
      expect(calculateOrderProgress(3, 4)).toBe(75);
      expect(calculateOrderProgress(10, 10)).toBe(100);
    });

    it("rounds to nearest integer", () => {
      expect(calculateOrderProgress(1, 3)).toBe(33);
      expect(calculateOrderProgress(2, 3)).toBe(67);
    });
  });

  describe("formatMachineStatus", () => {
    it("returns Spanish label for known statuses", () => {
      expect(formatMachineStatus("disponible")).toBe("Disponible");
      expect(formatMachineStatus("en_produccion")).toBe("En Producción");
      expect(formatMachineStatus("ocupada")).toBe("Ocupada");
      expect(formatMachineStatus("mantenimiento")).toBe("Mantenimiento");
      expect(formatMachineStatus("fuera_de_servicio")).toBe("Fuera de Servicio");
    });

    it("returns unknown status as-is", () => {
      expect(formatMachineStatus("unknown")).toBe("unknown");
    });
  });

  describe("formatMaterialAlert", () => {
    it("formats low stock alert in Spanish", () => {
      const alert = formatMaterialAlert({
        materialName: "Acero 1018",
        code: "MAT-001",
        currentStock: 5,
        minStock: 10,
      });
      expect(alert.title).toBe("Acero 1018 bajo mínimo");
      expect(alert.description).toContain("5");
      expect(alert.description).toContain("10");
      expect(alert.tone).toBe("warning");
    });

    it("formats critical stock alert in Spanish", () => {
      const alert = formatMaterialAlert({
        materialName: "Aluminio 6061",
        code: "MAT-002",
        currentStock: 0,
        minStock: 5,
      });
      expect(alert.tone).toBe("urgent");
    });
  });

  describe("calculateActiveOperators", () => {
    it("counts operators with active operations", () => {
      const operators = [
        { id: "1", name: "Juan", activeOperations: 2 },
        { id: "2", name: "Pedro", activeOperations: 0 },
        { id: "3", name: "María", activeOperations: 1 },
      ];
      expect(calculateActiveOperators(operators)).toBe(2);
    });

    it("returns 0 for empty array", () => {
      expect(calculateActiveOperators([])).toBe(0);
    });
  });

  describe("sortOrdersByPriority", () => {
    it("sorts delayed orders first", () => {
      const orders = [
        { id: "1", number: "OT-001", isDelayed: false, promisedDate: "2026-08-20" },
        { id: "2", number: "OT-002", isDelayed: true, promisedDate: "2026-08-15" },
        { id: "3", number: "OT-003", isDelayed: false, promisedDate: "2026-08-25" },
      ];
      const sorted = sortOrdersByPriority(orders);
      expect(sorted[0].id).toBe("2");
    });

    it("sorts by promised date among non-delayed", () => {
      const orders = [
        { id: "1", number: "OT-001", isDelayed: false, promisedDate: "2026-08-25" },
        { id: "2", number: "OT-002", isDelayed: false, promisedDate: "2026-08-20" },
      ];
      const sorted = sortOrdersByPriority(orders);
      expect(sorted[0].id).toBe("2");
    });
  });
});