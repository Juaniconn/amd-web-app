import { describe, expect, it } from "vitest";
import {
  PERMISSION_IDS,
  ROLE_IDS,
  permissionsForRoles,
  roleHasPermission,
} from "./catalog";

describe("RBAC catalog", () => {
  it("gives the administrator every Phase 1 permission", () => {
    for (const permission of Object.values(PERMISSION_IDS)) {
      expect(roleHasPermission(ROLE_IDS.administrador, permission)).toBe(true);
    }
  });

  it("lets Dirección read dashboard, settings, users and roles, but not write users", () => {
    expect(roleHasPermission(ROLE_IDS.direccion, PERMISSION_IDS.dashboardRead)).toBe(
      true,
    );
    expect(roleHasPermission(ROLE_IDS.direccion, PERMISSION_IDS.usersRead)).toBe(
      true,
    );
    expect(roleHasPermission(ROLE_IDS.direccion, PERMISSION_IDS.usersWrite)).toBe(
      false,
    );
  });

  it("limits operational roles to dashboard access in Phase 1", () => {
    const operational = [
      ROLE_IDS.ventas,
      ROLE_IDS.compras,
      ROLE_IDS.produccion,
      ROLE_IDS.calidad,
      ROLE_IDS.almacen,
    ];

    for (const role of operational) {
      expect(roleHasPermission(role, PERMISSION_IDS.dashboardRead)).toBe(true);
      expect(roleHasPermission(role, PERMISSION_IDS.usersWrite)).toBe(false);
      expect(roleHasPermission(role, PERMISSION_IDS.rolesRead)).toBe(false);
    }
  });

  it("unions permissions across multiple roles", () => {
    const permissions = permissionsForRoles([
      ROLE_IDS.ventas,
      ROLE_IDS.direccion,
    ]);
    expect(permissions).toContain(PERMISSION_IDS.dashboardRead);
    expect(permissions).toContain(PERMISSION_IDS.usersRead);
    expect(permissions).not.toContain(PERMISSION_IDS.usersWrite);
  });
});
