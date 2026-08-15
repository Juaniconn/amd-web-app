import "server-only";

import { and, count, eq, inArray, isNotNull, lt } from "drizzle-orm";
import { db } from "@/db";
import { orders, productionOrders, projects } from "@/db/schema";

export async function getProjectDashboardStats() {
  const now = new Date();

  const [active] = await db
    .select({ value: count() })
    .from(projects)
    .where(eq(projects.status, "activo"));

  const [completed] = await db
    .select({ value: count() })
    .from(projects)
    .where(eq(projects.status, "completado"));

  const [delayed] = await db
    .select({ value: count() })
    .from(projects)
    .where(and(eq(projects.status, "activo"), lt(projects.estimatedEndDate, now)));

  const [linkedOrders] = await db
    .select({ value: count() })
    .from(orders)
    .where(isNotNull(orders.projectId));

  const linked = await db
    .select({ id: orders.id })
    .from(orders)
    .where(isNotNull(orders.projectId));

  const [linkedOts] =
    linked.length > 0
      ? await db
          .select({ value: count() })
          .from(productionOrders)
          .where(
            inArray(
              productionOrders.orderId,
              linked.map((row) => row.id),
            ),
          )
      : [{ value: 0 }];

  return {
    active: active?.value ?? 0,
    completed: completed?.value ?? 0,
    delayed: delayed?.value ?? 0,
    linkedOrders: linkedOrders?.value ?? 0,
    linkedOts: linkedOts?.value ?? 0,
  };
}
