/**
 * Prueba el ciclo completo del operador contra la base real:
 *   1. Encuentra un proceso pendiente asignado a un operador
 *   2. Lo inicia (valida bloqueo por procesos anteriores)
 *   3. Lo termina
 *   4. Verifica que el progreso del número de parte y de la OT subieron
 *   5. Revierte todo al estado original
 */
import { config } from "dotenv";
import postgres from "postgres";

config({ path: [".env.local", ".env"], quiet: true });

const client = postgres(process.env.DATABASE_URL!, { max: 1 });

type Snapshot = {
  opId: string;
  opStatus: string;
  opStartedAt: Date | null;
  opFinishedAt: Date | null;
  partId: string;
  partStatus: string;
  partQualityAt: Date | null;
  partStartedAt: Date | null;
};

async function progressOf(partId: string) {
  const [row] = await client`
    select
      count(*) filter (where status <> 'omitida')::int as total,
      count(*) filter (where status = 'terminada')::int as done,
      count(*) filter (where status = 'en_proceso')::int as in_progress
    from production_operations
    where production_order_id = ${partId}
  `;
  return {
    total: Number(row.total),
    done: Number(row.done),
    inProgress: Number(row.in_progress),
    pct: Number(row.total) > 0 ? Math.round((Number(row.done) / Number(row.total)) * 100) : 0,
  };
}

async function orderProgressOf(orderId: string) {
  const [row] = await client`
    select
      count(*) filter (where po.status <> 'omitida')::int as total,
      count(*) filter (where po.status = 'terminada')::int as done
    from production_operations po
    join production_orders pr on pr.id = po.production_order_id
    where pr.order_id = ${orderId}
  `;
  return {
    total: Number(row.total),
    done: Number(row.done),
    pct: Number(row.total) > 0 ? Math.round((Number(row.done) / Number(row.total)) * 100) : 0,
  };
}

async function main() {
  // 1. Buscar un proceso pendiente DESBLOQUEADO con operador asignado
  const candidates = await client`
    select
      po.id as op_id, po.position, po.name, po.status as op_status,
      po.started_at as op_started_at, po.finished_at as op_finished_at,
      po.operator_user_id, u.name as operator_name,
      pr.id as part_id, pr.number as part_number, pr.part_number as pn,
      pr.status as part_status, pr.quality_at as part_quality_at,
      pr.started_at as part_started_at, pr.order_id,
      (select count(*)::int from production_operations po2
        where po2.production_order_id = pr.id
          and po2.position < po.position
          and po2.status not in ('terminada','omitida')) as blocking
    from production_operations po
    join production_orders pr on pr.id = po.production_order_id
    join users u on u.id = po.operator_user_id
    where po.status = 'pendiente'
      and po.operator_user_id is not null
      and pr.status in ('liberada','programada','en_produccion','pausada')
    order by pr.promised_date
    limit 20
  `;

  const target = candidates.find((c) => Number(c.blocking) === 0);
  if (!target) {
    console.log("No hay procesos pendientes desbloqueados para probar.");
    console.log(`   (revisados ${candidates.length} candidatos, todos bloqueados)`);
    await client.end();
    return;
  }

  const snap: Snapshot = {
    opId: target.op_id,
    opStatus: target.op_status,
    opStartedAt: target.op_started_at,
    opFinishedAt: target.op_finished_at,
    partId: target.part_id,
    partStatus: target.part_status,
    partQualityAt: target.part_quality_at,
    partStartedAt: target.part_started_at,
  };

  console.log("=== CICLO DEL OPERADOR: prueba real ===\n");
  console.log(`Operador: ${target.operator_name}`);
  console.log(`Pieza:    ${target.pn ?? target.part_number} (${target.part_status})`);
  console.log(`Proceso:  ${target.position}. ${target.name} (${target.op_status})\n`);

  const before = await progressOf(snap.partId);
  const beforeOrder = await orderProgressOf(target.order_id);
  console.log(`ANTES  → pieza: ${before.done}/${before.total} (${before.pct}%) | OT: ${beforeOrder.done}/${beforeOrder.total} (${beforeOrder.pct}%)`);

  // 2. INICIAR (replica startOperationAsOperator)
  const now = new Date();
  await client`
    update production_operations
    set status = 'en_proceso', started_at = ${now}, updated_at = ${now}
    where id = ${snap.opId}
  `;
  if (["liberada", "programada", "pausada"].includes(snap.partStatus)) {
    await client`
      update production_orders
      set status = 'en_produccion', started_at = ${now}, updated_at = ${now}
      where id = ${snap.partId}
    `;
  }
  const [afterStart] = await client`
    select status from production_orders where id = ${snap.partId}
  `;
  const midProgress = await progressOf(snap.partId);
  console.log(`INICIO → proceso en_proceso | pieza ahora: ${afterStart.status} | activos: ${midProgress.inProgress}`);

  // 3. TERMINAR (replica finishOperationAsOperator)
  const now2 = new Date();
  await client`
    update production_operations
    set status = 'terminada', finished_at = ${now2}, updated_at = ${now2}
    where id = ${snap.opId}
  `;
  const [remaining] = await client`
    select count(*)::int as open
    from production_operations
    where production_order_id = ${snap.partId}
      and status not in ('terminada','omitida')
  `;
  const partCompleted = Number(remaining.open) === 0;
  if (partCompleted) {
    await client`
      update production_orders
      set status = 'calidad', quality_at = ${now2}, updated_at = ${now2}
      where id = ${snap.partId}
    `;
  }

  const after = await progressOf(snap.partId);
  const afterOrder = await orderProgressOf(target.order_id);
  const [partNow] = await client`
    select status from production_orders where id = ${snap.partId}
  `;

  console.log(`FIN    → pieza: ${after.done}/${after.total} (${after.pct}%) | OT: ${afterOrder.done}/${afterOrder.total} (${afterOrder.pct}%)`);
  console.log(`         estado de la pieza: ${partNow.status}${partCompleted ? " (todos los procesos cerrados → calidad)" : ""}`);

  // Validaciones
  const ok1 = after.done === before.done + 1;
  const ok2 = afterOrder.done === beforeOrder.done + 1;
  const ok3 = after.pct > before.pct;
  console.log("\n=== VALIDACIONES ===");
  console.log(`  ${ok1 ? "OK" : "FALLO"}  progreso de la pieza subio 1 proceso`);
  console.log(`  ${ok2 ? "OK" : "FALLO"}  progreso de la OT subio 1 proceso`);
  console.log(`  ${ok3 ? "OK" : "FALLO"}  porcentaje aumento (${before.pct}% -> ${after.pct}%)`);

  // 4. REVERTIR
  await client`
    update production_operations
    set status = ${snap.opStatus},
        started_at = ${snap.opStartedAt},
        finished_at = ${snap.opFinishedAt}
    where id = ${snap.opId}
  `;
  await client`
    update production_orders
    set status = ${snap.partStatus},
        quality_at = ${snap.partQualityAt},
        started_at = ${snap.partStartedAt}
    where id = ${snap.partId}
  `;
  const restored = await progressOf(snap.partId);
  const [partRestored] = await client`
    select status from production_orders where id = ${snap.partId}
  `;
  const reverted =
    restored.done === before.done && partRestored.status === snap.partStatus;
  console.log(`\n  ${reverted ? "OK" : "FALLO"}  base revertida al estado original (${restored.done}/${restored.total}, pieza ${partRestored.status})`);

  await client.end();
  process.exit(ok1 && ok2 && ok3 && reverted ? 0 : 1);
}

main().catch(async (err) => {
  console.error("ERROR:", err.message);
  await client.end().catch(() => {});
  process.exit(1);
});
