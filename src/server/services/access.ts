import "server-only";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { rolePermissions, roles, userRoles } from "@/db/schema";
import {
  type PermissionId,
  type RoleId,
  permissionsForRoles,
} from "@/lib/permissions/catalog";

export type UserAccess = {
  userId: string;
  roleIds: RoleId[];
  permissions: PermissionId[];
};

export async function getUserAccess(userId: string): Promise<UserAccess> {
  const assigned = await db
    .select({
      roleId: userRoles.roleId,
    })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .where(eq(userRoles.userId, userId));

  const roleIds = assigned.map((row) => row.roleId as RoleId);
  const catalogPermissions = permissionsForRoles(roleIds);

  const stored = await db
    .select({ permissionId: rolePermissions.permissionId })
    .from(rolePermissions)
    .innerJoin(userRoles, eq(rolePermissions.roleId, userRoles.roleId))
    .where(eq(userRoles.userId, userId));

  const permissionSet = new Set<PermissionId>(catalogPermissions);
  for (const row of stored) {
    permissionSet.add(row.permissionId as PermissionId);
  }

  return {
    userId,
    roleIds,
    permissions: [...permissionSet],
  };
}

export async function userHasPermission(
  userId: string,
  permission: PermissionId,
) {
  const access = await getUserAccess(userId);
  return access.permissions.includes(permission);
}

export function isAdmin(access: UserAccess) {
  return access.roleIds.includes("administrador");
}
