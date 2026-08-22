import "server-only";

import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  users,
  userRoles,
  roles,
  productionOperations,
} from "@/db/schema";
import { OPERATION_ACTIVE_STATUSES } from "@/lib/production/status";

export type AvailableOperator = {
  id: string;
  name: string;
  email: string;
  activeOperations: number;
};

export async function getAvailableOperators(
  workCenterId?: string,
): Promise<AvailableOperator[]> {
  // Get all users with role "produccion"
  const operators = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
    })
    .from(users)
    .innerJoin(userRoles, eq(users.id, userRoles.userId))
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .where(eq(roles.id, "produccion"))
    .orderBy(users.name);

  // Get active operation count for each operator
  const operatorsWithLoad = await Promise.all(
    operators.map(async (op) => {
      const activeOps = await db
        .select({ id: productionOperations.id })
        .from(productionOperations)
        .where(
          and(
            eq(productionOperations.operatorUserId, op.id),
            inArray(productionOperations.status, OPERATION_ACTIVE_STATUSES),
          ),
        );

      return {
        ...op,
        activeOperations: activeOps.length,
      };
    }),
  );

  // Sort by least loaded first
  return operatorsWithLoad.sort(
    (a, b) => a.activeOperations - b.activeOperations,
  );
}

export async function suggestOperatorForWorkCenter(
  workCenterId: string,
): Promise<AvailableOperator | null> {
  // For now, return the least loaded operator
  // In future, could filter by work center, skills, etc.
  const available = await getAvailableOperators(workCenterId);
  return available[0] ?? null;
}
