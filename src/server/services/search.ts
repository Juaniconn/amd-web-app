import "server-only";

import { sql } from "drizzle-orm";
import { db } from "@/db";
import {
  customers,
  orders,
  productionOrders,
  quotes,
} from "@/db/schema";

export type SearchResultKind =
  | "customer"
  | "quote"
  | "order"
  | "part";

export type SearchResult = {
  kind: SearchResultKind;
  id: string;
  title: string;
  subtitle: string;
};

export async function globalSearch(
  query: string,
  limit = 10,
): Promise<SearchResult[]> {
  const q = `%${query.trim()}%`;
  if (!query.trim()) return [];

  const [customerResults, quoteResults, orderResults, partResults] =
    await Promise.all([
      db
        .select({
          id: customers.id,
          legalName: customers.legalName,
          tradeName: customers.tradeName,
          code: customers.code,
        })
        .from(customers)
        .where(sql`${customers.legalName} ILIKE ${q} OR ${customers.code} ILIKE ${q}`)
        .limit(limit),
      db
        .select({
          id: quotes.id,
          number: quotes.number,
        })
        .from(quotes)
        .where(sql`${quotes.number} ILIKE ${q}`)
        .limit(limit),
      db
        .select({
          id: orders.id,
          number: orders.number,
        })
        .from(orders)
        .where(sql`${orders.number} ILIKE ${q}`)
        .limit(limit),
      db
        .select({
          id: productionOrders.id,
          number: productionOrders.number,
          partNumber: productionOrders.partNumber,
          description: productionOrders.description,
        })
        .from(productionOrders)
        .where(
          sql`${productionOrders.number} ILIKE ${q} OR ${productionOrders.partNumber} ILIKE ${q}`,
        )
        .limit(limit),
    ]);

  const results: SearchResult[] = [
    ...customerResults.map((c) => ({
      kind: "customer" as const,
      id: c.id,
      title: c.tradeName || c.legalName,
      subtitle: c.code ? `Cliente · ${c.code}` : "Cliente",
    })),
    ...quoteResults.map((q) => ({
      kind: "quote" as const,
      id: q.id,
      title: q.number,
      subtitle: "Cotización",
    })),
    ...orderResults.map((o) => ({
      kind: "order" as const,
      id: o.id,
      title: o.number,
      subtitle: "OT",
    })),
    ...partResults.map((p) => ({
      kind: "part" as const,
      id: p.id,
      title: p.partNumber || p.number,
      subtitle: p.description ? `Parte · ${p.description}` : "Parte",
    })),
  ];

  return results.slice(0, limit);
}
