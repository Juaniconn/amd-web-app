/**
 * Simula el acceso de un operador: que permisos tiene y que rutas puede ver.
 */
import { config } from "dotenv";
import postgres from "postgres";

config({ path: [".env.local", ".env"], quiet: true });

const client = postgres(process.env.DATABASE_URL!, { max: 1 });

async function main() {
  const [op] = await client`
    select u.id, u.email, u.name
    from users u
    join user_roles ur on ur.user_id = u.id
    where ur.role_id = 'produccion' and u.email = 'maria.lopez@amd-demo.local'
    limit 1
  `;

  if (!op) {
    console.log("No se encontro el operador de prueba.");
    await client.end();
    return;
  }

  const perms = await client`
    select distinct p.id
    from user_roles ur
    join role_permissions rp on rp.role_id = ur.role_id
    join permissions p on p.id = rp.permission_id
    where ur.user_id = ${op.id}
    order by p.id
  `;

  const ids = perms.map((p) => p.id as string);

  console.log(`=== ACCESO DE ${op.name} (${op.email}) ===\n`);
  console.log(`Permisos totales: ${ids.length}\n`);

  const checks: Array<[string, string]> = [
    ["dashboard:read", "Dashboard (/dashboard)"],
    ["production:view", "Numeros de Parte + Mis Procesos"],
    ["production:create", "Crear numeros de parte"],
    ["production:assign_operator", "Asignar operadores"],
    ["customers:read", "Clientes (dato sensible)"],
    ["quotes:read", "Cotizaciones (costos)"],
    ["billing:read", "Facturacion (dinero)"],
    ["reports:read", "Reportes"],
  ];

  console.log("Puede acceder a:");
  for (const [perm, label] of checks) {
    const has = ids.includes(perm);
    console.log(`  ${has ? "SI" : "NO"}  ${label.padEnd(38)} (${perm})`);
  }

  const sensitive = ["customers:read", "quotes:read", "billing:read"].filter((p) =>
    ids.includes(p),
  );
  console.log(
    `\n${sensitive.length === 0 ? "OK — el operador NO ve clientes, costos ni facturacion." : "ATENCION — el operador ve datos sensibles: " + sensitive.join(", ")}`,
  );

  const [ops] = await client`
    select
      count(*) filter (where status = 'en_proceso')::int as en_curso,
      count(*) filter (where status = 'pendiente')::int as pendientes
    from production_operations
    where operator_user_id = ${op.id}
  `;
  console.log(`\nAl entrar vera: ${ops.en_curso} en curso, ${ops.pendientes} pendientes`);

  await client.end();
  process.exit(0);
}

main().catch(async (e) => {
  console.error("ERROR:", e.message);
  await client.end().catch(() => {});
  process.exit(1);
});
