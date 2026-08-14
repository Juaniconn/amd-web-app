import { describe, expect, it } from "vitest";
import {
  canAttachEngineeringFiles,
  canLogEngineeringHours,
  canTransitionEngineering,
  permissionForEngineeringTransition,
  quoteEngineeringStatusFromRequest,
} from "./status";

describe("engineering status machine", () => {
  it("follows the documented happy path", () => {
    expect(canTransitionEngineering("pendiente", "asignado")).toBe(true);
    expect(canTransitionEngineering("asignado", "disenando")).toBe(true);
    expect(canTransitionEngineering("disenando", "revision_interna")).toBe(true);
    expect(canTransitionEngineering("revision_interna", "esperando_cliente")).toBe(
      true,
    );
    expect(canTransitionEngineering("esperando_cliente", "aprobado")).toBe(true);
    expect(canTransitionEngineering("aprobado", "liberado")).toBe(true);
  });

  it("allows manufacturability shortcut from assigned to internal review", () => {
    expect(canTransitionEngineering("asignado", "revision_interna")).toBe(true);
  });

  it("routes corrections back to designing", () => {
    expect(canTransitionEngineering("revision_interna", "correcciones")).toBe(
      true,
    );
    expect(canTransitionEngineering("esperando_cliente", "correcciones")).toBe(
      true,
    );
    expect(canTransitionEngineering("correcciones", "disenando")).toBe(true);
    expect(canTransitionEngineering("liberado", "correcciones")).toBe(false);
  });

  it("keeps released and cancelled terminal", () => {
    expect(canTransitionEngineering("liberado", "pendiente")).toBe(false);
    expect(canTransitionEngineering("cancelado", "asignado")).toBe(false);
  });

  it("maps request status onto the RFQ engineering summary", () => {
    expect(quoteEngineeringStatusFromRequest("pendiente")).toBe("pendiente");
    expect(quoteEngineeringStatusFromRequest("disenando")).toBe("en_proceso");
    expect(quoteEngineeringStatusFromRequest("esperando_cliente")).toBe(
      "esperando_cliente",
    );
    expect(quoteEngineeringStatusFromRequest("aprobado")).toBe("aprobada");
    expect(quoteEngineeringStatusFromRequest("liberado")).toBe("liberada");
    expect(quoteEngineeringStatusFromRequest("cancelado")).toBe("pendiente");
  });

  it("gates files, hours and permissions", () => {
    expect(canAttachEngineeringFiles("disenando")).toBe(true);
    expect(canAttachEngineeringFiles("liberado")).toBe(false);
    expect(canLogEngineeringHours("pendiente")).toBe(false);
    expect(canLogEngineeringHours("disenando")).toBe(true);
    expect(permissionForEngineeringTransition("asignado")).toBe(
      "engineering:assign",
    );
    expect(permissionForEngineeringTransition("aprobado")).toBe(
      "engineering:approve",
    );
    expect(permissionForEngineeringTransition("correcciones")).toBe(
      "engineering:approve",
    );
    expect(permissionForEngineeringTransition("liberado")).toBe(
      "engineering:release",
    );
  });
});
