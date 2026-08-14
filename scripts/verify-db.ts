import { config } from "dotenv";
import postgres from "postgres";
import { verifyPassword } from "better-auth/crypto";

config({ path: ".env.local" });
config();

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");

  const sql = postgres(url, { max: 1 });
  try {
    const users = await sql<{ email: string; name: string }[]>`
      SELECT email, name FROM users
    `;
    const roles = await sql<{ id: string }[]>`
      SELECT id FROM roles ORDER BY id
    `;
    const permissions = await sql<{ n: number }[]>`
      SELECT count(*)::int AS n FROM permissions
    `;
    const customerCounts = await sql<{ n: number; active: number }[]>`
      SELECT
        count(*)::int AS n,
        count(*) FILTER (WHERE deleted_at IS NULL AND status = 'activo')::int AS active
      FROM customers
    `;
    const contactCount = await sql<{ n: number }[]>`
      SELECT count(*)::int AS n FROM contacts WHERE deleted_at IS NULL
    `;
    const activityCount = await sql<{ n: number }[]>`
      SELECT count(*)::int AS n FROM activity_logs
    `;
    const quoteCount = await sql<{ n: number }[]>`
      SELECT count(*)::int AS n FROM quotes WHERE deleted_at IS NULL
    `;
    const quoteItemCount = await sql<{ n: number }[]>`
      SELECT count(*)::int AS n FROM quote_items
    `;
    const documentCount = await sql<{ n: number }[]>`
      SELECT count(*)::int AS n FROM documents
    `;
    const orderCount = await sql<{ n: number }[]>`
      SELECT count(*)::int AS n FROM orders
    `;
    const accounts = await sql<{ password: string }[]>`
      SELECT password FROM accounts WHERE provider_id = 'credential'
    `;

    console.log("users:", users);
    console.log("roles:", roles.map((row) => row.id).join(", "));
    console.log("permissions:", permissions[0]?.n);
    console.log("customers:", customerCounts[0]?.n, "active:", customerCounts[0]?.active);
    console.log("contacts:", contactCount[0]?.n);
    console.log("activity_logs:", activityCount[0]?.n);
    console.log("quotes:", quoteCount[0]?.n);
    console.log("quote_items:", quoteItemCount[0]?.n);
    console.log("documents:", documentCount[0]?.n);
    console.log("orders:", orderCount[0]?.n);
    console.log("credential accounts:", accounts.length);

    const password = process.env.SEED_ADMIN_PASSWORD;
    if (!password || !accounts[0]?.password) {
      throw new Error("Cannot verify admin password hash");
    }

    const valid = await verifyPassword({
      password,
      hash: accounts[0].password,
    });
    console.log("admin password hash valid:", valid);
    if (!valid) {
      process.exitCode = 1;
    }
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
