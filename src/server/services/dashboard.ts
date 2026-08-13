import "server-only";

import { count, desc, eq, gt } from "drizzle-orm";
import { db } from "@/db";
import {
  permissions,
  rolePermissions,
  roles,
  sessions,
  userRoles,
  users,
} from "@/db/schema";
import { getUserAccess } from "@/server/services/access";

export async function getDashboardSnapshot(userId: string) {
  const [userRow] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!userRow) {
    throw new Error("Authenticated user was not found in the database.");
  }

  const access = await getUserAccess(userId);

  const [userCount] = await db.select({ value: count() }).from(users);
  const [roleCount] = await db.select({ value: count() }).from(roles);
  const [activeSessionCount] = await db
    .select({ value: count() })
    .from(sessions)
    .where(gt(sessions.expiresAt, new Date()));

  return {
    user: {
      ...userRow,
      roles: access.roleIds,
      permissions: access.permissions,
    },
    foundation: {
      users: Number(userCount.value),
      roles: Number(roleCount.value),
      activeSessions: Number(activeSessionCount.value),
    },
    generatedAt: new Date().toISOString(),
  };
}

export async function listUsers() {
  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      createdAt: users.createdAt,
      roleId: roles.id,
      roleName: roles.name,
    })
    .from(users)
    .leftJoin(userRoles, eq(userRoles.userId, users.id))
    .leftJoin(roles, eq(userRoles.roleId, roles.id))
    .orderBy(desc(users.createdAt));

  const byId = new Map<
    string,
    {
      id: string;
      name: string;
      email: string;
      createdAt: Date;
      roles: { id: string; name: string }[];
    }
  >();

  for (const row of rows) {
    const current = byId.get(row.id) ?? {
      id: row.id,
      name: row.name,
      email: row.email,
      createdAt: row.createdAt,
      roles: [],
    };
    if (row.roleId && row.roleName) {
      current.roles.push({ id: row.roleId, name: row.roleName });
    }
    byId.set(row.id, current);
  }

  return [...byId.values()];
}

export async function listRolesWithPermissions() {
  const rows = await db
    .select({
      id: roles.id,
      name: roles.name,
      description: roles.description,
      permissionId: permissions.id,
      permissionName: permissions.name,
      permissionDescription: permissions.description,
    })
    .from(roles)
    .leftJoin(rolePermissions, eq(rolePermissions.roleId, roles.id))
    .leftJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
    .orderBy(roles.name);

  const byId = new Map<
    string,
    {
      id: string;
      name: string;
      description: string | null;
      permissions: { id: string; name: string; description: string | null }[];
    }
  >();

  for (const row of rows) {
    const current = byId.get(row.id) ?? {
      id: row.id,
      name: row.name,
      description: row.description,
      permissions: [],
    };
    if (row.permissionId && row.permissionName) {
      current.permissions.push({
        id: row.permissionId,
        name: row.permissionName,
        description: row.permissionDescription,
      });
    }
    byId.set(row.id, current);
  }

  return [...byId.values()];
}
