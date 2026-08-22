import { and, eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { formatQty } from "@/lib/inventory/catalog";
import { calculateLineTotals, calculateQuoteTotals, formatMoney } from "@/lib/quotes/money";
import { activitySummary } from "@/lib/audit/activity";
import {
  customers,
  machines,
  materials,
  inventoryBalances,
  quotes,
  quoteItems,
  orders,
  orderItems,
  productionOrders,
  productionOperations,
  qualityInspections,
  deliveries,
  invoices,
  invoicePayments,
  activityLogs,
  suppliers,
  documents,
  purchaseOrders,
  purchaseOrderItems,
  purchaseReceipts,
  purchaseReceiptItems,
  contacts,
  engineeringRequests,
  ncrs,
  users,
  accounts,
  userRoles,
} from "@/db/schema";
import { hashPassword } from "better-auth/crypto";
import { customerTypeEnum } from "@/db/schema/crm";
import { materialCategoryEnum } from "@/db/schema/inventory";
import { machineStatusEnum } from "@/db/schema/production";

type Actor = { id: string; name: string } | null;

const YEAR = new Date().getFullYear();
const now = new Date();

function daysFromNow(days: number) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

const CLIENTS = [
  { code: "Bravo", name: "Industrias del Bravo S.A. de C.V.", rfc: "IBR850615XX1", city: "Ciudad Juárez", type: "maquiladora" },
  { code: "Stampings", name: "Precision Stampings LLC", rfc: null, city: "El Paso", type: "industrial" },
  { code: "AutoNorte", name: "AutoPartes del Norte S.A. de C.V.", rfc: "APN880101XX1", city: "Monterrey", type: "automotriz" },
  { code: "MetalSur", name: "Metalmecánica Sur S.A. de C.V.", rfc: "MSM900315XX1", city: "Guadalajara", type: "industrial" },
  { code: "ValleMca", name: "Maquiladora del Valle S.A. de C.V.", rfc: "MVL920420XX1", city: "Reynosa", type: "maquiladora" },
  { code: "AeroMex", name: "Aeroespacial México S.A. de C.V.", rfc: "AME950630XX1", city: "Querétaro", type: "aeroespacial" },
  { code: "ElectroPac", name: "Electrodomésticos del Pacífico S.A. de C.V.", rfc: "EPP970812XX1", city: "Guadalajara", type: "comercial" },
  { code: "HerrCentro", name: "Herramental del Centro S.A. de C.V.", rfc: "HDC990101XX1", city: "San Luis Potosí", type: "industrial" },
  { code: "ValvulasGolfo", name: "Tubería y Válvulas del Golfo S.A. de C.V.", rfc: "TVG001215XX1", city: "Tampico", type: "petrolera" },
  { code: "EstrucOeste", name: "Estructuras Metálicas Oeste S.A. de C.V.", rfc: "EMO010320XX1", city: "Mazatlán", type: "construccion" },
];

const SUPPLIERS = [
  { code: "ACEROS-NAL", name: "Aceros Nacionales S.A.", material: "Acero A36" },
  { code: "ALUM-MEX", name: "Aluminios de México S.A.", material: "Aluminio 6061" },
  { code: "SS-IMP", name: "Stainless Imports LLC", material: "Acero inoxidable" },
  { code: "METAL-DEL", name: "Metales del Norte S.A.", material: "Lámina galvanizada" },
  { code: "CONSUMIBLES-T", name: "Consumibles Técnicos S.A.", material: "Electrodos y gases" },
];

const MATERIALS_POOL = [
  { code: "A36-3MM", desc: "Lámina A36 3mm", cost: 55 },
  { code: "A36-6MM", desc: "Lámina A36 6mm", cost: 48 },
  { code: "A36-10MM", desc: "Lámina A36 10mm", cost: 42 },
  { code: "SS304-3MM", desc: "Lámina SS304 3mm", cost: 180 },
  { code: "SS316-6MM", desc: "Lámina SS316 6mm", cost: 220 },
  { code: "AL6061-BAR", desc: "Barra AL6061", cost: 95 },
  { code: "AL7075-BAR", desc: "Barra AL7075", cost: 145 },
  { code: "GALV-2MM", desc: "Lámina galvanizada 2mm", cost: 38 },
  { code: "TUBO-RED-2", desc: "Tubería redonda 2\"", cost: 65 },
  { code: "TUBO-CUA-3", desc: "Tubería cuadrada 3\"", cost: 72 },
  { code: "ELECT-7018", desc: "Electrodo E7018", cost: 12 },
  { code: "GAS-ARGON", desc: "Gas argón industrial", cost: 85 },
  { code: "CO2-IND", desc: "CO2 industrial", cost: 25 },
];

const OPERATORS = [
  { id: "op-juan-martinez", name: "Juan Martínez", email: "juan.martinez@amd-demo.local" },
  { id: "op-ramiro-sanchez", name: "Ramiro Sánchez", email: "ramiro.sanchez@amd-demo.local" },
  { id: "op-luis-hernandez", name: "Luis Hernández", email: "luis.hernandez@amd-demo.local" },
  { id: "op-ana-torres", name: "Ana Torres", email: "ana.torres@amd-demo.local" },
  { id: "op-carlos-diaz", name: "Carlos Díaz", email: "carlos.diaz@amd-demo.local" },
  { id: "op-maria-lopez", name: "María López", email: "maria.lopez@amd-demo.local" },
  { id: "op-roberto-garcia", name: "Roberto García", email: "roberto.garcia@amd-demo.local" },
  { id: "op-patricia-ramirez", name: "Patricia Ramírez", email: "patricia.ramirez@amd-demo.local" },
];

const PROCESS_NAMES = [
  "Corte láser",
  "Plegado / Press brake",
  "Soldadura MIG",
  "Soldadura TIG",
  "Maquinado CNC",
  "Torneado",
  "Rectificado",
  "Tratamiento térmico",
  "Pintura electrostática",
  "Ensamble",
  "Inspección final",
  "Empaque",
];

const PART_TEMPLATES = [
  { number: "FX", description: "Fixture de ensamble" },
  { number: "CUB", description: "Cubierta de protección" },
  { number: "SOP", description: "Soporte estructural" },
  { number: "CHS", description: "Chasis principal" },
  { number: "PNL", description: "Panel de control" },
  { number: "CMP", description: "Componente mecánico" },
  { number: "TRJ", description: "Troquel de precisión" },
  { number: "BDG", description: "Brida de conexión" },
  { number: "VG-EST", description: "Viga estructural" },
  { number: "CRN", description: "Carcasa exterior" },
  { number: "INS", description: "Insertos de herramental" },
  { number: "EJE", description: "Eje de transmisión" },
];

export async function seedFullDemo(db: PostgresJsDatabase, actor: Actor) {
  console.log("🚀 Iniciando seed completo de demo...");

  // ==========================================
  // 0. UPDATE MACHINE STATUSES (for demo)
  // ==========================================
  const machineStatuses = ["disponible", "en_produccion", "ocupada", "mantenimiento", "fuera_de_servicio"];
  const allMachines = await db.select().from(machines);
  for (let i = 0; i < allMachines.length; i++) {
    const status = machineStatuses[i % machineStatuses.length] as any;
    await db.update(machines).set({ status }).where(eq(machines.id, allMachines[i].id));
  }
  console.log(`✓ Estados de máquinas actualizados`);

  // ==========================================
  // 1. OPERATORS (users with role produccion)
  // ==========================================
  for (const op of OPERATORS) {
    const hashed = await hashPassword("operador123");
    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, op.id))
      .limit(1);

    if (existing.length === 0) {
      await db.insert(users).values({
        id: op.id,
        name: op.name,
        email: op.email,
        emailVerified: true,
        createdAt: now,
        updatedAt: now,
      });
    } else {
      // Corregir email/nombre si cambiaron (ej. correos viejos con guion)
      await db
        .update(users)
        .set({ name: op.name, email: op.email, emailVerified: true, updatedAt: now })
        .where(eq(users.id, op.id));
    }

    // Asegurar credencial con password conocido
    const account = await db
      .select({ id: accounts.id })
      .from(accounts)
      .where(eq(accounts.id, `acc-${op.id}`))
      .limit(1);

    if (account.length === 0) {
      await db.insert(accounts).values({
        id: `acc-${op.id}`,
        accountId: op.id,
        providerId: "credential",
        userId: op.id,
        password: hashed,
        createdAt: now,
        updatedAt: now,
      });
    } else {
      await db
        .update(accounts)
        .set({ password: hashed, updatedAt: now })
        .where(eq(accounts.id, `acc-${op.id}`));
    }

    // Asegurar rol de producción
    const role = await db
      .select({ userId: userRoles.userId })
      .from(userRoles)
      .where(and(eq(userRoles.userId, op.id), eq(userRoles.roleId, "produccion")))
      .limit(1);

    if (role.length === 0) {
      await db.insert(userRoles).values({
        userId: op.id,
        roleId: "produccion",
        createdAt: now,
      });
    }
  }
  console.log(`✓ ${OPERATORS.length} operadores listos (password: operador123)`);

  // ==========================================
  // 2. SUPPLIERS
  // ==========================================
  const supplierIds: string[] = [];
  for (let i = 0; i < SUPPLIERS.length; i++) {
    const sup = SUPPLIERS[i];
    const id = `demo-sup-${i + 1}`;
    supplierIds.push(id);
    await db.insert(suppliers).values({
      id,
      code: sup.code,
      legalName: sup.name,
      contactName: `Contacto ${sup.name.split(" ")[0]}`,
      email: `ventas@${sup.code.toLowerCase().replace(/[^a-z]/g, "")}.example`,
      phone: `(${Math.floor(Math.random() * 900) + 100})-${Math.floor(Math.random() * 9000) + 1000}`,
      city: "Monterrey",
      country: "México",
      status: "activo",
      usedInCalculator: i < 3,
      isDemo: true,
      createdBy: actor?.id ?? null,
      updatedBy: actor?.id ?? null,
      createdAt: now,
      updatedAt: now,
    }).onConflictDoNothing();
  }
  console.log(`✓ ${SUPPLIERS.length} proveedores creados`);

  // ==========================================
  // 3. MATERIALS
  // ==========================================
  const materialIds: string[] = [];
  for (let i = 0; i < MATERIALS_POOL.length; i++) {
    const mat = MATERIALS_POOL[i];
    const id = `demo-mat-${i + 1}`;
    materialIds.push(id);
    await db.insert(materials).values({
      id,
      code: mat.code,
      description: mat.desc,
      category: materialCategoryEnum.enumValues[0],
      unitId: "uom-kg",
      warehouseId: "wh-mp",
      supplierId: supplierIds[i % supplierIds.length] || null,
      isCritical: i < 5,
      active: true,
      minStock: formatQty(20),
      costPerKg: formatMoney(mat.cost, 4),
      usedInCalculator: i < 4,
      isDemo: true,
      createdBy: actor?.id ?? null,
      updatedBy: actor?.id ?? null,
      createdAt: now,
      updatedAt: now,
    }).onConflictDoNothing();

    await db.insert(inventoryBalances).values({
      id: `demo-bal-${i + 1}`,
      materialId: id,
      warehouseId: "wh-mp",
      onHand: formatQty(Math.floor(Math.random() * 800) + 100),
      reserved: formatQty(Math.floor(Math.random() * 50)),
      updatedAt: now,
    }).onConflictDoNothing();
  }
  console.log(`✓ ${MATERIALS_POOL.length} materiales con inventario`);

  // ==========================================
  // 4. CUSTOMERS
  // ==========================================
  const customerIds: string[] = [];
  for (let i = 0; i < CLIENTS.length; i++) {
    const client = CLIENTS[i];
    const id = `demo-customer-${i + 1}`;
    customerIds.push(id);
    await db.insert(customers).values({
      id,
      code: `CLI-${YEAR}-${String(i + 1).padStart(5, "0")}`,
      legalName: client.name,
      tradeName: client.code,
      rfc: client.rfc,
      phone: `(${Math.floor(Math.random() * 900) + 100})-${Math.floor(Math.random() * 9000) + 1000}`,
      email: `contacto@${client.code.toLowerCase()}.example`,
      address: `Av. Industrial ${Math.floor(Math.random() * 1000) + 100}`,
      city: client.city,
      state: "México",
      country: "México",
      shippingSameAsBilling: Math.random() > 0.3,
      shippingAddress: `Puerta ${Math.floor(Math.random() * 5) + 1}`,
      shippingCity: client.city,
      shippingState: "México",
      type: customerTypeEnum.enumValues[0],
      status: "activo",
      notes: `Cliente demo ${i + 1}`,
      isDemo: true,
      createdBy: actor?.id ?? null,
      updatedBy: actor?.id ?? null,
      createdAt: daysFromNow(-Math.floor(Math.random() * 60) - 30),
      updatedAt: now,
    }).onConflictDoNothing();

    await db.insert(contacts).values({
      id: `demo-contact-${i + 1}`,
      customerId: id,
      name: `Contacto ${client.code}`,
      title: "Compras",
      email: `contacto@${client.code.toLowerCase()}.example`,
      phone: `656-123-${String(i).padStart(4, "0")}`,
      isPrimary: true,
      isDemo: true,
      createdBy: actor?.id ?? null,
      updatedBy: actor?.id ?? null,
      createdAt: now,
      updatedAt: now,
    }).onConflictDoNothing();
  }
  console.log(`✓ ${CLIENTS.length} clientes con contactos`);

  // ==========================================
  // 5. QUOTES (30 quotes, each with 1-8 parts)
  // ==========================================
  let otCounter = 0;

  for (let q = 0; q < 30; q++) {
    const customerId = customerIds[q % customerIds.length];
    const numParts = 1 + Math.floor(Math.random() * 8); // 1 to 8 parts per quote

    // Generate lines for each part
    const lines: ReturnType<typeof calculateLineTotals>[] = [];
    for (let p = 0; p < numParts; p++) {
      const partTemplate = PART_TEMPLATES[(q + p) % PART_TEMPLATES.length];
      const qty = 5 + Math.floor(Math.random() * 50);
      const unitPrice = 200 + Math.floor(Math.random() * 3000);
      const line = calculateLineTotals({
        quantity: qty,
        unitPrice,
        discountPercent: 0,
        taxPercent: q % 5 === 3 ? 0 : 16, // Some USD quotes with 0% tax
        estimatedCost: unitPrice * 0.35,
      });
      lines.push(line);
    }
    const totals = calculateQuoteTotals(lines);

    const quoteNum = `COT-${YEAR}-${String(q + 1).padStart(5, "0")}`;
    const quoteId = `demo-quote-${q + 1}`;
    const contactId = `demo-contact-${(q % customerIds.length) + 1}`;

    const quoteStatus = q % 5 === 0 ? "convertida" : q % 5 === 1 ? "enviada" : q % 5 === 2 ? "borrador" : q % 5 === 3 ? "en_revision" : "aprobada";

    await db.insert(quotes).values({
      id: quoteId,
      number: quoteNum,
      customerId,
      contactId,
      ownerUserId: actor?.id ?? null,
      issueDate: daysFromNow(-Math.floor(Math.random() * 30) - 5),
      validUntil: daysFromNow(Math.floor(Math.random() * 20) + 10),
      currency: q % 5 === 3 ? "usd" : "mxn",
      paymentTerms: "30 días",
      paymentTerm: "net_30",
      leadTime: `${10 + Math.floor(Math.random() * 10)} días hábiles`,
      notes: `Cotización demo ${q + 1} con ${numParts} partes`,
      addresseeMode: q % 2 === 0 ? "nombre" : "departamento",
      branchId: "amd-branch-cjs",
      branchName: "Ciudad Juárez",
      branchCode: "CJS",
      shippingAddress: "Puerta 3, Parque Industrial",
      shippingCity: "Ciudad Juárez",
      shippingState: "Chihuahua",
      shippingPostalCode: "32600",
      shippingCountry: "México",
      rfqType: q % 3 === 0 ? "diseno_fabricacion" : q % 3 === 1 ? "solo_fabricacion" : "diseno_solamente",
      requiresEngineering: q % 3 === 0,
      engineeringStatus: q % 3 === 0 ? "liberada" : "no_requerida",
      status: quoteStatus,
      subtotal: formatMoney(totals.subtotal),
      taxTotal: formatMoney(totals.taxTotal),
      total: formatMoney(totals.total),
      estimatedCost: formatMoney(totals.estimatedCost),
      estimatedProfit: formatMoney(totals.estimatedProfit),
      marginPercent: totals.marginPercent === null ? null : formatMoney(totals.marginPercent),
      isDemo: true,
      createdBy: actor?.id ?? null,
      updatedBy: actor?.id ?? null,
      createdAt: daysFromNow(-Math.floor(Math.random() * 40)),
      updatedAt: now,
    }).onConflictDoNothing();

    // Create quote items
    for (let p = 0; p < numParts; p++) {
      const partTemplate = PART_TEMPLATES[(q + p) % PART_TEMPLATES.length];
      const qty = 5 + Math.floor(Math.random() * 50);
      const unitPrice = 200 + Math.floor(Math.random() * 3000);

      await db.insert(quoteItems).values({
        id: `${quoteId}-item-${p + 1}`,
        quoteId,
        position: p + 1,
        kind: "pieza",
        description: `${partTemplate.description} ${partTemplate.number}-${String(q + 1).padStart(3, "0")}`,
        partNumber: `${partTemplate.number}-${q + 1}-${p + 1}`,
        quantity: formatQty(qty),
        unit: "pza",
        unitPrice: formatMoney(unitPrice, 4),
        discountPercent: "0",
        taxPercent: q % 5 === 3 ? "0" : "16",
        estimatedCost: formatMoney(unitPrice * 0.35, 4),
        lineSubtotal: formatMoney(lines[p].lineSubtotal),
        lineTax: formatMoney(lines[p].lineTax),
        lineTotal: formatMoney(lines[p].lineTotal),
        lineEstimatedCost: formatMoney(lines[p].lineEstimatedCost),
        lineProfit: formatMoney(lines[p].lineProfit),
        lineMarginPercent: lines[p].lineMarginPercent !== null ? formatMoney(lines[p].lineMarginPercent!) : null,
        createdAt: now,
        updatedAt: now,
      }).onConflictDoNothing();
    }

    // ==========================================
    // 6. ORDER + ENGINEERING (if converted)
    // ==========================================
    if (quoteStatus === "convertida" || quoteStatus === "aprobada") {
      const orderNum = `AMD-${YEAR}-${String(q + 1).padStart(5, "0")}`;
      const orderId = `demo-order-${q + 1}`;

      // Create engineering request if needed
      let engineeringId: string | null = null;
      if (q % 3 === 0) {
        engineeringId = `demo-eng-${q + 1}`;
        await db.insert(engineeringRequests).values({
          id: engineeringId,
          number: `ING-${YEAR}-${String(q + 1).padStart(5, "0")}`,
          customerId,
          quoteId,
          assigneeUserId: actor?.id ?? null,
          description: `Ingeniería para ${quoteNum}`,
          projectType: "diseno_nuevo",
          priority: q % 2 === 0 ? "alta" : "media",
          dueDate: daysFromNow(15),
          status: "liberado",
          hoursLogged: formatMoney(8 + Math.floor(Math.random() * 20)),
          releasedAt: daysFromNow(-Math.floor(Math.random() * 10)),
          isDemo: true,
          createdBy: actor?.id ?? null,
          updatedBy: actor?.id ?? null,
          createdAt: daysFromNow(-Math.floor(Math.random() * 20)),
          updatedAt: now,
        }).onConflictDoNothing();
      }

      await db.insert(orders).values({
        id: orderId,
        number: orderNum,
        customerId,
        quoteId,
        origin: q % 3 === 0 ? "rfq_ingenieria" : "rfq_directa",
        engineeringRequestId: engineeringId,
        ownerUserId: actor?.id ?? null,
        promisedDate: daysFromNow(Math.floor(Math.random() * 14) + 7),
        notes: `Orden demo ${q + 1}`,
        currency: q % 5 === 3 ? "usd" : "mxn",
        total: formatMoney(totals.total),
        status: q % 3 === 0 ? "en_produccion" : "aprobado",
        branchId: "amd-branch-cjs",
        isDemo: true,
        createdBy: actor?.id ?? null,
        updatedBy: actor?.id ?? null,
        createdAt: daysFromNow(-Math.floor(Math.random() * 15)),
        updatedAt: now,
      }).onConflictDoNothing();

      // Create order items
      for (let p = 0; p < numParts; p++) {
        const partTemplate = PART_TEMPLATES[(q + p) % PART_TEMPLATES.length];
        const qty = 5 + Math.floor(Math.random() * 50);
        const unitPrice = 200 + Math.floor(Math.random() * 3000);

        await db.insert(orderItems).values({
          id: `${orderId}-item-${p + 1}`,
          orderId,
          position: p + 1,
          kind: "pieza",
          description: `${partTemplate.description} ${partTemplate.number}-${String(q + 1).padStart(3, "0")}`,
          partNumber: `${partTemplate.number}-${q + 1}-${p + 1}`,
          quantity: formatQty(qty),
          unit: "pza",
          unitPrice: formatMoney(unitPrice, 4),
          discountPercent: "0",
          taxPercent: q % 5 === 3 ? "0" : "16",
          lineSubtotal: formatMoney(lines[p].lineSubtotal),
          lineTax: formatMoney(lines[p].lineTax),
          lineTotal: formatMoney(lines[p].lineTotal),
        }).onConflictDoNothing();
      }

      // ==========================================
      // 7. PURCHASE ORDER (if order needs materials)
      // ==========================================
      if (q % 2 === 0) {
        const poNum = `OC-${YEAR}-${String(q + 1).padStart(5, "0")}`;
        const poId = `demo-po-${q + 1}`;

        await db.insert(purchaseOrders).values({
          id: poId,
          number: poNum,
          supplierId: supplierIds[q % supplierIds.length],
          branchId: "amd-branch-cjs",
          orderId,
          issueDate: daysFromNow(-Math.floor(Math.random() * 10)),
          expectedDate: daysFromNow(7),
          currency: "mxn",
          paymentTerm: "net_30",
          isUrgent: q % 4 === 0,
          status: q % 3 === 0 ? "recibida" : "enviada",
          subtotal: formatMoney(totals.estimatedCost),
          taxTotal: formatMoney(totals.estimatedCost * 0.16),
          total: formatMoney(totals.estimatedCost * 1.16),
          isDemo: true,
          createdBy: actor?.id ?? null,
          updatedBy: actor?.id ?? null,
          createdAt: now,
          updatedAt: now,
        }).onConflictDoNothing();

        await db.insert(purchaseOrderItems).values({
          id: `${poId}-item-1`,
          purchaseOrderId: poId,
          position: 1,
          materialId: materialIds[q % materialIds.length],
          warehouseId: "wh-mp",
          description: `Material para ${orderNum}`,
          quantity: formatQty(100),
          receivedQty: q % 3 === 0 ? formatQty(100) : "0",
          unitPrice: formatMoney(MATERIALS_POOL[q % MATERIALS_POOL.length].cost, 4),
          taxPercent: "16",
          lineSubtotal: formatMoney(totals.estimatedCost),
          lineTax: formatMoney(totals.estimatedCost * 0.16),
          lineTotal: formatMoney(totals.estimatedCost * 1.16),
          createdAt: now,
        }).onConflictDoNothing();

        if (q % 3 === 0) {
          const receiptNum = `REC-${YEAR}-${String(q + 1).padStart(5, "0")}`;
          const receiptId = `demo-rec-${q + 1}`;

          await db.insert(purchaseReceipts).values({
            id: receiptId,
            number: receiptNum,
            purchaseOrderId: poId,
            receivedAt: daysFromNow(-Math.floor(Math.random() * 3)),
            notes: "Recepción completa",
            createdBy: actor?.id ?? null,
            createdAt: now,
          }).onConflictDoNothing();

          await db.insert(purchaseReceiptItems).values({
            id: `${receiptId}-item-1`,
            receiptId,
            purchaseOrderItemId: `${poId}-item-1`,
            quantity: formatQty(100),
          }).onConflictDoNothing();
        }
      }

      // ==========================================
      // 8. PRODUCTION ORDERS (one per part)
      // ==========================================
      for (let p = 0; p < numParts; p++) {
        if (q % 2 !== 0 && p > 2) continue; // Only create OT for some parts

        otCounter++;
        const partTemplate = PART_TEMPLATES[(q + p) % PART_TEMPLATES.length];
        const otNum = `OT-${YEAR}-${String(otCounter).padStart(5, "0")}`;
        const otId = `demo-ot-${otCounter}`;
        const qty = 5 + Math.floor(Math.random() * 50);

        const otStatus = p % 5 === 0 ? "en_produccion" : p % 5 === 1 ? "terminada" : p % 5 === 2 ? "calidad" : p % 5 === 3 ? "programada" : "liberada";

        await db.insert(productionOrders).values({
          id: otId,
          number: otNum,
          orderId,
          orderItemId: `${orderId}-item-${p + 1}`,
          customerId,
          quoteId,
          origin: q % 3 === 0 ? "rfq_ingenieria" : "rfq_directa",
          routeId: p % 3 === 0 ? "route-a" : p % 3 === 1 ? "route-b" : null,
          description: `${partTemplate.description} ${partTemplate.number}-${String(q + 1).padStart(3, "0")}`,
          partNumber: `${partTemplate.number}-${q + 1}-${p + 1}`,
          quantity: formatQty(qty),
          unit: "pza",
          promisedDate: daysFromNow(Math.floor(Math.random() * 10) + 5),
          priority: p % 4 === 0 ? "urgente" : p % 4 === 1 ? "compromiso_inmediato" : "programada",
          status: otStatus,
          notes: `OT demo ${otCounter}`,
          workCenterId: p % 3 === 0 ? "wc-cnc" : p % 3 === 1 ? "wc-laser" : "wc-ensamble",
          machineId: p % 3 === 0 ? "m-vmc-1" : p % 3 === 1 ? "m-laser-1" : p % 3 === 2 ? "m-press-brake" : null,
          operatorUserId: p % 2 === 0 ? OPERATORS[p % OPERATORS.length].id : null,
          releasedAt: p % 5 >= 3 ? daysFromNow(-Math.floor(Math.random() * 5) - 2) : null,
          scheduledAt: p % 5 >= 3 ? daysFromNow(-Math.floor(Math.random() * 3) - 1) : null,
          startedAt: p % 5 === 0 ? daysFromNow(-1) : null,
          qualityAt: p % 5 === 2 ? now : null,
          physicallyClosedAt: p % 5 === 1 ? now : null,
          deliveredAt: p % 5 === 1 ? daysFromNow(1) : null,
          isDemo: true,
          createdBy: actor?.id ?? null,
          updatedBy: actor?.id ?? null,
          createdAt: daysFromNow(-Math.floor(Math.random() * 15)),
          updatedAt: now,
        }).onConflictDoNothing();

        // Create operations (processes) for this OT
        const numProcesses = 3 + Math.floor(Math.random() * 6);
        for (let proc = 0; proc < numProcesses; proc++) {
          const procStatus = proc < numProcesses - 2 ? "terminada" : proc === numProcesses - 2 ? (p % 5 === 0 ? "en_proceso" : "pendiente") : "pendiente";

          await db.insert(productionOperations).values({
            id: `${otId}-op-${proc + 1}`,
            productionOrderId: otId,
            position: proc + 1,
            kind: proc === numProcesses - 1 ? "calidad" : proc === 0 ? "produccion" : "produccion",
            workCenterId: proc === 0 ? "wc-laser" : proc < numProcesses - 1 ? "wc-cnc" : "wc-calidad",
            name: PROCESS_NAMES[proc % PROCESS_NAMES.length],
            status: procStatus as any,
            machineId: proc === 0 ? "m-laser-1" : proc < numProcesses - 1 ? "m-vmc-1" : null,
            operatorUserId: proc === 0 ? OPERATORS[p % OPERATORS.length].id : proc === 1 ? OPERATORS[(p + 1) % OPERATORS.length].id : null,
            startedAt: proc < numProcesses - 1 ? daysFromNow(-Math.floor(Math.random() * 3)) : null,
            finishedAt: proc < numProcesses - 2 ? daysFromNow(-Math.floor(Math.random() * 2)) : null,
            createdAt: now,
            updatedAt: now,
          }).onConflictDoNothing();
        }

        // Quality inspection for some
        if (p % 5 === 2 || p % 5 === 1) {
          await db.insert(qualityInspections).values({
            id: `demo-insp-${otCounter}`,
            number: `INSP-${YEAR}-${String(otCounter).padStart(5, "0")}`,
            productionOrderId: otId,
            type: "final",
            inspectorUserId: OPERATORS[3].id,
            inspectedAt: now,
            partNumber: `${partTemplate.number}-${q + 1}-${p + 1}`,
            qtyInspected: formatQty(qty),
            qtyAccepted: formatQty(qty - 1),
            qtyRejected: "1",
            result: p % 2 === 0 ? "aprobado" : "aprobado_observaciones",
            notes: "Inspección final",
            createdBy: actor?.id ?? null,
            createdAt: now,
            updatedAt: now,
          }).onConflictDoNothing();
        }

        // Delivery for some
        if (p % 5 === 1) {
          await db.insert(deliveries).values({
            id: `demo-del-${otCounter}`,
            number: `ENT-${YEAR}-${String(otCounter).padStart(5, "0")}`,
            orderId,
            productionOrderId: otId,
            branchId: "amd-branch-cjs",
            status: q % 2 === 0 ? "entregado" : "enviado",
            scheduledDate: daysFromNow(1),
            shippedAt: now,
            carrier: "Transporte propio",
            trackingNumber: `AMD-${String(otCounter).padStart(5, "0")}`,
            quantity: formatQty(qty),
            shippingAddress: "Puerta 3, Parque Industrial",
            shippingCity: "Ciudad Juárez",
            shippingState: "Chihuahua",
            shippingCountry: "México",
            notes: "Entrega demo",
            createdBy: actor?.id ?? null,
            updatedBy: actor?.id ?? null,
            createdAt: now,
            updatedAt: now,
          }).onConflictDoNothing();
        }
      }

      // ==========================================
      // 9. INVOICE (for completed orders)
      // ==========================================
      if (q % 3 === 0 || q % 3 === 1) {
        const invNum = `FAC-${YEAR}-${String(q + 1).padStart(5, "0")}`;
        const invId = `demo-inv-${q + 1}`;

        await db.insert(invoices).values({
          id: invId,
          number: invNum,
          orderId,
          customerId,
          branchId: "amd-branch-cjs",
          issueDate: daysFromNow(-Math.floor(Math.random() * 10)),
          dueDate: daysFromNow(30),
          currency: q % 5 === 3 ? "usd" : "mxn",
          paymentTerm: "net_30",
          status: q % 3 === 0 ? "pagada" : "emitida",
          subtotal: formatMoney(totals.subtotal),
          taxTotal: formatMoney(totals.taxTotal),
          total: formatMoney(totals.total),
          paidTotal: q % 3 === 0 ? formatMoney(totals.total) : "0",
          notes: `Factura demo ${q + 1}`,
          createdBy: actor?.id ?? null,
          updatedBy: actor?.id ?? null,
          createdAt: now,
          updatedAt: now,
        }).onConflictDoNothing();

        if (q % 3 === 0) {
          await db.insert(invoicePayments).values({
            id: `demo-invpay-${q + 1}`,
            invoiceId: invId,
            paidAt: daysFromNow(-Math.floor(Math.random() * 5)),
            amount: formatMoney(totals.total),
            method: "transferencia",
            reference: `SPEI-${String(q + 1).padStart(5, "0")}`,
            createdBy: actor?.id ?? null,
            createdAt: now,
          }).onConflictDoNothing();
        }
      }
    }
  }

  console.log("✅ Seed completo de demo finalizado");
  console.log("Resumen:");
  console.log(`  - ${CLIENTS.length} clientes`);
  console.log(`  - ${OPERATORS.length} operadores`);
  console.log(`  - ${SUPPLIERS.length} proveedores`);
  console.log(`  - ${MATERIALS_POOL.length} materiales`);
  console.log(`  - 30 cotizaciones (1-8 partes c/u)`);
  console.log(`  - ~${otCounter} OT en producción`);
  console.log(`  - Ordenes de compra, entregas, facturas`);
}
