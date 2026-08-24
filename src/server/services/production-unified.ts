import "server-only";

import { and, asc, count, desc, eq, ilike, inArray, isNull, lt, ne, or, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  customers,
  documents,
  engineeringRequests,
  orderItems,
  orders,
  productionOrders,
  productionOperations,
  quotes,
  users,
} from "@/db/schema";
import { resolvePageSize } from "@/lib/ui/pagination";

export async function listOrdersForProduction(input: {
  q?: string;
  status?: string;
  delayed?: boolean;
  page?: number;
  pageSize?: number;
}) {
  const page = Math.max(1, input.page ?? 1);
  const pageSize = resolvePageSize(input.pageSize);
  const filters = [];

  if (input.status) filters.push(eq(orders.status, input.status as any));
  if (input.q) {
    const term = `%${input.q}%`;
    filters.push(
      or(
        ilike(orders.number, term),
        ilike(customers.legalName, term),
        ilike(quotes.number, term),
        ilike(orders.notes, term),
        sql`exists (
          select 1 from production_orders po
          where po.order_id = ${orders.id}
            and (po.part_number ilike ${term} or po.description ilike ${term})
        )`
      )
    );
  }
  if (input.delayed) {
    filters.push(
      and(
        inArray(orders.status, ["pendiente", "aprobado", "en_produccion"]),
        lt(orders.promisedDate, new Date())
      )
    );
  }

  const where = filters.length > 0 ? and(...filters) : undefined;
  const [totalRow] = await db
    .select({ value: count() })
    .from(orders)
    .innerJoin(customers, eq(orders.customerId, customers.id))
    .innerJoin(quotes, eq(orders.quoteId, quotes.id))
    .where(where);

  const total = Number(totalRow.value);
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  const rows = await db
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
      partsTotal: sql<number>`coalesce((
        select count(*)::int from production_orders po
        where po.order_id = ${orders.id}
          and po.status <> 'cancelada'
      ), 0)`,
      partsDone: sql<number>`coalesce((
        select count(*)::int from production_orders po
        where po.order_id = ${orders.id}
          and po.status in ('terminada', 'entregada')
      ), 0)`,
      partsInProduction: sql<number>`coalesce((
        select count(*)::int from production_orders po
        where po.order_id = ${orders.id}
          and po.status = 'en_produccion'
      ), 0)`,
      opsTotal: sql<number>`coalesce((
        select count(*)::int from production_operations po
        inner join production_orders prod on prod.id = po.production_order_id
        where prod.order_id = ${orders.id}
          and po.status <> 'omitida'
      ), 0)`,
      opsDone: sql<number>`coalesce((
        select count(*)::int from production_operations po
        inner join production_orders prod on prod.id = po.production_order_id
        where prod.order_id = ${orders.id}
          and po.status = 'terminada'
      ), 0)`,
    })
    .from(orders)
    .innerJoin(customers, eq(orders.customerId, customers.id))
    .innerJoin(quotes, eq(orders.quoteId, quotes.id))
    .where(where)
    .orderBy(desc(orders.createdAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  return {
    rows: rows.map((row) => ({
      ...row,
      promisedDate: row.promisedDate,
      total: row.total,
    })),
    total,
    page,
    pageCount,
  };
}

export async function listPartsForProduction(input: {
  q?: string;
  status?: string;
  delayed?: boolean;
  page?: number;
  pageSize?: number;
}) {
  const page = Math.max(1, input.page ?? 1);
  const pageSize = resolvePageSize(input.pageSize);
  const filters = [ne(productionOrders.status, "cancelada")];

  if (input.status) filters.push(eq(productionOrders.status, input.status as any));
  if (input.q) {
    const term = `%${input.q}%`;
    const searchFilters = [
      ilike(productionOrders.number, term),
      ilike(productionOrders.partNumber, term),
      ilike(productionOrders.description, term),
      ilike(customers.legalName, term),
      ilike(orders.number, term),
    ];
    const orResult = or(...searchFilters);
    if (orResult) filters.push(orResult);
  }
  if (input.delayed) {
    filters.push(
      lt(productionOrders.promisedDate, new Date()),
      inArray(productionOrders.status, [
        "pendiente", "liberada", "programada", "en_produccion", "pausada", "esperando_material", "calidad",
      ])
    );
  }

  const where = and(...filters);
  const [totalRow] = await db
    .select({ value: count() })
    .from(productionOrders)
    .innerJoin(customers, eq(productionOrders.customerId, customers.id))
    .innerJoin(orders, eq(productionOrders.orderId, orders.id))
    .where(where);

  const total = Number(totalRow.value);
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  const rows = await db
    .select({
      id: productionOrders.id,
      number: productionOrders.number,
      partNumber: productionOrders.partNumber,
      orderId: productionOrders.orderId,
      orderNumber: orders.number,
      customerName: customers.legalName,
      description: productionOrders.description,
      quantity: productionOrders.quantity,
      unit: productionOrders.unit,
      status: productionOrders.status,
      priority: productionOrders.priority,
      promisedDate: productionOrders.promisedDate,
      isDemo: productionOrders.isDemo,
      operationsTotal: sql<number>`coalesce((
        select count(*)::int from production_operations
        where production_order_id = ${productionOrders.id}
          and status <> 'omitida'
      ), 0)`,
      operationsDone: sql<number>`coalesce((
        select count(*)::int from production_operations
        where production_order_id = ${productionOrders.id}
          and status = 'terminada'
      ), 0)`,
      currentOperationName: sql<string | null>`(
        select name from production_operations
        where production_order_id = ${productionOrders.id}
          and status in ('en_proceso', 'pendiente')
        order by case when status = 'en_proceso' then 0 else 1 end, position
        limit 1
      )`,
      currentOperationStatus: sql<string | null>`(
        select status from production_operations
        where production_order_id = ${productionOrders.id}
          and status in ('en_proceso', 'pendiente')
        order by case when status = 'en_proceso' then 0 else 1 end, position
        limit 1
      )`,
    })
    .from(productionOrders)
    .innerJoin(customers, eq(productionOrders.customerId, customers.id))
    .innerJoin(orders, eq(productionOrders.orderId, orders.id))
    .where(where)
    .orderBy(desc(productionOrders.createdAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  return {
    rows,
    total,
    page,
    pageCount,
  };
}
