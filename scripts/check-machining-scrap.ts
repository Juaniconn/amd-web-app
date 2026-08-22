/**
 * Prueba el ciclo del operador CON maquinado, scrap y retrabajo:
 *   1. Inicia proceso -> abre cronometros de horas hombre y maquina
 *   2. Termina reportando scrap y retrabajo -> cierra cronometros y crea registro
 *   3. Verifica horas acumuladas, scrap y estado de la maquina
 *   4. Revierte todo
 */
import { config } from "dotenv";
import postgres from "postgres";
import { randomUUID } from "node:crypto";

config({ path: [".env.local", ".env"], quiet: true });

const client = postgres(process.env.DATABASE_URL!, { max: 1 });

async function main() {
  // Buscar proceso pendiente desbloqueado con maquina asignada
  const candidates = await client`
    select
      po.id as op_id, po.position, po.name, po.status as op_status,
      po.started_at as op_started_at, po.finished_at as op_finished_at,
      po.operator_user_id, po.machine_id as op_machine_id,
      u.name as operator_name,
      pr.id as part_id, pr.part_number as pn, pr.number as part_number,
      pr.status as part_status, pr.started_at as part_started_at,
      pr.quality_at as part_quality_at, pr.machine_id as part_machine_id,
      m.name as machine_name, m.status as machine_status,
      (select count(*)::int from production_operations po2
        where po2.production_order_id = pr.id
          and po2.position < po.position
          and po2.status not in ('terminada','omitida')) as blocking
    from production_operations po
    join production_orders pr on pr.id = po.production_order_id
    join users u on u.id = po.operator_user_id
    left join machines m on m.id = coalesce(po.machine_id, pr.machine_id)
    where po.status = 'pendiente'
      and po.operator_user_id is not null
      and pr.status in ('liberada','programada','en_produccion','pausada')
    order by pr.promised_date
    limit 30
  `;

  const t = candidates.find(
    (c) => Number(c.blocking) === 0 && (c.op_machine_id || c.part_machine_id),
  );
  if (!t) {
    console.log("No hay procesos pendientes desbloqueados con maquina asignada.");
    await client.end();
    return;
  }

  const machineId = t.op_machine_id ?? t.part_machine_id;
  const snap = {
    opStatus: t.op_status,
    opStartedAt: t.op_started_at,
    opFinishedAt: t.op_finished_at,
    partStatus: t.part_status,
    partStartedAt: t.part_started_at,
    partQualityAt: t.part_quality_at,
    machineStatus: t.machine_status,
  };

  console.log("=== CICLO CON MAQUINADO / SCRAP / RETRABAJO ===\n");
  console.log(`Operador: ${t.operator_name}`);
  console.log(`Pieza:    ${t.pn ?? t.part_number} (${t.part_status})`);
  console.log(`Proceso:  ${t.position}. ${t.name}`);
  console.log(`Maquina:  ${t.machine_name} (${t.machine_status})\n`);

  // ---- INICIAR ----
  const start = new Date(Date.now() - 95 * 60_000); // simula que empezo hace 95 min
  const laborId = randomUUID();
  const machineHourId = randomUUID();

  await client`
    update production_operations
    set status = 'en_proceso', started_at = ${start}, updated_at = now()
    where id = ${t.op_id}
  `;
  await client`
    insert into labor_hours (id, production_order_id, operation_id, operator_user_id, started_at, created_by)
    values (${laborId}, ${t.part_id}, ${t.op_id}, ${t.operator_user_id}, ${start}, ${t.operator_user_id})
  `;

  // Solo abrir maquina si no hay otra abierta (indice unico)
  const [openM] = await client`
    select id from machine_hours where machine_id = ${machineId} and ended_at is null limit 1
  `;
  let machineOpened = false;
  if (!openM) {
    await client`
      insert into machine_hours (id, production_order_id, operation_id, machine_id, operator_user_id, started_at, created_by)
      values (${machineHourId}, ${t.part_id}, ${t.op_id}, ${machineId}, ${t.operator_user_id}, ${start}, ${t.operator_user_id})
    `;
    await client`update machines set status = 'en_produccion' where id = ${machineId}`;
    machineOpened = true;
  }
  if (["liberada", "programada", "pausada"].includes(snap.partStatus)) {
    await client`
      update production_orders set status = 'en_produccion', started_at = ${start} where id = ${t.part_id}
    `;
  }

  const [mNow] = await client`select status from machines where id = ${machineId}`;
  console.log(`INICIO → proceso en_proceso · cronometros abiertos`);
  console.log(`         maquina ahora: ${mNow.status}${machineOpened ? "" : " (ya tenia cronometro abierto)"}`);

  // ---- TERMINAR con scrap 2 y retrabajo 3 ----
  const end = new Date();
  const SCRAP = 2;
  const REWORK = 3;
  const CAUSE = "medida fuera de tolerancia en el barreno central";

  await client`
    update production_operations
    set status = 'terminada', finished_at = ${end}, updated_at = now()
    where id = ${t.op_id}
  `;

  // Cerrar horas hombre
  const laborOpen = await client`
    select id, started_at from labor_hours where operation_id = ${t.op_id} and ended_at is null
  `;
  let laborMinutes = 0;
  for (const l of laborOpen) {
    const mins = Math.max(1, Math.round((end.getTime() - new Date(l.started_at).getTime()) / 60000));
    laborMinutes += mins;
    await client`update labor_hours set ended_at = ${end}, duration_minutes = ${mins} where id = ${l.id}`;
  }

  // Cerrar horas maquina y liberar
  const machineOpen = await client`
    select id, started_at, machine_id from machine_hours where operation_id = ${t.op_id} and ended_at is null
  `;
  let machineMinutes = 0;
  for (const mh of machineOpen) {
    const mins = Math.max(1, Math.round((end.getTime() - new Date(mh.started_at).getTime()) / 60000));
    machineMinutes += mins;
    await client`update machine_hours set ended_at = ${end}, duration_minutes = ${mins} where id = ${mh.id}`;
    await client`update machines set status = 'disponible' where id = ${mh.machine_id}`;
  }

  // Registrar scrap + retrabajo
  const reworkId = randomUUID();
  await client`
    insert into production_rework
      (id, production_order_id, part_number, quantity, scrap_quantity, root_cause, labor_hours, machine_hours, created_by)
    values (
      ${reworkId}, ${t.part_id}, ${t.pn}, ${REWORK.toFixed(4)}, ${SCRAP.toFixed(4)},
      ${`[${t.name}] ${CAUSE}`}, ${(laborMinutes / 60).toFixed(2)}, ${(machineMinutes / 60).toFixed(2)},
      ${t.operator_user_id}
    )
  `;

  const [totals] = await client`
    select
      coalesce((select sum(duration_minutes) from machine_hours where production_order_id = ${t.part_id}), 0)::int as machine_min,
      coalesce((select sum(duration_minutes) from labor_hours where production_order_id = ${t.part_id}), 0)::int as labor_min,
      coalesce((select sum(scrap_quantity) from production_rework where production_order_id = ${t.part_id}), 0) as scrap,
      coalesce((select sum(quantity) from production_rework where production_order_id = ${t.part_id}), 0) as rework
  `;
  const [mAfter] = await client`select status from machines where id = ${machineId}`;

  console.log(`\nFIN    → horas hombre de este proceso: ${(laborMinutes / 60).toFixed(2)}h (${laborMinutes} min)`);
  console.log(`         horas maquina de este proceso: ${(machineMinutes / 60).toFixed(2)}h (${machineMinutes} min)`);
  console.log(`         maquina liberada: ${mAfter.status}`);
  console.log(`\nACUMULADO EN LA PIEZA:`);
  console.log(`         horas maquina: ${(Number(totals.machine_min) / 60).toFixed(2)}h`);
  console.log(`         horas hombre:  ${(Number(totals.labor_min) / 60).toFixed(2)}h`);
  console.log(`         scrap:         ${Number(totals.scrap)}`);
  console.log(`         retrabajo:     ${Number(totals.rework)}`);

  const ok1 = laborMinutes >= 90;
  const ok2 = machineOpened ? machineMinutes >= 90 : true;
  const ok3 = mAfter.status === "disponible";
  const ok4 = Number(totals.scrap) >= SCRAP;
  const ok5 = Number(totals.rework) >= REWORK;

  console.log("\n=== VALIDACIONES ===");
  console.log(`  ${ok1 ? "OK" : "FALLO"}  horas hombre calculadas (~95 min)`);
  console.log(`  ${ok2 ? "OK" : "FALLO"}  horas maquina calculadas`);
  console.log(`  ${ok3 ? "OK" : "FALLO"}  maquina liberada a 'disponible'`);
  console.log(`  ${ok4 ? "OK" : "FALLO"}  scrap registrado (${SCRAP})`);
  console.log(`  ${ok5 ? "OK" : "FALLO"}  retrabajo registrado (${REWORK})`);

  // ---- REVERTIR ----
  await client`delete from production_rework where id = ${reworkId}`;
  await client`delete from labor_hours where id = ${laborId}`;
  if (machineOpened) {
    await client`delete from machine_hours where id = ${machineHourId}`;
  }
  await client`
    update production_operations
    set status = ${snap.opStatus}, started_at = ${snap.opStartedAt}, finished_at = ${snap.opFinishedAt}
    where id = ${t.op_id}
  `;
  await client`
    update production_orders
    set status = ${snap.partStatus}, started_at = ${snap.partStartedAt}, quality_at = ${snap.partQualityAt}
    where id = ${t.part_id}
  `;
  await client`update machines set status = ${snap.machineStatus} where id = ${machineId}`;

  const [check] = await client`
    select
      (select count(*)::int from production_rework where id = ${reworkId}) as rw,
      (select count(*)::int from labor_hours where id = ${laborId}) as lh,
      (select status from production_operations where id = ${t.op_id}) as op_status,
      (select status from machines where id = ${machineId}) as m_status
  `;
  const reverted =
    Number(check.rw) === 0 &&
    Number(check.lh) === 0 &&
    check.op_status === snap.opStatus &&
    check.m_status === snap.machineStatus;
  console.log(`\n  ${reverted ? "OK" : "FALLO"}  base revertida (proceso ${check.op_status}, maquina ${check.m_status})`);

  await client.end();
  process.exit(ok1 && ok2 && ok3 && ok4 && ok5 && reverted ? 0 : 1);
}

main().catch(async (err) => {
  console.error("ERROR:", err.message);
  await client.end().catch(() => {});
  process.exit(1);
});
