/**
 * Aplica a la base la separación de roles Jefe de Producción / Operador:
 *   1. Crea el rol 'operador' con su permiso production:my_work
 *   2. Agrega production:my_work al rol 'produccion' (jefe)
 *   3. Renombra 'produccion' a "Jefe de Producción"
 *   4. Mueve a los operadores demo de 'produccion' a 'operador'
 *   5. Deja a Ramiro Sánchez como Jefe de Producción (alguien debe poder asignar)
 *   6. Corrige correos y repone passwords
 *
 * Idempotente: se puede correr varias veces.
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

/** Ramiro es el jefe de piso: puede programar y asignar a los demás. */
const SUPERVISOR_ID = "op-ramiro-sanchez";

async function main() {
  const hashed = await hashPassword("operador123");

  // 1. Permiso production:my_work
  await client`
    insert into permissions (id, name, description)
    values (
      'production:my_work',
      'Ver y cerrar mis procesos',
      'Vista de piso: solo los procesos asignados al propio usuario, sin clientes ni costos. Permite iniciar y cerrar su trabajo.'
    )
    on conflict (id) do update
      set name = excluded.name, description = excluded.description
  `;
  console.log("✓ permiso production:my_work registrado");

  // 2. Rol operador
  await client`
    insert into roles (id, name, description)
    values (
      'operador',
      'Operador',
      'Solo ve y cierra los procesos que le fueron asignados. Sin acceso a clientes, costos, programación ni listados generales.'
    )
    on conflict (id) do update
      set name = excluded.name, description = excluded.description
  `;
  await client`
    insert into role_permissions (role_id, permission_id)
    values ('operador', 'production:my_work')
    on conflict do nothing
  `;
  console.log("✓ rol 'operador' creado con 1 permiso (production:my_work)");

  // 3. Jefe de Producción
  await client`
    update roles
    set name = 'Jefe de Producción',
        description = 'Programa números de parte, asigna operadores y máquinas, y cierra administrativamente.'
    where id = 'produccion'
  `;
  await client`
    insert into role_permissions (role_id, permission_id)
    values ('produccion', 'production:my_work')
    on conflict do nothing
  `;
  // El admin debe tener todo
  await client`
    insert into role_permissions (role_id, permission_id)
    values ('administrador', 'production:my_work')
    on conflict do nothing
  `;
  console.log("✓ rol 'produccion' renombrado a 'Jefe de Producción'");

  // 4-6. Usuarios
  let toOperator = 0;
  for (const op of OPERATORS) {
    const [user] = await client`select id, email from users where id = ${op.id} limit 1`;
    if (!user) {
      console.log(`  SALTADO ${op.id} — no existe`);
      continue;
    }

    if (user.email !== op.email) {
      await client`delete from users where email = ${op.email} and id <> ${op.id}`;
      await client`
        update users set email = ${op.email}, name = ${op.name}, email_verified = true, updated_at = now()
        where id = ${op.id}
      `;
      console.log(`  EMAIL ${user.email} -> ${op.email}`);
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

    const targetRole = op.id === SUPERVISOR_ID ? "produccion" : "operador";
    const removeRole = op.id === SUPERVISOR_ID ? "operador" : "produccion";

    await client`
      insert into user_roles (user_id, role_id, created_at)
      values (${op.id}, ${targetRole}, now())
      on conflict do nothing
    `;
    await client`
      delete from user_roles where user_id = ${op.id} and role_id = ${removeRole}
    `;
    if (targetRole === "operador") toOperator++;
  }

  console.log(`✓ ${toOperator} usuarios con rol 'operador'`);
  console.log(`✓ 1 usuario con rol 'Jefe de Producción' (Ramiro Sánchez)`);

  // Resumen
  console.log("\n=== CUENTAS DEMO ===");
  const rows = await client`
    select u.email, u.name, r.name as role_name,
      (select count(*)::int from role_permissions rp where rp.role_id = r.id) as perms,
      (select count(*)::int from production_operations po
        where po.operator_user_id = u.id and po.status in ('pendiente','en_proceso')) as abiertos
    from users u
    join user_roles ur on ur.user_id = u.id
    join roles r on r.id = ur.role_id
    where r.id in ('operador','produccion','administrador')
    order by r.id, u.email
  `;
  for (const r of rows) {
    console.log(
      `  ${r.email.padEnd(36)} ${r.role_name.padEnd(20)} ${String(r.perms).padStart(2)} permisos  ${r.abiertos} procesos`,
    );
  }
  console.log("\n  Password operadores: operador123");

  await client.end();
  process.exit(0);
}

main().catch(async (e) => {
  console.error("ERROR:", e.message);
  await client.end().catch(() => {});
  process.exit(1);
});
