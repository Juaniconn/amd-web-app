import { readFileSync } from "node:fs";
import { inflateSync } from "node:zlib";

/**
 * Extrae el texto de los PDF generados por pdf-lib en este proyecto.
 * Detalle clave: los literales se emiten como cadenas HEX <...> Tj, no
 * como (...) Tj, y van codificados en WinAnsi (latin1) dentro de object
 * streams FlateDecode de PDF 1.7. Por eso pdf-parse falla al leerlos.
 */
function pdfText(path: string) {
  const buf = readFileSync(path);
  const chunks: string[] = [];
  let pos = 0;
  while (true) {
    const s = buf.indexOf("stream", pos);
    if (s === -1) break;
    let d = s + 6;
    if (buf[d] === 0x0d) d++;
    if (buf[d] === 0x0a) d++;
    const e = buf.indexOf("endstream", d);
    if (e === -1) break;
    const body = buf.subarray(d, e);
    try {
      chunks.push(inflateSync(body).toString("latin1"));
    } catch {
      chunks.push(body.toString("latin1"));
    }
    pos = e + 9;
  }

  const all = chunks.join("\n");
  const out: string[] = [];

  // <hex> Tj  y  [<hex> ...] TJ
  for (const m of all.matchAll(/<([0-9A-Fa-f\s]+)>\s*(?:Tj|TJ)/g)) {
    const hex = m[1].replace(/\s+/g, "");
    let s = "";
    for (let i = 0; i + 1 < hex.length; i += 2) {
      s += String.fromCharCode(parseInt(hex.slice(i, i + 2), 16));
    }
    out.push(s);
  }
  // (literal) Tj por si acaso
  for (const m of all.matchAll(/\(((?:\\.|[^\\)])*)\)\s*(?:Tj|TJ)/g)) {
    out.push(m[1].replace(/\\(\d{3})/g, (_, o) => String.fromCharCode(parseInt(o, 8))));
  }
  return out;
}

function report(label: string, path: string, expect: string[]) {
  const lines = pdfText(path);
  const text = lines.join(" \u00b7 ");
  console.log(`\n${"=".repeat(64)}`);
  console.log(`### ${label}`);
  console.log("=".repeat(64));
  console.log(`  fragmentos de texto: ${lines.length}`);
  const found = expect.filter((k) => text.toLowerCase().includes(k.toLowerCase()));
  const missing = expect.filter((k) => !found.includes(k));
  console.log(`  PRESENTE : ${found.join(" · ") || "(nada)"}`);
  if (missing.length) console.log(`  AUSENTE  : ${missing.join(" · ")}`);
  console.log("\n  --- CONTENIDO COMPLETO ---");
  for (const l of lines) console.log("   " + l);
}

report("COTIZACION CJS · COT-2026-00001 · destinatario NOMBRE", "/tmp/cot1.pdf", [
  "AMD México",
  "Ciudad Juárez",
  "COT-2026-00001",
  "IVA",
  "Total",
  "30",
]);

report("COTIZACION ELP · COT-2026-00003 · DEPARTAMENTO · USD", "/tmp/cot3.pdf", [
  "AMD México",
  "El Paso",
  "COT-2026-00003",
  "USD",
]);

report("FACTURA", "/tmp/fac.pdf", ["AMD México", "FAC-2026"]);
report("ORDEN DE COMPRA", "/tmp/oc.pdf", ["OC-2026-00001"]);
