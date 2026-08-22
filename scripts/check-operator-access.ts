/**
 * Verifica la separacion de roles: Operador vs Jefe de Produccion.
 * Compara permisos reales de la base para ambos perfiles.
 */
import { config } from "dotenv";
import postgres from "postgres";

config({ path: [".env.local", ".env"], quiet: true });

const client = postgres(process.env.DATABASE_URL!, { max: 1 });

const CHECKS: Array<[string, string]> = [
  ["production:my_work", "Ver y cerrar SUS procesos"],
  ["production:view", "Ver toda la produccion (expone clientes)"],
  ["production:create", "Crear numeros de parte"],
  ["production:schedule", "Programar produccion"],
  ["production:assign_operator", "Asignar operadores"],
  ["production:assign_machine", "Asignar maquinas"],
  ["production:cancel", "Cancelar numeros de parte"],
  ["dashboard:read", "Dashboard con KPIs"],
  ["orders:view", "Ordenes de Trabajo"],
  ["customers:read", "Clientes"],
  ["quotes:read", "Cotizaciones y costos"],
  ["billing:read", "Facturacion"],
  ["inventory:read", "Inventario"],
];

async function permsOf(email: string) {
  const rows = await client`
    select distinct p.id
    from users u
    join user_roles ur on ur.user_id = u.id
    join role_permissions rp on rp.role_id = ur.role_id
    join permissions p on p.id = rp.permission_id
    where u.email = ${email}
  `;
  return new Set(rows.map((r) => r.id as string));
}

async function main() {
  const opEmail = "maria.lopez@amd-demo.local";
  const bossEmail = "ramiro.sanchez@amd-demo.local";

  const op = await permsOf(opEmail);
  const boss = await permsOf(bossEmail);

  console.log("=== OPERADOR vs JEFE DE PRODUCCION ===\n");
  console.log(`  Operador: Maria Lopez (${op.size} permisos)`);
  console.log(`  Jefe:     Ramiro Sanchez (${boss.size} permisos)\n`);
  console.log(`  ${"CAPACIDAD".padEnd(42)} OPERADOR   JEFE`);
  console.log(`  ${"-".repeat(42)} --------   ----`);
  for (const [perm, label] of CHECKS) {
    const o = op.has(perm) ? "SI" : "no";
    const b = boss.has(perm) ? "SI" : "no";
    console.log(`  ${label.padEnd(42)} ${o.padEnd(10)} ${b}`);
  }

  // Reglas que deben cumplirse
  const rules: Array<[boolean, string]> = [
    [op.has("production:my_work"), "operador puede ver y cerrar sus procesos"],
    [!op.has("production:view"), "operador NO ve el listado general de produccion"],
    [!op.has("production:create"), "operador NO puede crear numeros de parte"],
    [!op.has("production:assign_operator"), "operador NO puede asignar operadores"],
    [!op.has("production:schedule"), "operador NO puede programar"],
    [!op.has("customers:read"), "operador NO ve clientes"],
    [!op.has("quotes:read"), "operador NO ve cotizaciones ni costos"],
    [!op.has("billing:read"), "operador NO ve facturacion"],
    [!op.has("dashboard:read"), "operador NO entra al dashboard de KPIs"],
    [boss.has("production:create"), "jefe SI puede crear numeros de parte"],
    [boss.has("production:assign_operator"), "jefe SI puede asignar operadores"],
    [boss.has("production:view"), "jefe SI ve toda la produccion"],
    [boss.has("dashboard:read"), "jefe SI entra al dashboard"],
    [!boss.has("quotes:read"), "jefe NO ve cotizaciones ni costos"],
    [!boss.has("billing:read"), "jefe NO ve facturacion"],
  ];

  console.log("\n=== VALIDACIONES ===");
  let allOk = true;
  for (const [ok, label] of rules) {
    if (!ok) allOk = false;
    console.log(`  ${ok ? "OK   " : "FALLO"} ${label}`);
  }

  console.log(
    `\n${allOk ? "Separacion de roles correcta." : "Hay reglas que NO se cumplen."}`,
  );

  await client.end();
  process.exit(allOk ? 0 : 1);
}

main().catch(async (e) => {
  console.error("ERROR:", e.message);
  await client.end().catch(() => {});
  process.exit(1);
});
