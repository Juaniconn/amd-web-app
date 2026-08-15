import { describe, expect, it } from "vitest";
import {
  canEditProject,
  canTransitionProject,
  permissionForProjectTransition,
} from "./status";

describe("project aggregator status", () => {
  it("allows planeacion → activo → pausado/completado", () => {
    expect(canTransitionProject("planeacion", "activo")).toBe(true);
    expect(canTransitionProject("activo", "pausado")).toBe(true);
    expect(canTransitionProject("pausado", "activo")).toBe(true);
    expect(canTransitionProject("activo", "completado")).toBe(true);
    expect(canTransitionProject("planeacion", "completado")).toBe(false);
    expect(canTransitionProject("completado", "activo")).toBe(false);
  });

  it("locks edits on closed or cancelled projects", () => {
    expect(canEditProject("activo")).toBe(true);
    expect(canEditProject("completado")).toBe(false);
    expect(canEditProject("cancelado")).toBe(false);
  });

  it("maps close and cancel to dedicated permissions", () => {
    expect(permissionForProjectTransition("completado")).toBe("projects:close");
    expect(permissionForProjectTransition("cancelado")).toBe("projects:cancel");
    expect(permissionForProjectTransition("activo")).toBe("projects:update");
  });
});
