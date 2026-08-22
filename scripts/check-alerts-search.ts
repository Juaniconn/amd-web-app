import { config } from "dotenv";
import postgres from "postgres";

config({ path: [".env.local", ".env"], quiet: true });

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL no definida");
  process.exit(1);
}
const client = postgres(url, { max: 1 });

async function checkAlerts() {
  const rows = await client`
    select 'part_delayed' as kind, po.id as entity_id,
      coalesce(po.part_number, po.number) as label, c.legal_name as detail,
      extract(day from now() - po.promised_date)::int as days
    from production_orders po join customers c on c.id = po.customer_id
    where po.status not in ('terminada','entregada','cancelada') and po.promised_date < now()
    union all
    select 'order_delayed', o.id, o.number, c.legal_name,
      extract(day from now() - o.promised_date)::int
    from orders o join customers c on c.id = o.customer_id
    where o.status in ('pendiente','aprobado','en_produccion')
      and o.promised_date is not null and o.promised_date < now()
    union all
    select 'machine_down', m.id, m.name, m.status::text, null::int
    from machines m where m.active = true and m.status in ('mantenimiento','fuera_de_servicio')
    union all
    select 'material_low', m.id, m.description, m.code, null::int
    from materials m where m.active = true and m.min_stock is not null
      and coalesce((select sum(b.on_hand) from inventory_balances b where b.material_id = m.id), 0) < m.min_stock
    union all
    select 'invoice_overdue', i.id, i.number, c.legal_name,
      extract(day from now() - i.due_date)::int
    from invoices i join customers c on c.id = i.customer_id
    where i.status in ('emitida','parcial') and i.due_date < now()
    union all
    select 'delivery_incident', d.id, d.number, c.legal_name, null::int
    from deliveries d join orders o on o.id = d.order_id join customers c on c.id = o.customer_id
    where d.status = 'incidencia'
    union all
    select 'po_urgent', p.id, p.number, s.legal_name, null::int
    from purchase_orders p join suppliers s on s.id = p.supplier_id
    where p.is_urgent = true and p.status in ('borrador','enviada','confirmada','parcial')
    union all
    select 'inspection_rejected', qi.id, qi.number, coalesce(po.part_number, po.number), null::int
    from quality_inspections qi join production_orders po on po.id = qi.production_order_id
    where qi.result = 'rechazado'
    union all
    select 'quote_expiring', q.id, q.number, c.legal_name,
      extract(day from q.valid_until - now())::int
    from quotes q join customers c on c.id = q.customer_id
    where q.deleted_at is null and q.status = 'enviada' and q.valid_until is not null
      and q.valid_until between now() and now() + interval '7 days'
    union all
    select 'part_unassigned', po.id, coalesce(po.part_number, po.number), c.legal_name, null::int
    from production_orders po join customers c on c.id = po.customer_id
    where po.operator_user_id is null and po.status in ('liberada','programada')
    limit 30
  `;
  console.log(`=== ALERTAS: ${rows.length} encontradas ===`);
  const byKind = rows.reduce<Record<string, number>>((acc, r) => {
    acc[r.kind] = (acc[r.kind] ?? 0) + 1;
    return acc;
  }, {});
  for (const [kind, count] of Object.entries(byKind)) {
    console.log(`  ${kind.padEnd(22)} ${count}`);
  }
  console.log("\n  Ejemplos:");
  for (const r of rows.slice(0, 5)) {
    console.log(`   [${r.kind}] ${r.label} — ${r.detail ?? ""}${r.days !== null ? ` (${r.days}d)` : ""}`);
  }
}

async function checkSearch(term: string) {
  const pattern = `%${term}%`;
  const rows = await client`
    (select 'order' as kind, o.id, ('OT-' || o.number) as title, c.legal_name as subtitle
     from orders o join customers c on c.id = o.customer_id
     where o.number ilike ${pattern} or ('OT-' || o.number) ilike ${pattern} or c.legal_name ilike ${pattern}
     order by o.created_at desc limit 6)
    union all
    (select 'part', po.id, coalesce(po.part_number, po.number), (po.description || ' · ' || c.legal_name)
     from production_orders po join customers c on c.id = po.customer_id
     where po.number ilike ${pattern} or po.part_number ilike ${pattern} or po.description ilike ${pattern}
     order by po.created_at desc limit 6)
    union all
    (select 'quote', q.id, q.number, c.legal_name
     from quotes q join customers c on c.id = q.customer_id
     where q.deleted_at is null and (q.number ilike ${pattern} or c.legal_name ilike ${pattern})
     order by q.created_at desc limit 6)
    union all
    (select 'customer', c.id, c.legal_name, coalesce(c.code, c.city, '')
     from customers c where c.deleted_at is null
       and (c.legal_name ilike ${pattern} or c.trade_name ilike ${pattern} or c.code ilike ${pattern} or c.rfc ilike ${pattern})
     order by c.legal_name limit 6)
    union all
    (select 'material', m.id, m.description, m.code
     from materials m where m.active = true and (m.description ilike ${pattern} or m.code ilike ${pattern})
     order by m.code limit 5)
    union all
    (select 'supplier', s.id, s.legal_name, coalesce(s.code, '')
     from suppliers s where s.legal_name ilike ${pattern} or s.code ilike ${pattern}
     order by s.legal_name limit 5)
    union all
    (select 'invoice', i.id, i.number, c.legal_name
     from invoices i join customers c on c.id = i.customer_id
     where i.number ilike ${pattern} order by i.created_at desc limit 4)
    union all
    (select 'delivery', d.id, d.number, coalesce(d.tracking_number, '')
     from deliveries d where d.number ilike ${pattern} or d.tracking_number ilike ${pattern}
     order by d.created_at desc limit 4)
  `;
  console.log(`\n=== BUSQUEDA "${term}": ${rows.length} resultados ===`);
  for (const r of rows.slice(0, 10)) {
    console.log(`   [${r.kind.padEnd(9)}] ${r.title} — ${r.subtitle ?? ""}`);
  }
}

async function main() {
  await checkAlerts();
  await checkSearch("Bravo");
  await checkSearch("AMD-FX");
  await client.end();
  process.exit(0);
}

main().catch(async (err) => {
  console.error("ERROR SQL:", err.message);
  await client.end().catch(() => {});
  process.exit(1);
});
