/**
 * Verifica que el password 'operador123' realmente valide contra el hash
 * guardado en accounts, usando la misma funcion que Better Auth usa al login.
 */
import { config } from "dotenv";
import postgres from "postgres";
import { verifyPassword } from "better-auth/crypto";

config({ path: [".env.local", ".env"], quiet: true });

const client = postgres(process.env.DATABASE_URL!, { max: 1 });

async function main() {
  const rows = await client`
    select u.email, u.name, a.password
    from users u
    join accounts a on a.user_id = u.id and a.provider_id = 'credential'
    join user_roles ur on ur.user_id = u.id
    where ur.role_id = 'produccion'
    order by u.email
  `;

  console.log("=== VERIFICACION DE LOGIN (hash real) ===\n");
  let allOk = true;
  for (const r of rows) {
    const ok = await verifyPassword({
      hash: r.password,
      password: "operador123",
    });
    if (!ok) allOk = false;
    console.log(`  ${ok ? "OK   " : "FALLO"} ${r.email.padEnd(38)} ${r.name}`);
  }

  console.log(
    `\n${allOk ? "Todas las cuentas validan con 'operador123'." : "Hay cuentas que NO validan."}`,
  );

  await client.end();
  process.exit(allOk ? 0 : 1);
}

main().catch(async (e) => {
  console.error("ERROR:", e.message);
  await client.end().catch(() => {});
  process.exit(1);
});
