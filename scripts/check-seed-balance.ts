/**
 * Verifica que la LOGICA del seed reparta procesos parejo entre los 8
 * operadores, sin tocar la base. Replica el round-robin con cursor global
 * de seed-full-demo.ts y lo compara contra el metodo viejo (indice de
 * partida), que dejaba operadores sin trabajo.
 */

const OPERATORS = [
  "op-juan-martinez",
  "op-ramiro-sanchez",
  "op-luis-hernandez",
  "op-ana-torres",
  "op-carlos-diaz",
  "op-maria-lopez",
  "op-roberto-garcia",
  "op-patricia-ramirez",
];

/** Misma forma que el seed: 30 cotizaciones, 1-8 partidas, 3-8 procesos. */
function simulate(useGlobalCursor: boolean) {
  const counts = new Map<string, number>(OPERATORS.map((o) => [o, 0]));
  let cursor = 0;
  let totalOps = 0;
  let unassigned = 0;

  // semilla fija para que la comparacion sea reproducible
  let seed = 42;
  const rand = () => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648;
  };

  for (let quote = 0; quote < 30; quote++) {
    const partidas = 1 + Math.floor(rand() * 8);
    for (let p = 0; p < partidas; p++) {
      const numProcesses = 3 + Math.floor(rand() * 6);
      for (let proc = 0; proc < numProcesses; proc++) {
        totalOps++;
        if (useGlobalCursor) {
          // NUEVO: cursor global, todo proceso lleva operador
          const op = OPERATORS[cursor % OPERATORS.length];
          cursor++;
          counts.set(op, (counts.get(op) ?? 0) + 1);
        } else {
          // VIEJO: indice de partida, solo procesos 0 y 1
          if (proc === 0) {
            const op = OPERATORS[p % OPERATORS.length];
            counts.set(op, (counts.get(op) ?? 0) + 1);
          } else if (proc === 1) {
            const op = OPERATORS[(p + 1) % OPERATORS.length];
            counts.set(op, (counts.get(op) ?? 0) + 1);
          } else {
            unassigned++;
          }
        }
      }
    }
  }

  return { counts, totalOps, unassigned };
}

function report(label: string, r: ReturnType<typeof simulate>) {
  const values = [...r.counts.values()];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const zeros = values.filter((v) => v === 0).length;

  console.log(`\n=== ${label} ===`);
  console.log(`  Procesos totales: ${r.totalOps}`);
  console.log(`  Sin operador:     ${r.unassigned}`);
  for (const [op, n] of r.counts) {
    const bar = "#".repeat(Math.round(n / 4));
    console.log(`    ${op.replace("op-", "").padEnd(18)} ${String(n).padStart(4)}  ${bar}`);
  }
  console.log(`  min ${min} · max ${max} · diferencia ${max - min} · en cero: ${zeros}`);
  return { min, max, zeros, unassigned: r.unassigned };
}

const oldWay = report("METODO VIEJO (indice de partida)", simulate(false));
const newWay = report("METODO NUEVO (cursor global)", simulate(true));

console.log("\n=== VALIDACIONES ===");
const checks: Array<[boolean, string]> = [
  [newWay.zeros === 0, "ningun operador queda sin procesos"],
  [newWay.unassigned === 0, "ningun proceso queda sin operador"],
  [newWay.max - newWay.min <= 1, `reparto parejo (diferencia ${newWay.max - newWay.min})`],
  [
    oldWay.unassigned > 0 || oldWay.zeros > 0,
    `el metodo viejo si tenia el problema (${oldWay.unassigned} procesos sin operador, ${oldWay.zeros} operadores en cero)`,
  ],
];

let allOk = true;
for (const [ok, label] of checks) {
  if (!ok) allOk = false;
  console.log(`  ${ok ? "OK   " : "FALLO"} ${label}`);
}

console.log(`\n${allOk ? "La logica del seed reparte parejo." : "La logica del seed NO reparte parejo."}`);
process.exit(allOk ? 0 : 1);
