import "server-only";

import { and, count, eq, inArray, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { orders, productionOrders } from "@/db/schema";
import { ACTIVE_PRODUCTION_STATUSES } from "@/lib/production/status";

export async function getOrderDashboardStats() {
  const now = new Date();
  const activeStatuses = ["borrador", "pendiente", "aprobado", "en_produccion"] as const;

  const [active] = await db
    .select({ value: count() })
    .from(orders)
    .where(inArray(orders.status, [...activeStatuses]));

  const [approved] = await db
    .select({ value: count() })
    .from(orders)
    .where(eq(orders.status, "aprobado"));

  const [inProduction] = await db
    .select({ value: count() })
    .from(orders)
    .where(eq(orders.status, "en_produccion"));

  const [completed] = await db
    .select({ value: count() })
    .from(orders)
    .where(eq(orders.status, "completado"));

  const [delayedByDate] = await db
    .select({ value: count() })
    .from(orders)
    .where(
      and(
        inArray(orders.status, ["pendiente", "aprobado", "en_produccion"]),
        lt(orders.promisedDate, now),
      ),
    );

  const delayedWithoutDate = await db
    .select({ id: orders.id })
    .from(orders)
    .innerJoin(productionOrders, eq(productionOrders.orderId, orders.id))
    .where(
      and(
        inArray(orders.status, ["pendiente", "aprobado", "en_produccion"]),
        sql`${orders.promisedDate} is null`,
        lt(productionOrders.promisedDate, now),
        inArray(productionOrders.status, [...ACTIVE_PRODUCTION_STATUSES]),
      ),
    )
    .groupBy(orders.id);

  return {
    active: active?.value ?? 0,
    approved: approved?.value ?? 0,
    inProduction: inProduction?.value ?? 0,
    completed: completed?.value ?? 0,
    delayed: (delayedByDate?.value ?? 0) + delayedWithoutDate.length,
  };
}
