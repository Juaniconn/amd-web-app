import { describe, expect, it } from "vitest";
import {
  formatNotificationTitle,
  formatNotificationDescription,
  getNotificationIcon,
  sortNotificationsByDate,
  filterUnreadNotifications,
} from "./notification-utils";

describe("Notification Utils", () => {
  describe("formatNotificationTitle", () => {
    it("formats status change notification", () => {
      expect(
        formatNotificationTitle("status_change", { otNumber: "OT-001", newStatus: "En Producción" })
      ).toBe("OT-001 cambió a En Producción");
    });

    it("formats part assigned notification", () => {
      expect(
        formatNotificationTitle("part_assigned", { partNumber: "NP-001", operatorName: "Juan" })
      ).toBe("NP-001 asignado a Juan");
    });

    it("formats missing material notification", () => {
      expect(
        formatNotificationTitle("missing_material", { materialName: "Acero 1018", otNumber: "OT-002" })
      ).toBe("Material faltante: Acero 1018 en OT-002");
    });

    it("formats pending inspection notification", () => {
      expect(
        formatNotificationTitle("pending_inspection", { partNumber: "NP-003" })
      ).toBe("Inspección pendiente: NP-003");
    });
  });

  describe("formatNotificationDescription", () => {
    it("returns description for status change", () => {
      const desc = formatNotificationDescription("status_change", { oldStatus: "Pendiente", newStatus: "En Producción" });
      expect(desc).toContain("Pendiente");
      expect(desc).toContain("En Producción");
    });
  });

  describe("getNotificationIcon", () => {
    it("returns correct icon name for each type", () => {
      expect(getNotificationIcon("status_change")).toBe("refresh-cw");
      expect(getNotificationIcon("part_assigned")).toBe("user-check");
      expect(getNotificationIcon("missing_material")).toBe("alert-triangle");
      expect(getNotificationIcon("pending_inspection")).toBe("search");
    });
  });

  describe("sortNotificationsByDate", () => {
    it("sorts newest first", () => {
      const notifications = [
        { id: "1", createdAt: "2026-08-20T10:00:00Z" },
        { id: "2", createdAt: "2026-08-25T10:00:00Z" },
        { id: "3", createdAt: "2026-08-22T10:00:00Z" },
      ];
      const sorted = sortNotificationsByDate(notifications);
      expect(sorted[0].id).toBe("2");
      expect(sorted[1].id).toBe("3");
      expect(sorted[2].id).toBe("1");
    });
  });

  describe("filterUnreadNotifications", () => {
    it("filters only unread", () => {
      const notifications = [
        { id: "1", read: true },
        { id: "2", read: false },
        { id: "3", read: false },
      ];
      const unread = filterUnreadNotifications(notifications);
      expect(unread.length).toBe(2);
      expect(unread[0].id).toBe("2");
    });
  });
});