/**
 * Rebalancea la asignacion de operadores sobre los procesos YA existentes.
 *
 * El seed original elegia el operador con el indice de la partida (0..3), asi
 * que los ultimos operadores del arreglo se quedaban sin trabajo. Este script
 * reparte los procesos abiertos de forma pareja entre los 8 operadores,
 * respetando dos reglas:
 *
 *   - Los procesos ya TERMINADOS no se toentran (son historico real).
 *   - Un proceso 'en_proceso' conserva su operador (esta trabajando en el).
 *
 * Idempotente: correrlo dos veces deja el mismo reparto.
 */
import { config } from "dotenv";
import postgres from "postgres";

config({ path: [".env.local", ".env"], quiet: true });

const client = postgres(process.env.DATABASE_URL!, { max: 1 });

async function distribution(label: string) {
  const rows = await client`
    select u.name, u.email,
      count(*) filter (where po.status = 'pendiente')::int as pendientes,
      count(*) filter (where po.status = 'en_proceso')::int as en_curso,
      count(*) filter (where po.status = 'terminada')::int as terminados
    from users u
    join user_roles ur on ur.user_id = u.id and ur.role_id in ('operador','produccion')
    left join production_operations po on po.operator_user_id = u.id
    group by u.id, u.name, u.email
    order by u.name
  `;
  console.log(`\n=== ${label} ===`);
  console.log(`  ${"OPERADOR".padEnd(20)} PEND  CURSO  TERM   ABIERTOS`);
  for (const r of rows) {
    const abiertos = Number(r.pendientes) + Number(r.en_curso);
    console.log(
      `  ${String(r.name).padEnd(20)} ${String(r.pendientes).padStart(4)}  ${String(r.en_curso).padStart(5)}  ${String(r.terminados).padStart(4)}   ${String(abiertos).padStart(4)}`,
    );
  }
  return rows;
}

async function main() {
  await distribution("ANTES");

  // Operadores destino (excluye al jefe: el reparto de piso es para operadores)
  const operators = await client`
    select u.id, u.name
    from users u
    join user_roles ur on ur.user_id = u.id
    where ur.role_id = 'operador'
    order by u.name
  `;

  if (operators.length === 0) {
    console.log("\nNo hay usuarios con rol 'operador'. Corre primero npm run fix:operators");
    await client.end();
    return;
  }

  // Procesos a repartir: pendientes (los en_proceso y terminados se respetan)
  const pending = await client`
    select po.id
    from production_operations po
    join production_orders pr on pr.id = po.production_order_id
    where po.status = 'pendiente'
      and pr.status not in ('cancelada','entregada')
    order by pr.promised_date, po.production_order_id, po.position
  `;

  console.log(`\nRepartiendo ${pending.length} procesos pendientes entre ${operators.length} operadores...`);

  let cursor = 0;
  for (const op of pending) {
    const target = operators[cursor % operators.length];
    await client`
      update production_operations
      set operator_user_id = ${target.id}, updated_at = now()
      where id = ${op.id}
    `;
    cursor++;
  }

  const after = await distribution("DESPUES");

  // Solo se mide la carga de los OPERADORES; el jefe de produccion queda
  // fuera del reparto de piso a proposito.
  const operatorNames = new Set(operators.map((o) => o.name as string));
  const onlyOperators = after.filter((r) => operatorNames.has(r.name as string));

  const sinTrabajo = onlyOperators.filter(
    (r) => Number(r.pendientes) + Number(r.en_curso) === 0,
  );
  const abiertos = onlyOperators.map(
    (r) => Number(r.pendientes) + Number(r.en_curso),
  );
  const min = Math.min(...abiertos);
  const max = Math.max(...abiertos);

  console.log("\n=== VALIDACIONES (solo operadores de piso) ===");
  console.log(
    `  ${sinTrabajo.length === 0 ? "OK   " : "FALLO"} los ${onlyOperators.length} operadores tienen trabajo abierto`,
  );
  if (sinTrabajo.length > 0) {
    for (const s of sinTrabajo) console.log(`         sin trabajo: ${s.name}`);
  }
  console.log(
    `  ${max - min <= 2 ? "OK   " : "FALLO"} carga balanceada (min ${min}, max ${max}, diferencia ${max - min})`,
  );

  await client.end();
  process.exit(sinTrabajo.length === 0 && max - min <= 2 ? 0 : 1);
}

main().catch(async (e) => {
  console.error("ERROR:", e.message);
  await client.end().catch(() => {});
  process.exit(1);
});
