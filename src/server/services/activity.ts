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

export async function listQuoteActivity(quoteId: string) {
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
        and(eq(activityLogs.entityType, "quote"), eq(activityLogs.entityId, quoteId)),
        and(
          eq(activityLogs.parentEntityType, "quote"),
          eq(activityLogs.parentEntityId, quoteId),
        ),
      ),
    )
    .orderBy(desc(activityLogs.createdAt));
}

export async function listProductionActivity(productionOrderId: string) {
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
          eq(activityLogs.entityType, "production_order"),
          eq(activityLogs.entityId, productionOrderId),
        ),
        and(
          eq(activityLogs.parentEntityType, "production_order"),
          eq(activityLogs.parentEntityId, productionOrderId),
        ),
      ),
    )
    .orderBy(desc(activityLogs.createdAt));
}

export async function listOrderActivity(orderId: string) {
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
        and(eq(activityLogs.entityType, "order"), eq(activityLogs.entityId, orderId)),
        and(
          eq(activityLogs.parentEntityType, "order"),
          eq(activityLogs.parentEntityId, orderId),
        ),
      ),
    )
    .orderBy(desc(activityLogs.createdAt));
}

export async function listProjectActivity(projectId: string) {
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
        and(eq(activityLogs.entityType, "project"), eq(activityLogs.entityId, projectId)),
        and(
          eq(activityLogs.parentEntityType, "project"),
          eq(activityLogs.parentEntityId, projectId),
        ),
      ),
    )
    .orderBy(desc(activityLogs.createdAt));
}

export async function listEngineeringActivity(engineeringRequestId: string) {
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
          eq(activityLogs.entityType, "engineering_request"),
          eq(activityLogs.entityId, engineeringRequestId),
        ),
        and(
          eq(activityLogs.parentEntityType, "engineering_request"),
          eq(activityLogs.parentEntityId, engineeringRequestId),
        ),
      ),
    )
    .orderBy(desc(activityLogs.createdAt));
}
