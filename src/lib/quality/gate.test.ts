import { describe, expect, it } from "vitest";
import { qualityPhysicalCloseState } from "./gate";

describe("qualityPhysicalCloseState", () => {
  it("does not block when there is no final inspection", () => {
    const state = qualityPhysicalCloseState([]);
    expect(state.blocked).toBe(false);
    expect(state.hasFinal).toBe(false);
    expect(state.warning).toMatch(/inspección final/i);
  });

  it("blocks when the latest final inspection is rejected", () => {
    const state = qualityPhysicalCloseState([
      { inspectedAt: "2026-08-01T10:00:00Z", result: "aprobado" },
      { inspectedAt: "2026-08-02T10:00:00Z", result: "rechazado" },
    ]);
    expect(state.blocked).toBe(true);
    expect(state.latestResult).toBe("rechazado");
  });

  it("unblocks when a later final inspection is approved", () => {
    const state = qualityPhysicalCloseState([
      { inspectedAt: "2026-08-01T10:00:00Z", result: "rechazado" },
      { inspectedAt: "2026-08-03T10:00:00Z", result: "aprobado" },
    ]);
    expect(state.blocked).toBe(false);
    expect(state.warning).toBeNull();
  });
});
