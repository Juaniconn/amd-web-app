import { describe, expect, it } from "vitest";
import {
  canTransitionProduction,
  permissionForProductionTransition,
  requiresDowntimeReason,
} from "./status";

describe("production status machine", () => {
  it("follows the official happy path", () => {
    expect(canTransitionProduction("pendiente", "liberada")).toBe(true);
    expect(canTransitionProduction("liberada", "programada")).toBe(true);
    expect(canTransitionProduction("programada", "en_produccion")).toBe(true);
    expect(canTransitionProduction("en_produccion", "calidad")).toBe(true);
    expect(canTransitionProduction("calidad", "terminada")).toBe(true);
    expect(canTransitionProduction("terminada", "entregada")).toBe(true);
  });

  it("can wait for material from released and return", () => {
    expect(canTransitionProduction("liberada", "esperando_material")).toBe(true);
    expect(canTransitionProduction("esperando_material", "liberada")).toBe(true);
  });

  it("requires downtime reason to pause", () => {
    expect(canTransitionProduction("en_produccion", "pausada")).toBe(true);
    expect(requiresDowntimeReason("pausada")).toBe(true);
    expect(canTransitionProduction("pausada", "en_produccion")).toBe(true);
  });

  it("keeps delivered and cancelled terminal", () => {
    expect(canTransitionProduction("entregada", "en_produccion")).toBe(false);
    expect(canTransitionProduction("cancelada", "pendiente")).toBe(false);
    expect(canTransitionProduction("calidad", "cancelada")).toBe(false);
  });

  it("does not reopen engineering-style skip from pendiente to calidad", () => {
    expect(canTransitionProduction("pendiente", "calidad")).toBe(false);
  });

  it("maps close permissions", () => {
    expect(permissionForProductionTransition("terminada")).toBe("quality:release");
    expect(permissionForProductionTransition("entregada")).toBe("production:close");
    expect(permissionForProductionTransition("cancelada")).toBe("production:cancel");
    expect(permissionForProductionTransition("programada")).toBe("production:schedule");
  });
});
