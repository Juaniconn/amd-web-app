/**
 * Muestra las cuentas de operador con detalle util para probar:
 * cuantos procesos tiene, cuantos estan DESBLOQUEADOS (listos para iniciar)
 * y un ejemplo concreto de pieza/proceso con su cantidad total.
 */
import { config } from "dotenv";
import postgres from "postgres";

config({ path: [".env.local", ".env"], quiet: true });

const client = postgres(process.env.DATABASE_URL!, { max: 1 });

async function main() {
  const rows = await client`
    select
      u.email, u.name, r.name as role_name,
      count(*) filter (where po.status = 'en_proceso')::int as en_curso,
      count(*) filter (where po.status = 'pendiente')::int as pendientes,
      count(*) filter (
        where po.status = 'pendiente'
          and (select count(*) from production_operations pb
               where pb.production_order_id = po.production_order_id
                 and pb.position < po.position
                 and pb.status not in ('terminada','omitida')) = 0
      )::int as listos
    from users u
    join user_roles ur on ur.user_id = u.id
    join roles r on r.id = ur.role_id
    left join production_operations po on po.operator_user_id = u.id
    where ur.role_id in ('operador','produccion')
    group by u.id, u.email, u.name, r.name
    order by listos desc, u.name
  `;

  console.log("=== CUENTAS PARA PROBAR (password: operador123) ===\n");
  console.log(`  ${"CORREO".padEnd(34)} ${"NOMBRE".padEnd(18)} ${"ROL".padEnd(20)} CURSO PEND LISTOS`);
  console.log(`  ${"-".repeat(34)} ${"-".repeat(18)} ${"-".repeat(20)} ----- ---- ------`);
  for (const r of rows) {
    console.log(
      `  ${String(r.email).padEnd(34)} ${String(r.name).padEnd(18)} ${String(r.role_name).padEnd(20)} ${String(r.en_curso).padStart(5)} ${String(r.pendientes).padStart(4)} ${String(r.listos).padStart(6)}`,
    );
  }

  // Ejemplos concretos: procesos listos para iniciar, con cantidad de la pieza
  console.log("\n=== EJEMPLOS DE PROCESOS LISTOS PARA INICIAR ===\n");
  const examples = await client`
    select
      u.email, u.name as operador,
      pr.part_number as pn, pr.description, pr.quantity, pr.unit,
      po.position, po.name as proceso, po.status,
      m.name as maquina, wc.name as centro
    from production_operations po
    join production_orders pr on pr.id = po.production_order_id
    join users u on u.id = po.operator_user_id
    join user_roles ur on ur.user_id = u.id and ur.role_id = 'operador'
    left join machines m on m.id = po.machine_id
    left join work_centers wc on wc.id = po.work_center_id
    where po.status = 'pendiente'
      and (select count(*) from production_operations pb
           where pb.production_order_id = po.production_order_id
             and pb.position < po.position
             and pb.status not in ('terminada','omitida')) = 0
      and pr.status in ('liberada','programada','en_produccion','pausada')
    order by u.name, pr.promised_date
    limit 12
  `;

  let lastOp = "";
  for (const e of examples) {
    if (e.email !== lastOp) {
      console.log(`\n  ${e.operador} — ${e.email}`);
      lastOp = e.email as string;
    }
    console.log(
      `     ${String(e.pn).padEnd(12)} ${String(e.proceso).padEnd(26)} ${String(Number(e.quantity)).padStart(4)} ${e.unit}   ${e.maquina ?? "sin maquina"}`,
    );
  }

  console.log("\n  Para probar el limite de cantidades: entra, inicia uno de esos");
  console.log("  procesos y en 'Terminar y reportar' escribe mas piezas de las que");
  console.log("  muestra la columna de cantidad.");

  await client.end();
  process.exit(0);
}

main().catch(async (e) => {
  console.error("ERROR:", e.message);
  await client.end().catch(() => {});
  process.exit(1);
});
