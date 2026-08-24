import { config } from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq } from "drizzle-orm";
import * as XLSX from "xlsx";
import { customers, contacts, branches, quotes, orders, orderItems, productionOrders, users } from "./schema";

config({ path: ".env.local" });
config();

const CLIENT_CODE_MAP: Record<string, string> = {
  AMD: "3300",
  Align: "3350",
  BOYD: "3440",
  BRP: "3360",
  "CC Electronics": "3430",
  MAHLE: "3390",
  PROD: "4490",
  Sumitomo: "3320",
  Termocontroles: "3340",
};

const OFFICIAL_CUSTOMERS = [
  { code: "3300", legalName: "AMD México", tradeName: "AMD", type: "industrial" },
  { code: "3310", legalName: "STRATTEC", tradeName: "STRATTEC", type: "industrial" },
  { code: "3320", legalName: "SUMITOMO", tradeName: "Sumitomo", type: "industrial" },
  { code: "3330", legalName: "CONTITECH", tradeName: "ContiTech", type: "industrial" },
  { code: "3340", legalName: "TERMOCONTROLES", tradeName: "Termocontroles", type: "industrial" },
  { code: "3350", legalName: "ALIGN", tradeName: "Align", type: "industrial" },
  { code: "3360", legalName: "BRP", tradeName: "BRP", type: "industrial" },
  { code: "3370", legalName: "AMD USA", tradeName: "AMD USA", type: "industrial" },
  { code: "3380", legalName: "FLEXTRONICS", tradeName: "Flextronics", type: "industrial" },
  { code: "3390", legalName: "MHALE", tradeName: "Mahle", type: "industrial" },
  { code: "3400", legalName: "DIVERSOS TALLERES TRABAJO UNICO", tradeName: "Diversos Talleres", type: "otro" },
  { code: "3410", legalName: "TRISTONE", tradeName: "Tristone", type: "industrial" },
  { code: "3420", legalName: "TECMA", tradeName: "Tecma", type: "industrial" },
  { code: "3430", legalName: "CC ELECTRONIC", tradeName: "CC Electronics", type: "industrial" },
  { code: "3440", legalName: "BOYD", tradeName: "Boyd", type: "industrial" },
  { code: "3450", legalName: "GCC CEMENTOS", tradeName: "GCC Cementos", type: "industrial" },
  { code: "3460", legalName: "BEBIDAS MUNDIALES", tradeName: "Bebidas Mundiales", type: "comercial" },
  { code: "3470", legalName: "SUBENSAMBLES", tradeName: "Subensambles", type: "industrial" },
  { code: "3480", legalName: "ALETEC", tradeName: "Aletec", type: "industrial" },
  { code: "3490", legalName: "PROS MEXICANA", tradeName: "Pros Mexicana", type: "industrial" },
  { code: "3500", legalName: "JABIL", tradeName: "Jabil", type: "industrial" },
  { code: "3510", legalName: "BD", tradeName: "BD", type: "industrial" },
  { code: "3520", legalName: "INTEGER", tradeName: "Integer", type: "industrial" },
  { code: "3530", legalName: "MERCURY MARINE", tradeName: "Mercury Marine", type: "industrial" },
  { code: "3540", legalName: "WERNER", tradeName: "Werner", type: "industrial" },
  { code: "3550", legalName: "FOXCON", tradeName: "Foxcon", type: "industrial" },
  { code: "3560", legalName: "AMERICAN INDUSTRIAL", tradeName: "American Industrial", type: "industrial" },
  { code: "3570", legalName: "CONTROLES DE TEMPERATURA", tradeName: "Controles de Temperatura", type: "industrial" },
  { code: "3580", legalName: "CUSTOM PROFILE", tradeName: "Custom Profile", type: "industrial" },
  { code: "4490", legalName: "PROD USA", tradeName: "PROD USA", type: "industrial" },
];

function parseStatus(status: string): "pendiente" | "liberada" | "programada" | "en_produccion" | "pausada" | "esperando_material" | "calidad" | "terminada" | "entregada" | "cancelada" {
  switch (status?.toLowerCase()) {
    case "done": return "terminada";
    case "to do": return "pendiente";
    case "in process": return "en_produccion";
    default: return "pendiente";
  }
}

function generateId(): string {
  return crypto.randomUUID();
}

async function seedOfficialData() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");

  const client = postgres(url, { max: 1 });
  const db = drizzle(client);

  try {
    console.log("🚀 Iniciando carga de datos oficiales...\n");

    // 1. Limpiar datos anteriores
    console.log("🧹 Limpiando datos...");
    await db.execute(`TRUNCATE TABLE 
      invoice_payments, invoice_items, invoices, deliveries, ncrs, quality_inspections,
      purchase_receipt_items, purchase_receipts, purchase_order_items, purchase_orders,
      purchase_request_items, purchase_requests, inventory_movements, production_order_materials,
      labor_hours, machine_hours, production_downtime, production_rework, production_operations,
      production_orders, documents, engineering_hours, engineering_requests, order_items, orders,
      quote_items, quotes, projects, contacts, customers, activity_logs RESTART IDENTITY CASCADE`);
    await db.execute(`DELETE FROM inventory_balances`);
    await db.execute(`DELETE FROM materials`);
    await db.execute(`DELETE FROM supplier_materials`);
    await db.execute(`DELETE FROM suppliers`);
    console.log("✓ Datos limpios\n");

    // 2. Obtener sucursales
    const cjsBranch = await db.select().from(branches).where(eq(branches.code, "CJS")).limit(1);
    const gdlBranch = await db.select().from(branches).where(eq(branches.code, "GDL")).limit(1);
    
    if (cjsBranch.length === 0 || gdlBranch.length === 0) {
      throw new Error("Sucursales CJS o GDL no encontradas.");
    }

    // 3. Obtener usuario admin
    const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@amd-operations.local";
    const adminUser = await db.select().from(users).where(eq(users.email, adminEmail)).limit(1);
    const adminId = adminUser[0]?.id ?? null;

    // 4. Cargar clientes oficiales
    console.log("👥 Cargando clientes oficiales...");
    const customerIdMap: Record<string, string> = {};
    
    for (const customer of OFFICIAL_CUSTOMERS) {
      const id = generateId();
      customerIdMap[customer.code] = id;
      
      await db.insert(customers).values({
        id,
        code: customer.code,
        legalName: customer.legalName,
        tradeName: customer.tradeName,
        type: customer.type as any,
        status: "activo",
        country: "México",
        isDemo: false,
        createdBy: adminId,
        updatedBy: adminId,
        createdAt: new Date(),
        updatedAt: new Date(),
      }).onConflictDoNothing();

      await db.insert(contacts).values({
        id: generateId(),
        customerId: id,
        name: `Contacto ${customer.tradeName}`,
        isPrimary: true,
        isDemo: false,
        createdBy: adminId,
        updatedBy: adminId,
        createdAt: new Date(),
        updatedAt: new Date(),
      }).onConflictDoNothing();
    }
    console.log(`✓ ${OFFICIAL_CUSTOMERS.length} clientes cargados\n`);

    // 5. Cargar OTs de Juárez
    console.log("🏭 Cargando OTs de Ciudad Juárez...");
    const juarezWB = XLSX.readFile("/mnt/c/Users/ElJua/Documents/amd-docs/files-docs/PROGRAMA  DE PRODUCCION  AMD 2026 (Agosto).xlsx");
    const juarezWS = juarezWB.Sheets["Plan Produccion 2026"];
    const juarezData = XLSX.utils.sheet_to_json(juarezWS, { header: 1, defval: "" }) as any[][];
    
    let juarezCount = 0;
    const juarezOTs = new Map<string, { customerCode: string; parts: any[] }>();

    for (let i = 2; i < juarezData.length; i++) {
      const row = juarezData[i];
      if (!row[0]) continue;
      
      const otNumber = String(row[0]);
      const planta = String(row[1]);
      const qty = Number(row[5]) || 1;
      const partNumber = String(row[6]);
      const description = String(row[7]);
      const status = String(row[10]);
      const avance = Number(row[11]) || 0;
      const comments = String(row[12]);
      
      const clientCode = CLIENT_CODE_MAP[planta];
      if (!clientCode) continue;

      if (!juarezOTs.has(otNumber)) {
        juarezOTs.set(otNumber, { customerCode: clientCode, parts: [] });
      }
      juarezOTs.get(otNumber)!.parts.push({ qty, partNumber, description, status, avance, comments });
    }

    for (const [otNumber, otData] of juarezOTs) {
      const customerId = customerIdMap[otData.customerCode];
      if (!customerId) continue;

      const quoteId = generateId();
      const orderId = generateId();

      // Crear Quote vacía (solo para relación)
      await db.insert(quotes).values({
        id: quoteId,
        number: `COT-${otNumber.replace("OT", "")}`,
        customerId,
        issueDate: new Date(),
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        currency: "mxn",
        paymentTerms: "30 días",
        paymentTerm: "net_30",
        leadTime: "15 días hábiles",
        rfqType: "solo_fabricacion",
        engineeringStatus: "no_requerida",
        status: "borrador",
        subtotal: "0",
        taxTotal: "0",
        total: "0",
        estimatedCost: "0",
        estimatedProfit: "0",
        branchId: cjsBranch[0].id,
        branchName: cjsBranch[0].name,
        branchCode: cjsBranch[0].code,
        isDemo: false,
        createdBy: adminId,
        updatedBy: adminId,
        createdAt: new Date(),
        updatedAt: new Date(),
      }).onConflictDoNothing();

      // Crear Order
      await db.insert(orders).values({
        id: orderId,
        number: `AMD-${otNumber.replace("OT", "")}`,
        customerId,
        quoteId,
        origin: "rfq_directa",
        currency: "mxn",
        total: "0",
        status: "en_produccion",
        branchId: cjsBranch[0].id,
        isDemo: false,
        createdBy: adminId,
        updatedBy: adminId,
        createdAt: new Date(),
        updatedAt: new Date(),
      }).onConflictDoNothing();

      // Crear Production Orders (una por parte)
      for (const part of otData.parts) {
        await db.insert(productionOrders).values({
          id: generateId(),
          number: `${otNumber}-${part.partNumber}`,
          orderId,
          customerId,
          quoteId,
          origin: "rfq_directa",
          description: part.description,
          partNumber: part.partNumber,
          quantity: String(part.qty),
          unit: "pza",
          promisedDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
          priority: "programada",
          status: parseStatus(part.status),
          notes: part.comments || null,
          isDemo: false,
          createdBy: adminId,
          updatedBy: adminId,
          createdAt: new Date(),
          updatedAt: new Date(),
        }).onConflictDoNothing();
        juarezCount++;
      }
    }
    console.log(`✓ ${juarezOTs.size} OTs de Juárez (${juarezCount} partes)\n`);

    // 6. Cargar OTs de Guadalajara
    console.log("🏭 Cargando OTs de Guadalajara...");
    const gdlWB = XLSX.readFile("/mnt/c/Users/ElJua/Documents/amd-docs/files-docs/Plan de Produccion AMD Guadalajara^L.xlsx");
    const gdlWS = gdlWB.Sheets["Hoja1"];
    const gdlData = XLSX.utils.sheet_to_json(gdlWS, { header: 1, defval: "" }) as any[][];
    
    let gdlCount = 0;
    const gdlOTs = new Map<string, { parts: any[] }>();

    for (let i = 4; i < gdlData.length; i++) {
      const row = gdlData[i];
      if (!row[0]) continue;
      
      const otNumber = String(row[0]);
      const avance = Number(row[2]) || 0;
      const qty = Number(row[3]) || 1;
      const partNumber = String(row[6]);
      const observaciones = String(row[11]);
      
      if (!gdlOTs.has(otNumber)) {
        gdlOTs.set(otNumber, { parts: [] });
      }
      gdlOTs.get(otNumber)!.parts.push({ avance, qty, partNumber, observaciones });
    }

    for (const [otNumber, otData] of gdlOTs) {
      const customerId = customerIdMap["4490"]; // PROD USA
      if (!customerId) continue;

      const quoteId = generateId();
      const orderId = generateId();

      await db.insert(quotes).values({
        id: quoteId,
        number: `COT-GDL-${otNumber}`,
        customerId,
        issueDate: new Date(),
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        currency: "mxn",
        paymentTerms: "30 días",
        paymentTerm: "net_30",
        leadTime: "15 días hábiles",
        rfqType: "solo_fabricacion",
        engineeringStatus: "no_requerida",
        status: "borrador",
        subtotal: "0",
        taxTotal: "0",
        total: "0",
        estimatedCost: "0",
        estimatedProfit: "0",
        branchId: gdlBranch[0].id,
        branchName: gdlBranch[0].name,
        branchCode: gdlBranch[0].code,
        isDemo: false,
        createdBy: adminId,
        updatedBy: adminId,
        createdAt: new Date(),
        updatedAt: new Date(),
      }).onConflictDoNothing();

      await db.insert(orders).values({
        id: orderId,
        number: `AMD-GDL-${otNumber}`,
        customerId,
        quoteId,
        origin: "rfq_directa",
        currency: "mxn",
        total: "0",
        status: "en_produccion",
        branchId: gdlBranch[0].id,
        isDemo: false,
        createdBy: adminId,
        updatedBy: adminId,
        createdAt: new Date(),
        updatedAt: new Date(),
      }).onConflictDoNothing();

      for (const part of otData.parts) {
        await db.insert(productionOrders).values({
          id: generateId(),
          number: `${otNumber}-${part.partNumber}`,
          orderId,
          customerId,
          quoteId,
          origin: "rfq_directa",
          description: part.partNumber,
          partNumber: part.partNumber,
          quantity: String(part.qty),
          unit: "pza",
          promisedDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
          priority: "programada",
          status: part.avance >= 1 ? "terminada" : "en_produccion",
          notes: part.observaciones || null,
          isDemo: false,
          createdBy: adminId,
          updatedBy: adminId,
          createdAt: new Date(),
          updatedAt: new Date(),
        }).onConflictDoNothing();
        gdlCount++;
      }
    }
    console.log(`✓ ${gdlOTs.size} OTs de Guadalajara (${gdlCount} partes)\n`);

    console.log("✅ Carga completada!");
    console.log(`   - ${OFFICIAL_CUSTOMERS.length} clientes oficiales`);
    console.log(`   - ${juarezOTs.size} OTs de Juárez (${juarezCount} partes)`);
    console.log(`   - ${gdlOTs.size} OTs de Guadalajara (${gdlCount} partes)`);

  } finally {
    await client.end({ timeout: 5 });
  }
}

seedOfficialData().catch((error) => {
  console.error(error);
  process.exit(1);
});
