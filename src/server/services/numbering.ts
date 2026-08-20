import "server-only";

import { desc, like, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  engineeringRequests,
  materials,
  orders,
  productionOrders,
  projects,
  quotes,
  suppliers,
  purchaseOrders,
  purchaseReceipts,
  purchaseRequests,
  qualityInspections,
  ncrs,
  deliveries,
  invoices,
} from "@/db/schema";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

const TABLES = {
  quotes: { table: quotes, column: quotes.number },
  orders: { table: orders, column: orders.number },
  engineering_requests: {
    table: engineeringRequests,
    column: engineeringRequests.number,
  },
  production_orders: {
    table: productionOrders,
    column: productionOrders.number,
  },
  materials: { table: materials, column: materials.code },
  projects: { table: projects, column: projects.code },
  suppliers: { table: suppliers, column: suppliers.code },
  purchase_requests: { table: purchaseRequests, column: purchaseRequests.number },
  purchase_orders: { table: purchaseOrders, column: purchaseOrders.number },
  purchase_receipts: { table: purchaseReceipts, column: purchaseReceipts.number },
  quality_inspections: { table: qualityInspections, column: qualityInspections.number },
  ncrs: { table: ncrs, column: ncrs.number },
  deliveries: { table: deliveries, column: deliveries.number },
  invoices: { table: invoices, column: invoices.number },
} as const;

export async function nextDocumentNumber(
  tx: Tx,
  table: keyof typeof TABLES,
  prefix: string,
) {
  const target = TABLES[table];
  await tx.execute(
    sql`lock table ${sql.raw(table)} in share row exclusive mode`,
  );
  const [row] = await tx
    .select({ number: target.column })
    .from(target.table)
    .where(like(target.column, `${prefix}%`))
    .orderBy(desc(target.column))
    .limit(1);
  const last = row?.number?.slice(prefix.length) ?? "";
  const next = (last && /^\d+$/.test(last) ? Number(last) : 0) + 1;
  return `${prefix}${String(next).padStart(5, "0")}`;
}
