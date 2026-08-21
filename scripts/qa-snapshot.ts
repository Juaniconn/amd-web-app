import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL!, { max: 1 });

function show(title: string, rows: Record<string, unknown>[]) {
  console.log(`\n### ${title}`);
  if (rows.length === 0) {
    console.log("  (sin filas)");
    return;
  }
  for (const r of rows) {
    console.log(
      "  " +
        Object.entries(r)
          .map(([k, v]) => `${k}=${v === null ? "NULL" : String(v)}`)
          .join("  "),
    );
  }
}

async function main() {
  show(
    "production_orders (OT)",
    await sql`select number, status, quantity, part_number, priority
              from production_orders order by number`,
  );

  show(
    "orders (pedidos)",
    await sql`select number, status, origin, currency, total from orders order by number`,
  );

  show(
    "quotes",
    await sql`select number, status, currency, branch_code, payment_term, addressee_mode
              from quotes order by number`,
  );

  show(
    "quote_items (IVA por partida)",
    await sql`select q.number as cotizacion, qi.tax_percent as iva, qi.quantity as cant,
                     left(qi.description, 28) as descripcion
              from quote_items qi join quotes q on q.id = qi.quote_id
              order by q.number, qi.position`,
  );

  show(
    "branches (sucursales oficiales)",
    await sql`select code, name, city, country, status from branches order by code`,
  );

  show(
    "compras",
    await sql`select
        (select count(*) from suppliers) as proveedores,
        (select count(*) from purchase_requests) as solicitudes,
        (select count(*) from purchase_orders) as ordenes_compra,
        (select count(*) from purchase_receipts) as recepciones`,
  );

  show(
    "calidad / entregas / facturacion",
    await sql`select
        (select count(*) from quality_inspections) as inspecciones,
        (select count(*) from ncrs) as ncrs,
        (select count(*) from deliveries) as entregas,
        (select count(*) from invoices) as facturas,
        (select count(*) from invoice_payments) as pagos`,
  );

  show(
    "inventario",
    await sql`select
        (select count(*) from materials) as materiales,
        (select count(*) from inventory_movements) as movimientos`,
  );

  show(
    "customers (telefonos y direccion de envio)",
    await sql`select code, name, phone, shipping_city, shipping_country from customers order by code`,
  );

  await sql.end();
}

main().catch(async (e) => {
  console.error("FALLO:", e instanceof Error ? e.message : e);
  await sql.end();
  process.exit(1);
});
