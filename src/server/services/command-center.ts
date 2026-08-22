import "server-only";

import { sql } from "drizzle-orm";
import { db } from "@/db";

export type CommandCenterData = {
  ventas: {
    quotesTotal: number;
    quotesOpen: number;
    quotesExpiringSoon: number;
    ordersTotal: number;
    ordersActive: number;
    ordersDelayed: number;
    customersTotal: number;
    customersNewThisMonth: number;
  };
  produccion: {
    partsTotal: number;
    partsActive: number;
    partsUrgent: number;
    partsInProduction: number;
    partsDelayed: number;
    partsInQuality: number;
    opsInProgress: number;
    machinesTotal: number;
    machinesBusy: number;
    machinesDown: number;
  };
  inventario: {
    materialsTotal: number;
    materialsCritical: number;
    materialsLowStock: number;
  };
  compras: {
    poOpen: number;
    poUrgent: number;
    poPendingReceive: number;
    suppliersTotal: number;
  };
  logistica: {
    deliveriesInTransit: number;
    deliveriesIncidents: number;
    invoicesOpen: number;
    invoicesOverdue: number;
    receivableOverdue: number;
  };
  ingenieria: {
    requestsOpen: number;
    requestsReleased: number;
  };
};

/**
 * Centro de Operaciones: una sola llamada a la base con todos los KPIs
 * agregados por sección. Cada valor es un scalar subquery, así que Postgres
 * lo resuelve en un solo round-trip.
 */
export async function getCommandCenterData(): Promise<CommandCenterData> {
  const [row] = await db.execute<{
    quotes_total: number;
    quotes_open: number;
    quotes_expiring: number;
    orders_total: number;
    orders_active: number;
    orders_delayed: number;
    customers_total: number;
    customers_new: number;
    parts_total: number;
    parts_active: number;
    parts_urgent: number;
    parts_in_production: number;
    parts_delayed: number;
    parts_in_quality: number;
    ops_in_progress: number;
    machines_total: number;
    machines_busy: number;
    machines_down: number;
    materials_total: number;
    materials_critical: number;
    materials_low: number;
    po_open: number;
    po_urgent: number;
    po_pending_receive: number;
    suppliers_total: number;
    deliveries_transit: number;
    deliveries_incidents: number;
    invoices_open: number;
    invoices_overdue: number;
    receivable_overdue: string | null;
    eng_open: number;
    eng_released: number;
  }>(sql`
    select
      -- VENTAS
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

      -- PRODUCCIÓN
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

      -- INVENTARIO
      (select count(*)::int from materials where active = true) as materials_total,
      (select count(*)::int from materials
        where active = true and is_critical = true) as materials_critical,
      (select count(*)::int from materials m
        where m.active = true
          and m.min_stock is not null
          and coalesce((
            select sum(b.on_hand) from inventory_balances b where b.material_id = m.id
          ), 0) < m.min_stock) as materials_low,

      -- COMPRAS
      (select count(*)::int from purchase_orders
        where status in ('borrador','enviada','confirmada','parcial')) as po_open,
      (select count(*)::int from purchase_orders
        where is_urgent = true
          and status in ('borrador','enviada','confirmada','parcial')) as po_urgent,
      (select count(*)::int from purchase_orders
        where status in ('enviada','confirmada','parcial')) as po_pending_receive,
      (select count(*)::int from suppliers where status = 'activo') as suppliers_total,

      -- LOGÍSTICA
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

      -- INGENIERÍA
      (select count(*)::int from engineering_requests
        where deleted_at is null
          and status not in ('liberado','cancelado')) as eng_open,
      (select count(*)::int from engineering_requests
        where deleted_at is null
          and status = 'liberado') as eng_released
  `);

  const n = (v: unknown) => Number(v ?? 0);

  return {
    ventas: {
      quotesTotal: n(row?.quotes_total),
      quotesOpen: n(row?.quotes_open),
      quotesExpiringSoon: n(row?.quotes_expiring),
      ordersTotal: n(row?.orders_total),
      ordersActive: n(row?.orders_active),
      ordersDelayed: n(row?.orders_delayed),
      customersTotal: n(row?.customers_total),
      customersNewThisMonth: n(row?.customers_new),
    },
    produccion: {
      partsTotal: n(row?.parts_total),
      partsActive: n(row?.parts_active),
      partsUrgent: n(row?.parts_urgent),
      partsInProduction: n(row?.parts_in_production),
      partsDelayed: n(row?.parts_delayed),
      partsInQuality: n(row?.parts_in_quality),
      opsInProgress: n(row?.ops_in_progress),
      machinesTotal: n(row?.machines_total),
      machinesBusy: n(row?.machines_busy),
      machinesDown: n(row?.machines_down),
    },
    inventario: {
      materialsTotal: n(row?.materials_total),
      materialsCritical: n(row?.materials_critical),
      materialsLowStock: n(row?.materials_low),
    },
    compras: {
      poOpen: n(row?.po_open),
      poUrgent: n(row?.po_urgent),
      poPendingReceive: n(row?.po_pending_receive),
      suppliersTotal: n(row?.suppliers_total),
    },
    logistica: {
      deliveriesInTransit: n(row?.deliveries_transit),
      deliveriesIncidents: n(row?.deliveries_incidents),
      invoicesOpen: n(row?.invoices_open),
      invoicesOverdue: n(row?.invoices_overdue),
      receivableOverdue: n(row?.receivable_overdue),
    },
    ingenieria: {
      requestsOpen: n(row?.eng_open),
      requestsReleased: n(row?.eng_released),
    },
  };
}
