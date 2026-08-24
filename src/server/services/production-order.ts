import "server-only";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { customers, orders, productionOrders, quotes } from "@/db/schema";

export async function getProductionOrderById(id: string) {
  const [row] = await db
    .select({
      id: orders.id,
      number: orders.number,
      customerId: orders.customerId,
      customerName: customers.legalName,
      quoteId: orders.quoteId,
      quoteNumber: quotes.number,
      status: orders.status,
      promisedDate: orders.promisedDate,
      total: orders.total,
      currency: orders.currency,
      requiresEngineering: quotes.requiresEngineering,
      rfqType: quotes.rfqType,
      isDemo: orders.isDemo,
    })
    .from(orders)
    .innerJoin(customers, eq(orders.customerId, customers.id))
    .innerJoin(quotes, eq(orders.quoteId, quotes.id))
    .where(eq(orders.id, id))
    .limit(1);

  if (!row) return null;

  const parts = await db
    .select({
      id: productionOrders.id,
      number: productionOrders.number,
      partNumber: productionOrders.partNumber,
      description: productionOrders.description,
      quantity: productionOrders.quantity,
      unit: productionOrders.unit,
      status: productionOrders.status,
      priority: productionOrders.priority,
      promisedDate: productionOrders.promisedDate,
      isDemo: productionOrders.isDemo,
    })
    .from(productionOrders)
    .where(eq(productionOrders.orderId, id))
    .orderBy(productionOrders.number);

  return {
    ...row,
    parts,
  };
}
