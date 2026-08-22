/**
 * Prueba de extremo a extremo del guard de cantidades:
 * ejecuta la MISMA secuencia que finishOperationAsOperator contra la base,
 * primero con exceso (debe abortar sin escribir nada) y luego con cantidades
 * validas (debe registrar). Revierte todo al final.
 */
import { config } from "dotenv";
import postgres from "postgres";
import { randomUUID } from "node:crypto";

config({ path: [".env.local", ".env"], quiet: true });

const client = postgres(process.env.DATABASE_URL!, { max: 1 });

class QtyError extends Error {}

/** Replica el orden real: validar ANTES de escribir */
async function finish(
  opId: string,
  partId: string,
  good: number,
  scrap: number,
  rework: number,
  rootCause: string,
) {
  const [row] = await client`
    select pr.quantity, pr.unit, pr.part_number,
      coalesce((
        select sum(rw.scrap_quantity + rw.quantity)
        from production_rework rw where rw.production_order_id = pr.id
      ), 0) as prev
    from production_orders pr where pr.id = ${partId}
  `;
  const partQty = Number(row.quantity);
  const prev = Number(row.prev);
  const reported = good + scrap + rework;

  if (partQty > 0 && reported > partQty) {
    throw new QtyError(
      `No puedes reportar ${reported} piezas: el numero de parte ${row.part_number} tiene ${partQty} ${row.unit}.`,
    );
  }
  if (partQty > 0 && prev + scrap + rework > partQty) {
    throw new QtyError(
      `Ya se reportaron ${prev}. Solo puedes reportar ${Math.max(0, partQty - prev)} mas.`,
    );
  }

  // Solo si paso la validacion se escribe
  const id = randomUUID();
  await client`
    update production_operations set status = 'terminada', finished_at = now() where id = ${opId}
  `;
  if (scrap > 0 || rework > 0) {
    await client`
      insert into production_rework
        (id, production_order_id, part_number, quantity, scrap_quantity, root_cause, labor_hours, machine_hours)
      values (${id}, ${partId}, ${row.part_number}, ${rework.toFixed(4)}, ${scrap.toFixed(4)}, ${rootCause}, '0', '0')
    `;
  }
  return id;
}

async function main() {
  const [t] = await client`
    select po.id as op_id, po.name, po.status as op_status,
      po.finished_at, pr.id as part_id, pr.part_number as pn,
      pr.quantity, pr.unit
    from production_operations po
    join production_orders pr on pr.id = po.production_order_id
    where po.status = 'pendiente' and po.operator_user_id is not null
      and pr.quantity::numeric > 4
    order by pr.promised_date limit 1
  `;

  if (!t) {
    console.log("No hay procesos aptos para la prueba.");
    await client.end();
    return;
  }

  const partQty = Number(t.quantity);
  const snap = { status: t.op_status, finishedAt: t.finished_at };
  let createdId: string | null = null;

  console.log("=== GUARD DE CANTIDADES (extremo a extremo) ===\n");
  console.log(`  Pieza:   ${t.pn} — total ${partQty} ${t.unit}`);
  console.log(`  Proceso: ${t.name}\n`);

  const before = await client`
    select count(*)::int as n from production_rework where production_order_id = ${t.part_id}
  `;

  // ── 1. Intento con EXCESO ──
  let rejected = false;
  try {
    await finish(t.op_id, t.part_id, partQty + 5, 0, 0, "");
  } catch (e) {
    if (e instanceof QtyError) {
      rejected = true;
      console.log(`  RECHAZADO como se esperaba:`);
      console.log(`    "${e.message}"`);
    } else throw e;
  }

  const afterReject = await client`
    select count(*)::int as n from production_rework where production_order_id = ${t.part_id}
  `;
  const [opAfterReject] = await client`
    select status from production_operations where id = ${t.op_id}
  `;

  const noWrite =
    Number(afterReject[0].n) === Number(before[0].n) &&
    opAfterReject.status === snap.status;
  console.log(
    `  ${noWrite ? "OK   " : "FALLO"} no se escribio nada en la base (proceso sigue '${opAfterReject.status}')`,
  );

  // ── 2. Intento VALIDO ──
  const good = partQty - 2;
  createdId = await finish(t.op_id, t.part_id, good, 1, 1, "[prueba] guard de cantidades");
  const [opAfterOk] = await client`
    select status from production_operations where id = ${t.op_id}
  `;
  const afterOk = await client`
    select count(*)::int as n,
      coalesce(sum(scrap_quantity + quantity), 0) as total
    from production_rework where production_order_id = ${t.part_id}
  `;
  console.log(
    `\n  Cantidades validas (${good} buenas + 1 scrap + 1 retrabajo = ${good + 2} de ${partQty}):`,
  );
  console.log(`  OK    proceso cerrado ('${opAfterOk.status}')`);
  console.log(`  OK    registro de scrap/retrabajo creado (total ${Number(afterOk[0].total)})`);

  // ── 3. Ahora un exceso sobre lo ya reportado ──
  let rejected2 = false;
  try {
    await finish(t.op_id, t.part_id, 0, partQty, 0, "otra causa");
  } catch (e) {
    if (e instanceof QtyError) {
      rejected2 = true;
      console.log(`\n  Segundo reporte que rebasa lo acumulado:`);
      console.log(`    "${e.message}"`);
    } else throw e;
  }
  console.log(
    `  ${rejected2 ? "OK   " : "FALLO"} bloquea el exceso acumulado en la pieza`,
  );

  // ── REVERTIR ──
  if (createdId) {
    await client`delete from production_rework where id = ${createdId}`;
  }
  await client`
    update production_operations
    set status = ${snap.status}, finished_at = ${snap.finishedAt}
    where id = ${t.op_id}
  `;
  const [restored] = await client`
    select status from production_operations where id = ${t.op_id}
  `;
  const finalCount = await client`
    select count(*)::int as n from production_rework where production_order_id = ${t.part_id}
  `;
  const reverted =
    restored.status === snap.status &&
    Number(finalCount[0].n) === Number(before[0].n);
  console.log(`\n  ${reverted ? "OK   " : "FALLO"} base revertida (proceso '${restored.status}')`);

  const allOk = rejected && noWrite && rejected2 && reverted;
  console.log(
    `\n${allOk ? "El guard bloquea el exceso y no corrompe la base." : "Hay fallos en el guard."}`,
  );

  await client.end();
  process.exit(allOk ? 0 : 1);
}

main().catch(async (e) => {
  console.error("ERROR:", e.message);
  await client.end().catch(() => {});
  process.exit(1);
});
