import { sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

/** Borra datos operativos. Conserva usuarios, RBAC, sucursales, catálogos de planta y partidas de calculadora. */
export async function wipeOperationalData(db: PostgresJsDatabase) {
  await db.execute(sql`
    TRUNCATE TABLE
      invoice_payments,
      invoice_items,
      invoices,
      deliveries,
      ncrs,
      quality_inspections,
      purchase_receipt_items,
      purchase_receipts,
      purchase_order_items,
      purchase_orders,
      purchase_request_items,
      purchase_requests,
      inventory_movements,
      production_order_materials,
      labor_hours,
      machine_hours,
      production_downtime,
      production_rework,
      production_operations,
      production_orders,
      documents,
      engineering_hours,
      engineering_requests,
      order_items,
      orders,
      quote_items,
      quotes,
      projects,
      contacts,
      customers,
      activity_logs
    RESTART IDENTITY CASCADE
  `);
  await db.execute(sql`
    DELETE FROM inventory_balances
  `);
  await db.execute(sql`DELETE FROM materials`);
  await db.execute(sql`DELETE FROM supplier_materials`);
  await db.execute(sql`DELETE FROM suppliers`);
  console.log("Wiped operational data (customers through invoices). Catalogs of calculator reseeds next.");
}
