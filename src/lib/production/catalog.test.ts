import { describe, expect, it } from "vitest";
import {
  PRODUCTION_PRIORITY_LABELS,
  PRODUCTION_PRIORITY_OPTIONS,
  PRODUCTION_PRIORITY_RANK,
  DEFAULT_PRODUCTION_PRIORITY,
  formatHoursMinutes,
  hoursToMinutes,
} from "./catalog";

describe("production priority labels", () => {
  it("does not prefix the official 1–4 rank on the visible label", () => {
    for (const label of Object.values(PRODUCTION_PRIORITY_LABELS)) {
      expect(label).not.toMatch(/^[1-4]\b/);
    }
  });

  it("keeps the official rank for sort order", () => {
    expect(PRODUCTION_PRIORITY_RANK.urgente).toBe(1);
    expect(PRODUCTION_PRIORITY_RANK.compromiso_inmediato).toBe(2);
    expect(PRODUCTION_PRIORITY_RANK.programada).toBe(3);
    expect(PRODUCTION_PRIORITY_RANK.produccion_normal).toBe(4);
  });

  it("lists the default priority first in the form", () => {
    expect(PRODUCTION_PRIORITY_OPTIONS[0]).toBe(DEFAULT_PRODUCTION_PRIORITY);
  });
});

describe("hours and minutes", () => {
  it("formats machine and engineering time as hours and minutes", () => {
    expect(formatHoursMinutes(0)).toBe("0 min");
    expect(formatHoursMinutes(45)).toBe("45 min");
    expect(formatHoursMinutes(60)).toBe("1 h");
    expect(formatHoursMinutes(90)).toBe("1 h 30 min");
    expect(formatHoursMinutes(hoursToMinutes(1.5))).toBe("1 h 30 min");
  });
});
