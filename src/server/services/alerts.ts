import "server-only";

import { sql } from "drizzle-orm";
import { db } from "@/db";

export type AlertTone = "urgent" | "warning" | "info" | "success";

export type Alert = {
  id: string;
  tone: AlertTone;
  title: string;
  description: string;
  href: string;
  sortKey: number;
};

type AlertRow = {
  kind: string;
  entity_id: string;
  label: string;
  detail: string | null;
  days: number | null;
};

/**
 * Alertas reales del negocio, ordenadas por severidad.
 * Cada fila apunta a una entidad concreta con su link de resolución.
 */
export async function getAlerts(limit = 30): Promise<Alert[]> {
  const rows = await db.execute<AlertRow>(sql`
    -- Números de parte atrasados
    select
      'part_delayed' as kind,
      po.id as entity_id,
      coalesce(po.part_number, po.number) as label,
      c.legal_name as detail,
      extract(day from now() - po.promised_date)::int as days
    from production_orders po
    join customers c on c.id = po.customer_id
    where po.status not in ('terminada','entregada','cancelada')
      and po.promised_date < now()

    union all

    -- OT atrasadas
    select
      'order_delayed' as kind,
      o.id as entity_id,
      o.number as label,
      c.legal_name as detail,
      extract(day from now() - o.promised_date)::int as days
    from orders o
    join customers c on c.id = o.customer_id
    where o.status in ('pendiente','aprobado','en_produccion')
      and o.promised_date is not null
      and o.promised_date < now()

    union all

    -- Máquinas fuera de servicio o en mantenimiento
    select
      'machine_down' as kind,
      m.id as entity_id,
      m.name as label,
      m.status::text as detail,
      null::int as days
    from machines m
    where m.active = true
      and m.status in ('mantenimiento','fuera_de_servicio')

    union all

    -- Material bajo mínimo
    select
      'material_low' as kind,
      m.id as entity_id,
      m.description as label,
      m.code as detail,
      null::int as days
    from materials m
    where m.active = true
      and m.min_stock is not null
      and coalesce((
        select sum(b.on_hand) from inventory_balances b where b.material_id = m.id
      ), 0) < m.min_stock

    union all

    -- Facturas vencidas
    select
      'invoice_overdue' as kind,
      i.id as entity_id,
      i.number as label,
      c.legal_name as detail,
      extract(day from now() - i.due_date)::int as days
    from invoices i
    join customers c on c.id = i.customer_id
    where i.status in ('emitida','parcial')
      and i.due_date < now()

    union all

    -- Entregas con incidencia
    select
      'delivery_incident' as kind,
      d.id as entity_id,
      d.number as label,
      c.legal_name as detail,
      null::int as days
    from deliveries d
    join orders o on o.id = d.order_id
    join customers c on c.id = o.customer_id
    where d.status = 'incidencia'

    union all

    -- OC urgentes pendientes
    select
      'po_urgent' as kind,
      p.id as entity_id,
      p.number as label,
      s.legal_name as detail,
      null::int as days
    from purchase_orders p
    join suppliers s on s.id = p.supplier_id
    where p.is_urgent = true
      and p.status in ('borrador','enviada','confirmada','parcial')

    union all

    -- Inspecciones rechazadas
    select
      'inspection_rejected' as kind,
      qi.id as entity_id,
      qi.number as label,
      coalesce(po.part_number, po.number) as detail,
      null::int as days
    from quality_inspections qi
    join production_orders po on po.id = qi.production_order_id
    where qi.result = 'rechazado'

    union all

    -- Cotizaciones por vencer (7 días)
    select
      'quote_expiring' as kind,
      q.id as entity_id,
      q.number as label,
      c.legal_name as detail,
      extract(day from q.valid_until - now())::int as days
    from quotes q
    join customers c on c.id = q.customer_id
    where q.deleted_at is null
      and q.status = 'enviada'
      and q.valid_until is not null
      and q.valid_until between now() and now() + interval '7 days'

    union all

    -- Números de parte sin operador asignado y ya liberados
    select
      'part_unassigned' as kind,
      po.id as entity_id,
      coalesce(po.part_number, po.number) as label,
      c.legal_name as detail,
      null::int as days
    from production_orders po
    join customers c on c.id = po.customer_id
    where po.operator_user_id is null
      and po.status in ('liberada','programada')

    limit ${limit}
  `);

  const alerts: Alert[] = rows.map((row) => {
    const days = row.days ?? 0;
    switch (row.kind) {
      case "part_delayed":
        return {
          id: `part_delayed:${row.entity_id}`,
          tone: "urgent",
          title: `${row.label} atrasado`,
          description: `${row.detail ?? ""} · ${days} ${days === 1 ? "día" : "días"} de retraso`,
          href: `/production/${row.entity_id}`,
          sortKey: 100 + days,
        };
      case "order_delayed":
        return {
          id: `order_delayed:${row.entity_id}`,
          tone: "urgent",
          title: `OT ${row.label} atrasada`,
          description: `${row.detail ?? ""} · ${days} ${days === 1 ? "día" : "días"} de retraso`,
          href: `/orders/${row.entity_id}`,
          sortKey: 95 + days,
        };
      case "invoice_overdue":
        return {
          id: `invoice_overdue:${row.entity_id}`,
          tone: "urgent",
          title: `Factura ${row.label} vencida`,
          description: `${row.detail ?? ""} · ${days} ${days === 1 ? "día" : "días"} vencida`,
          href: `/billing/${row.entity_id}`,
          sortKey: 90 + days,
        };
      case "machine_down":
        return {
          id: `machine_down:${row.entity_id}`,
          tone: "urgent",
          title: `${row.label} detenida`,
          description:
            row.detail === "fuera_de_servicio" ? "Fuera de servicio" : "En mantenimiento",
          href: `/machines/${row.entity_id}`,
          sortKey: 85,
        };
      case "delivery_incident":
        return {
          id: `delivery_incident:${row.entity_id}`,
          tone: "urgent",
          title: `Incidencia en entrega ${row.label}`,
          description: row.detail ?? "",
          href: `/deliveries/${row.entity_id}`,
          sortKey: 80,
        };
      case "inspection_rejected":
        return {
          id: `inspection_rejected:${row.entity_id}`,
          tone: "urgent",
          title: `Inspección ${row.label} rechazada`,
          description: row.detail ?? "",
          href: `/quality/${row.entity_id}`,
          sortKey: 75,
        };
      case "material_low":
        return {
          id: `material_low:${row.entity_id}`,
          tone: "warning",
          title: `${row.label} bajo mínimo`,
          description: `Código ${row.detail ?? "—"} · requiere compra`,
          href: "/inventory?critical=1",
          sortKey: 60,
        };
      case "po_urgent":
        return {
          id: `po_urgent:${row.entity_id}`,
          tone: "warning",
          title: `OC ${row.label} urgente`,
          description: `${row.detail ?? ""} · pendiente de recibir`,
          href: `/purchasing/${row.entity_id}`,
          sortKey: 55,
        };
      case "part_unassigned":
        return {
          id: `part_unassigned:${row.entity_id}`,
          tone: "warning",
          title: `${row.label} sin operador`,
          description: `${row.detail ?? ""} · liberado sin asignar`,
          href: `/production/${row.entity_id}`,
          sortKey: 50,
        };
      case "quote_expiring":
      default:
        return {
          id: `quote_expiring:${row.entity_id}`,
          tone: "info",
          title: `Cotización ${row.label} por vencer`,
          description: `${row.detail ?? ""} · vence en ${days} ${days === 1 ? "día" : "días"}`,
          href: `/quotes/${row.entity_id}`,
          sortKey: 30,
        };
    }
  });

  return alerts.sort((a, b) => b.sortKey - a.sortKey);
}
