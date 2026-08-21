import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL!, { max: 1 });

/**
 * Verifica las reglas de permisos del Checklist Beta Interna.
 * OJO: en la BD, permissions.name guarda la ETIQUETA en español
 * ("Recibir compras"), no el código técnico ("purchasing:receive").
 * El código vive en src/lib/permissions/catalog.ts.
 */
async function main() {
  const rows = await sql<{ role: string; permission: string }[]>`
    select r.name as role, p.name as permission
    from role_permissions rp
    join roles r on r.id = rp.role_id
    join permissions p on p.id = rp.permission_id`;

  const byRole = new Map<string, Set<string>>();
  for (const r of rows) {
    if (!byRole.has(r.role)) byRole.set(r.role, new Set());
    byRole.get(r.role)!.add(r.permission);
  }
  const has = (role: string, perm: string) => byRole.get(role)?.has(perm) ?? false;

  let fails = 0;

  console.log("### Reglas NEGATIVAS del checklist (el rol NO debe tenerlo)");
  const negative: [string, string, string][] = [
    ["Ventas no edita sucursales", "Ventas", "Gestionar sucursales"],
    ["Producción no crea OC", "Producción", "Gestionar compras"],
    ["Calidad no factura", "Calidad", "Emitir facturas"],
    ["Compras no factura", "Compras", "Emitir facturas"],
    ["Calidad no registra pagos", "Calidad", "Registrar pagos"],
    ["Producción no gestiona clientes", "Producción", "Gestionar clientes"],
    ["Almacén no factura", "Almacén", "Emitir facturas"],
    ["Ingeniería no crea OC", "Ingeniería", "Gestionar compras"],
  ];
  for (const [label, role, perm] of negative) {
    const bad = has(role, perm);
    if (bad) fails++;
    console.log(`  ${bad ? "FALLA " : "OK    "} ${label.padEnd(34)} ${role} / ${perm}`);
  }

  console.log("\n### Reglas POSITIVAS del checklist (el rol SÍ debe tenerlo)");
  const positive: [string, string, string][] = [
    ["Almacén recibe OC", "Almacén", "Recibir compras"],
    ["Almacén gestiona entregas", "Almacén", "Gestionar entregas"],
    ["Almacén confirma entrega", "Almacén", "Confirmar entrega"],
    ["Calidad registra inspección", "Calidad", "Registrar inspección"],
    ["Calidad gestiona NCR", "Calidad", "Gestionar NCR"],
    ["Calidad libera cierre físico", "Calidad", "Liberar calidad"],
    ["Ventas emite facturas", "Ventas", "Emitir facturas"],
    ["Ventas registra pagos", "Ventas", "Registrar pagos"],
    ["Ventas gestiona cotizaciones", "Ventas", "Gestionar cotizaciones"],
    ["Compras gestiona compras", "Compras", "Gestionar compras"],
    ["Compras aprueba compras", "Compras", "Aprobar compras"],
    ["Producción programa OT", "Producción", "Programar OT"],
    ["Producción cierra OT", "Producción", "Cerrar OT"],
    ["Dirección gestiona sucursales", "Dirección", "Gestionar sucursales"],
    ["Dirección ve facturación", "Dirección", "Ver facturación"],
    ["Ingeniería libera diseño", "Ingeniería", "Liberar ingeniería"],
  ];
  for (const [label, role, perm] of positive) {
    const ok = has(role, perm);
    if (!ok) fails++;
    console.log(`  ${ok ? "OK    " : "FALLA "} ${label.padEnd(34)} ${role} / ${perm}`);
  }

  console.log(
    `\n### RESULTADO: ${fails === 0 ? "las 24 reglas se cumplen" : fails + " regla(s) incumplida(s)"}`,
  );

  await sql.end();
}

main().catch(async (e) => {
  console.error("FALLO:", e instanceof Error ? e.message : e);
  await sql.end();
  process.exit(1);
});
