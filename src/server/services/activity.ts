import "server-only";

import { and, desc, eq, or } from "drizzle-orm";
import { db } from "@/db";
import { activityLogs } from "@/db/schema";
import {
  activitySummary,
  type ActivityAction,
  type ActivityEntityType,
} from "@/lib/audit/activity";

type InsertExecutor = Pick<typeof db, "insert">;

export async function recordActivity(
  executor: InsertExecutor,
  input: {
    actorUserId: string | null;
    actorName: string | null;
    action: ActivityAction;
    entityType: ActivityEntityType;
    entityId: string;
    entityLabel: string;
    parentEntityType?: ActivityEntityType | null;
    parentEntityId?: string | null;
    previousValue?: Record<string, unknown> | null;
    newValue?: Record<string, unknown> | null;
  },
) {
  await executor.insert(activityLogs).values({
    id: crypto.randomUUID(),
    actorUserId: input.actorUserId,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    parentEntityType: input.parentEntityType ?? null,
    parentEntityId: input.parentEntityId ?? null,
    previousValue: input.previousValue ?? null,
    newValue: input.newValue ?? null,
    summary: activitySummary({
      actorName: input.actorName,
      action: input.action,
      entityType: input.entityType,
      entityLabel: input.entityLabel,
    }),
  });
}

export async function listCustomerActivity(customerId: string) {
  return db
    .select({
      id: activityLogs.id,
      action: activityLogs.action,
      entityType: activityLogs.entityType,
      entityId: activityLogs.entityId,
      summary: activityLogs.summary,
      createdAt: activityLogs.createdAt,
    })
    .from(activityLogs)
    .where(
      or(
        and(
          eq(activityLogs.entityType, "customer"),
          eq(activityLogs.entityId, customerId),
        ),
        and(
          eq(activityLogs.parentEntityType, "customer"),
          eq(activityLogs.parentEntityId, customerId),
        ),
      ),
    )
    .orderBy(desc(activityLogs.createdAt));
}
