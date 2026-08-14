import "server-only";

import { desc, like, sql } from "drizzle-orm";
import { db } from "@/db";
import { engineeringRequests, orders, quotes } from "@/db/schema";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

const TABLES = {
  quotes: { table: quotes, column: quotes.number },
  orders: { table: orders, column: orders.number },
  engineering_requests: {
    table: engineeringRequests,
    column: engineeringRequests.number,
  },
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
