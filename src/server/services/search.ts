import "server-only";

import { sql } from "drizzle-orm";
import { db } from "@/db";

export type SearchResultKind =
  | "customer"
  | "quote"
  | "order"
  | "part"
  | "material"
  | "supplier"
  | "invoice"
  | "delivery";

export type SearchResult = {
  kind: SearchResultKind;
  id: string;
  title: string;
  subtitle: string;
  href: string;
};

const KIND_ORDER: Record<SearchResultKind, number> = {
  order: 1,
  part: 2,
  quote: 3,
  customer: 4,
  material: 5,
  supplier: 6,
  invoice: 7,
  delivery: 8,
};

/**
 * Búsqueda global sobre las entidades principales del ERP.
 * Una sola query con UNION ALL, límite por tipo para no saturar.
 */
export async function globalSearch(term: string, limit = 20): Promise<SearchResult[]> {
  const clean = term.trim();
  if (clean.length < 2) return [];
  const pattern = `%${clean}%`;

  const rows = await db.execute<{
    kind: string;
    id: string;
    title: string;
    subtitle: string | null;
  }>(sql`
    (select 'order' as kind, o.id, ('OT-' || o.number) as title,
            c.legal_name as subtitle
     from orders o
     join customers c on c.id = o.customer_id
     where o.number ilike ${pattern}
        or ('OT-' || o.number) ilike ${pattern}
        or c.legal_name ilike ${pattern}
     order by o.created_at desc
     limit 6)

    union all

    (select 'part' as kind, po.id,
            coalesce(po.part_number, po.number) as title,
            (po.description || ' · ' || c.legal_name) as subtitle
     from production_orders po
     join customers c on c.id = po.customer_id
     where po.number ilike ${pattern}
        or po.part_number ilike ${pattern}
        or po.description ilike ${pattern}
     order by po.created_at desc
     limit 6)

    union all

    (select 'quote' as kind, q.id, q.number as title,
            c.legal_name as subtitle
     from quotes q
     join customers c on c.id = q.customer_id
     where q.deleted_at is null
       and (q.number ilike ${pattern} or c.legal_name ilike ${pattern})
     order by q.created_at desc
     limit 6)

    union all

    (select 'customer' as kind, c.id, c.legal_name as title,
            coalesce(c.code, c.city, '') as subtitle
     from customers c
     where c.deleted_at is null
       and (c.legal_name ilike ${pattern}
            or c.trade_name ilike ${pattern}
            or c.code ilike ${pattern}
            or c.rfc ilike ${pattern})
     order by c.legal_name
     limit 6)

    union all

    (select 'material' as kind, m.id, m.description as title,
            m.code as subtitle
     from materials m
     where m.active = true
       and (m.description ilike ${pattern} or m.code ilike ${pattern})
     order by m.code
     limit 5)

    union all

    (select 'supplier' as kind, s.id, s.legal_name as title,
            coalesce(s.code, '') as subtitle
     from suppliers s
     where s.legal_name ilike ${pattern} or s.code ilike ${pattern}
     order by s.legal_name
     limit 5)

    union all

    (select 'invoice' as kind, i.id, i.number as title,
            c.legal_name as subtitle
     from invoices i
     join customers c on c.id = i.customer_id
     where i.number ilike ${pattern}
     order by i.created_at desc
     limit 4)

    union all

    (select 'delivery' as kind, d.id, d.number as title,
            coalesce(d.tracking_number, '') as subtitle
     from deliveries d
     where d.number ilike ${pattern} or d.tracking_number ilike ${pattern}
     order by d.created_at desc
     limit 4)
  `);

  const hrefFor: Record<string, (id: string) => string> = {
    order: (id) => `/orders/${id}`,
    part: (id) => `/production/${id}`,
    quote: (id) => `/quotes/${id}`,
    customer: (id) => `/customers/${id}`,
    material: (id) => `/inventory/materials/${id}`,
    supplier: (id) => `/suppliers/${id}`,
    invoice: (id) => `/billing/${id}`,
    delivery: (id) => `/deliveries/${id}`,
  };

  return rows
    .map((row) => ({
      kind: row.kind as SearchResultKind,
      id: row.id,
      title: row.title,
      subtitle: row.subtitle ?? "",
      href: hrefFor[row.kind]?.(row.id) ?? "/dashboard",
    }))
    .sort((a, b) => KIND_ORDER[a.kind] - KIND_ORDER[b.kind])
    .slice(0, limit);
}
