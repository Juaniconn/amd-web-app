import { config } from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { sql } from "drizzle-orm";

config({ path: ".env.local" });

async function wipeAndReset() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");

  const client = postgres(url, { max: 1 });
  const db = drizzle(client);

  console.log("🧹 Limpiando datos anteriores...");
  await db.execute(sql`TRUNCATE TABLE 
    invoice_payments, invoice_items, invoices, deliveries, ncrs, quality_inspections,
    purchase_receipt_items, purchase_receipts, purchase_order_items, purchase_orders,
    purchase_request_items, purchase_requests, inventory_movements, production_order_materials,
    labor_hours, machine_hours, production_downtime, production_rework, production_operations,
    production_orders, documents, engineering_hours, engineering_requests, order_items, orders,
    quote_items, quotes, projects, contacts, customers, activity_logs RESTART IDENTITY CASCADE`);
  await db.execute(sql`DELETE FROM inventory_balances`);
  await db.execute(sql`DELETE FROM materials`);
  await db.execute(sql`DELETE FROM supplier_materials`);
  await db.execute(sql`DELETE FROM suppliers`);
  console.log("✓ Datos limpios\n");

  await client.end({ timeout: 5 });
}

wipeAndReset().catch((error) => {
  console.error(error);
  process.exit(1);
});
