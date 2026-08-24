import { config } from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { sql } from "drizzle-orm";

config({ path: ".env.local" });

async function verify() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");

  const client = postgres(url, { max: 1 });
  const db = drizzle(client);

  const customers = await db.execute(sql`SELECT count(*) as count FROM customers`);
  const quotes = await db.execute(sql`SELECT count(*) as count FROM quotes`);
  const orders = await db.execute(sql`SELECT count(*) as count FROM orders`);
  const productionOrders = await db.execute(sql`SELECT count(*) as count FROM production_orders`);

  console.log("Clientes:", customers[0].count);
  console.log("Quotes:", quotes[0].count);
  console.log("Orders:", orders[0].count);
  console.log("Production Orders:", productionOrders[0].count);

  const sampleOT = await db.execute(
    sql`SELECT number, description, status, branch_id FROM production_orders LIMIT 5`
  );
  console.log("\nMuestra de OTs:");
  for (const row of sampleOT) {
    console.log("  ", row.number, "-", row.description, "-", row.status, "-", row.branch_id);
  }

  await client.end({ timeout: 5 });
}

verify().catch(console.error);
