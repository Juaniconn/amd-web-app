import { config } from "dotenv";
import postgres from "postgres";

config({ path: [".env.local", ".env"], quiet: true });

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL no está definida en .env.local ni .env");
  process.exit(1);
}

const client = postgres(url, { max: 1 });

async function main() {
  const rows = await client`
    select
      (select count(*)::int from quotes where deleted_at is null) as quotes_total,
      (select count(*)::int from quotes
        where deleted_at is null
          and status in ('borrador','en_revision','enviada')) as quotes_open,
      (select count(*)::int from quotes
        where deleted_at is null
          and status = 'enviada'
          and valid_until is not null
          and valid_until between now() and now() + interval '7 days') as quotes_expiring,
      (select count(*)::int from orders) as orders_total,
      (select count(*)::int from orders
        where status in ('pendiente','aprobado','en_produccion')) as orders_active,
      (select count(*)::int from orders
        where status in ('pendiente','aprobado','en_produccion')
          and promised_date is not null
          and promised_date < now()) as orders_delayed,
      (select count(*)::int from customers where deleted_at is null) as customers_total,
      (select count(*)::int from customers
        where deleted_at is null
          and created_at >= date_trunc('month', now())) as customers_new,
      (select count(*)::int from production_orders) as parts_total,
      (select count(*)::int from production_orders
        where status in ('pendiente','liberada','programada','en_produccion','pausada','esperando_material','calidad')) as parts_active,
      (select count(*)::int from production_orders
        where priority = 'urgente'
          and status not in ('terminada','entregada','cancelada')) as parts_urgent,
      (select count(*)::int from production_orders
        where status = 'en_produccion') as parts_in_production,
      (select count(*)::int from production_orders
        where status not in ('terminada','entregada','cancelada')
          and promised_date < now()) as parts_delayed,
      (select count(*)::int from production_orders
        where status = 'calidad') as parts_in_quality,
      (select count(*)::int from production_operations
        where status = 'en_proceso') as ops_in_progress,
      (select count(*)::int from machines where active = true) as machines_total,
      (select count(*)::int from machines
        where active = true and status in ('en_produccion','ocupada')) as machines_busy,
      (select count(*)::int from machines
        where active = true and status in ('mantenimiento','fuera_de_servicio')) as machines_down,
      (select count(*)::int from materials where active = true) as materials_total,
      (select count(*)::int from materials
        where active = true and is_critical = true) as materials_critical,
      (select count(*)::int from materials m
        where m.active = true
          and m.min_stock is not null
          and coalesce((
            select sum(b.on_hand) from inventory_balances b where b.material_id = m.id
          ), 0) < m.min_stock) as materials_low,
      (select count(*)::int from purchase_orders
        where status in ('borrador','enviada','confirmada','parcial')) as po_open,
      (select count(*)::int from purchase_orders
        where is_urgent = true
          and status in ('borrador','enviada','confirmada','parcial')) as po_urgent,
      (select count(*)::int from purchase_orders
        where status in ('enviada','confirmada','parcial')) as po_pending_receive,
      (select count(*)::int from suppliers where status = 'activo') as suppliers_total,
      (select count(*)::int from deliveries
        where status in ('pendiente','preparando','enviado')) as deliveries_transit,
      (select count(*)::int from deliveries
        where status = 'incidencia') as deliveries_incidents,
      (select count(*)::int from invoices
        where status in ('emitida','parcial')) as invoices_open,
      (select count(*)::int from invoices
        where status in ('emitida','parcial')
          and due_date < now()) as invoices_overdue,
      (select coalesce(sum(total::numeric - coalesce(paid_total::numeric, 0)), 0)::text from invoices
        where status in ('emitida','parcial')
          and due_date < now()) as receivable_overdue,
      (select count(*)::int from engineering_requests
        where deleted_at is null
          and status not in ('liberado','cancelado')) as eng_open,
      (select count(*)::int from engineering_requests
        where deleted_at is null
          and status = 'liberado') as eng_released
  `;

  console.log("=== QUERY OK - datos reales de la base ===\n");
  for (const [key, value] of Object.entries(rows[0] ?? {})) {
    console.log(`  ${key.padEnd(24)} ${value}`);
  }
  await client.end();
  process.exit(0);
}

main().catch(async (err) => {
  console.error("ERROR SQL:", err.message);
  await client.end().catch(() => {});
  process.exit(1);
});
