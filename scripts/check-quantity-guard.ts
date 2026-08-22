/**
 * Verifica la validacion de cantidades al cerrar un proceso.
 * Replica exactamente las reglas de finishOperationAsOperator:
 *   1. buenas + scrap + retrabajo NO puede pasar del total del numero de parte
 *   2. scrap + retrabajo acumulado en la pieza NO puede pasar del total
 *   3. cantidades validas si pasan
 * No modifica nada: solo evalua las reglas con datos reales.
 */
import { config } from "dotenv";
import postgres from "postgres";

config({ path: [".env.local", ".env"], quiet: true });

const client = postgres(process.env.DATABASE_URL!, { max: 1 });

type Rule = { ok: boolean; msg: string };

/** Misma logica que el servicio */
function validate(
  partQty: number,
  unit: string,
  partNumber: string,
  previousLoss: number,
  good: number,
  scrap: number,
  rework: number,
): { rejected: boolean; reason: string } {
  const reported = good + scrap + rework;

  if (partQty > 0 && reported > partQty) {
    return {
      rejected: true,
      reason: `No puedes reportar ${reported} piezas: el numero de parte ${partNumber} tiene ${partQty} ${unit}.`,
    };
  }
  if (partQty > 0 && previousLoss + scrap + rework > partQty) {
    const disponible = Math.max(0, partQty - previousLoss);
    return {
      rejected: true,
      reason: `Ya se reportaron ${previousLoss} entre scrap y retrabajo. Solo puedes reportar ${disponible} mas.`,
    };
  }
  return { rejected: false, reason: "" };
}

async function main() {
  // Tomar un proceso real en curso o pendiente
  const [target] = await client`
    select
      po.id as op_id, po.name, po.status,
      pr.id as part_id, pr.part_number as pn, pr.quantity, pr.unit,
      coalesce((
        select sum(rw.scrap_quantity + rw.quantity)
        from production_rework rw where rw.production_order_id = pr.id
      ), 0) as previous_loss
    from production_operations po
    join production_orders pr on pr.id = po.production_order_id
    where po.status in ('pendiente','en_proceso')
      and po.operator_user_id is not null
      and pr.quantity::numeric > 0
    order by pr.promised_date
    limit 1
  `;

  if (!target) {
    console.log("No hay procesos abiertos para probar.");
    await client.end();
    return;
  }

  const partQty = Number(target.quantity);
  const prev = Number(target.previous_loss);
  const unit = target.unit as string;
  const pn = (target.pn ?? "") as string;

  console.log("=== VALIDACION DE CANTIDADES ===\n");
  console.log(`  Pieza:    ${pn}`);
  console.log(`  Total:    ${partQty} ${unit}`);
  console.log(`  Proceso:  ${target.name} (${target.status})`);
  console.log(`  Ya reportado como scrap/retrabajo: ${prev}\n`);

  const disponible = Math.max(0, partQty - prev);

  const cases: Array<{
    label: string;
    good: number;
    scrap: number;
    rework: number;
    shouldReject: boolean;
  }> = [
    {
      label: `todas buenas (${partQty})`,
      good: partQty,
      scrap: 0,
      rework: 0,
      shouldReject: false,
    },
    {
      label: `EXCESO: ${partQty + 10} buenas`,
      good: partQty + 10,
      scrap: 0,
      rework: 0,
      shouldReject: true,
    },
    {
      label: `EXCESO: ${partQty} buenas + 1 scrap`,
      good: partQty,
      scrap: 1,
      rework: 0,
      shouldReject: true,
    },
    {
      label: `EXCESO: el doble del total`,
      good: partQty * 2,
      scrap: 0,
      rework: 0,
      shouldReject: true,
    },
    {
      label: `mezcla exacta al total`,
      good: Math.max(0, partQty - 2),
      scrap: 1,
      rework: 1,
      shouldReject: partQty < 2 || 1 + 1 + prev > partQty,
    },
    {
      label: `menos del total (parcial)`,
      good: Math.max(0, Math.floor(partQty / 2)),
      scrap: 0,
      rework: 0,
      shouldReject: false,
    },
    {
      label: `EXCESO scrap: ${disponible + 5} (disponible ${disponible})`,
      good: 0,
      scrap: disponible + 5,
      rework: 0,
      shouldReject: true,
    },
  ];

  const results: Rule[] = [];
  for (const c of cases) {
    const r = validate(partQty, unit, pn, prev, c.good, c.scrap, c.rework);
    const correct = r.rejected === c.shouldReject;
    results.push({ ok: correct, msg: c.label });
    const verdict = r.rejected ? "RECHAZA" : "ACEPTA ";
    const expected = c.shouldReject ? "RECHAZA" : "ACEPTA ";
    console.log(
      `  ${correct ? "OK   " : "FALLO"} ${c.label.padEnd(46)} -> ${verdict} (esperado ${expected})`,
    );
    if (r.rejected) console.log(`         "${r.reason}"`);
  }

  const allOk = results.every((r) => r.ok);
  console.log(
    `\n${allOk ? "La validacion de cantidades funciona en todos los casos." : "Hay casos que NO se validan bien."}`,
  );

  await client.end();
  process.exit(allOk ? 0 : 1);
}

main().catch(async (e) => {
  console.error("ERROR:", e.message);
  await client.end().catch(() => {});
  process.exit(1);
});
