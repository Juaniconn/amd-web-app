/**
 * Corrige los correos de operadores demo que quedaron con guion
 * (maria-lopez@ -> maria.lopez@) y repone el password conocido.
 * No borra ni recrea datos de la demo.
 */
import { config } from "dotenv";
import postgres from "postgres";
import { hashPassword } from "better-auth/crypto";

config({ path: [".env.local", ".env"], quiet: true });

const client = postgres(process.env.DATABASE_URL!, { max: 1 });

const OPERATORS = [
  { id: "op-juan-martinez", name: "Juan Martínez", email: "juan.martinez@amd-demo.local" },
  { id: "op-ramiro-sanchez", name: "Ramiro Sánchez", email: "ramiro.sanchez@amd-demo.local" },
  { id: "op-luis-hernandez", name: "Luis Hernández", email: "luis.hernandez@amd-demo.local" },
  { id: "op-ana-torres", name: "Ana Torres", email: "ana.torres@amd-demo.local" },
  { id: "op-carlos-diaz", name: "Carlos Díaz", email: "carlos.diaz@amd-demo.local" },
  { id: "op-maria-lopez", name: "María López", email: "maria.lopez@amd-demo.local" },
  { id: "op-roberto-garcia", name: "Roberto García", email: "roberto.garcia@amd-demo.local" },
  { id: "op-patricia-ramirez", name: "Patricia Ramírez", email: "patricia.ramirez@amd-demo.local" },
];

async function main() {
  const hashed = await hashPassword("operador123");
  let fixedEmails = 0;
  let fixedPasswords = 0;
  let fixedRoles = 0;

  for (const op of OPERATORS) {
    const [user] = await client`select id, email from users where id = ${op.id} limit 1`;
    if (!user) {
      console.log(`  SALTADO ${op.id} — no existe en la base`);
      continue;
    }

    if (user.email !== op.email) {
      // Liberar el correo destino si lo ocupa otro registro huerfano
      await client`
        delete from users where email = ${op.email} and id <> ${op.id}
      `;
      await client`
        update users set email = ${op.email}, name = ${op.name}, email_verified = true, updated_at = now()
        where id = ${op.id}
      `;
      console.log(`  EMAIL  ${user.email} -> ${op.email}`);
      fixedEmails++;
    }

    const [acc] = await client`
      select id from accounts where user_id = ${op.id} and provider_id = 'credential' limit 1
    `;
    if (acc) {
      await client`update accounts set password = ${hashed}, updated_at = now() where id = ${acc.id}`;
    } else {
      await client`
        insert into accounts (id, account_id, provider_id, user_id, password, created_at, updated_at)
        values (${`acc-${op.id}`}, ${op.id}, 'credential', ${op.id}, ${hashed}, now(), now())
      `;
    }
    fixedPasswords++;

    const [role] = await client`
      select user_id from user_roles where user_id = ${op.id} and role_id = 'produccion' limit 1
    `;
    if (!role) {
      await client`
        insert into user_roles (user_id, role_id, created_at)
        values (${op.id}, 'produccion', now())
      `;
      console.log(`  ROL    ${op.email} -> produccion`);
      fixedRoles++;
    }
  }

  console.log(`\n✓ ${fixedEmails} correos corregidos`);
  console.log(`✓ ${fixedPasswords} passwords repuestos a 'operador123'`);
  console.log(`✓ ${fixedRoles} roles asignados`);

  console.log("\n=== CUENTAS DE OPERADOR LISTAS ===");
  const rows = await client`
    select u.email, u.name,
      (select count(*)::int from production_operations po
        where po.operator_user_id = u.id and po.status in ('pendiente','en_proceso')) as pendientes
    from users u
    join user_roles ur on ur.user_id = u.id
    where ur.role_id = 'produccion'
    order by u.email
  `;
  for (const r of rows) {
    console.log(`  ${r.email.padEnd(38)} ${r.name.padEnd(20)} ${r.pendientes} procesos abiertos`);
  }
  console.log("\n  Password para todos: operador123");

  await client.end();
  process.exit(0);
}

main().catch(async (e) => {
  console.error("ERROR:", e.message);
  await client.end().catch(() => {});
  process.exit(1);
});
