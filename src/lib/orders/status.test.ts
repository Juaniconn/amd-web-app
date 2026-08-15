import { describe, expect, it } from "vitest";
import {
  canEditOrder,
  canIssueOtFromOrderStatus,
  canTransitionOrder,
  permissionForOrderTransition,
} from "./status";

describe("order commercial status", () => {
  it("converts pendiente to aprobado, then to producción and completado", () => {
    expect(canTransitionOrder("pendiente", "aprobado")).toBe(true);
    expect(canTransitionOrder("aprobado", "en_produccion")).toBe(true);
    expect(canTransitionOrder("en_produccion", "completado")).toBe(true);
    expect(canTransitionOrder("pendiente", "en_produccion")).toBe(false);
    expect(canTransitionOrder("completado", "cancelado")).toBe(false);
  });

  it("only issues OT from aprobado or en_produccion", () => {
    expect(canIssueOtFromOrderStatus("pendiente")).toBe(false);
    expect(canIssueOtFromOrderStatus("aprobado")).toBe(true);
    expect(canIssueOtFromOrderStatus("en_produccion")).toBe(true);
    expect(canIssueOtFromOrderStatus("cancelado")).toBe(false);
  });

  it("locks commercial edits on terminal states", () => {
    expect(canEditOrder("pendiente")).toBe(true);
    expect(canEditOrder("completado")).toBe(false);
    expect(canEditOrder("cancelado")).toBe(false);
  });

  it("maps transitions to the matching permission", () => {
    expect(permissionForOrderTransition("aprobado")).toBe("orders:approve");
    expect(permissionForOrderTransition("cancelado")).toBe("orders:cancel");
    expect(permissionForOrderTransition("en_produccion")).toBe("orders:update");
  });
});
