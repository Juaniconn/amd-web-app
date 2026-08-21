import { eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { formatQty } from "@/lib/inventory/catalog";
import { calculateLineTotals, calculateQuoteTotals, formatMoney } from "@/lib/quotes/money";
import { activitySummary } from "@/lib/audit/activity";
import {
  customers,
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
} from "@/db/schema";
import { customerTypeEnum } from "@/db/schema/crm";
import { materialCategoryEnum } from "@/db/schema/inventory";

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

const MATERIALS = [
  { code: "MAT-A36-3", description: "Lámina A36 3mm" },
  { code: "MAT-A36-6", description: "Lámina A36 6mm" },
  { code: "MAT-SS304-3", description: "Lámina SS304 3mm" },
  { code: "MAT-AL6061", description: "Barra AL6061" },
  { code: "CONSUMIBLE-GAS", description: "Gas argón" },
];

const PARTS = [
  { number: "BRV-001", description: "Fixture de ensamble línea A", qty: 24, unitPrice: 1850 },
  { number: "BRV-002", description: "Cubierta de protección", qty: 50, unitPrice: 420 },
  { number: "PS-440", description: "Stamping die insert D2", qty: 10, unitPrice: 890 },
  { number: "APN-200", description: "Soporte de motor", qty: 100, unitPrice: 320 },
  { number: "MSM-105", description: "Chasis principal", qty: 8, unitPrice: 12500 },
  { number: "MVL-300", description: "Panel de control", qty: 15, unitPrice: 2800 },
  { number: "AME-500", description: "Componente aeroespacial", qty: 5, unitPrice: 45000 },
  { number: "EPP-600", description: "Carcasa de lavadora", qty: 200, unitPrice: 180 },
  { number: "HDC-700", description: "Troquel de precisión", qty: 3, unitPrice: 85000 },
  { number: "TVG-800", description: "Brida de tubería", qty: 40, unitPrice: 950 },
  { number: "EMO-900", description: "Viga estructural", qty: 20, unitPrice: 3200 },
];

const PROCESS_NAMES = [
  "Corte láser",
  "Plegado / Press brake",
  "Soldadura MIG",
  "Soldadura TIG",
  "Maquinado CNC",
  "Rectificado",
  "Tratamiento térmico",
  "Pintura electrostática",
  "Ensamble",
  "Inspección final",
];

export async function seedFullDemo(db: PostgresJsDatabase, actor: Actor) {
  console.log("Iniciando seed completo de demo...");

  // 1. Create customers
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
      phone: `(${Math.floor(Math.random() * 900) + 100}) ${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 9000) + 1000}`,
      email: `contacto@${client.code.toLowerCase()}.example`,
      address: `Av. Industrial ${Math.floor(Math.random() * 1000) + 100}`,
      city: client.city,
      state: "México",
      country: "México",
      shippingSameAsBilling: Math.random() > 0.3,
      shippingAddress: `Puerta ${Math.floor(Math.random() * 5) + 1}, Parque Industrial`,
      shippingCity: client.city,
      shippingState: "México",
      type: customerTypeEnum.enumValues[0],
      status: "activo",
      notes: `Cliente demo ${i + 1} de ${CLIENTS.length}`,
      isDemo: true,
      createdBy: actor?.id ?? null,
      updatedBy: actor?.id ?? null,
      createdAt: daysFromNow(-Math.floor(Math.random() * 60) - 30),
      updatedAt: now,
    }).onConflictDoNothing();
  }
  console.log(`✓ ${CLIENTS.length} clientes creados`);

  // 2. Create materials
  const materialIds: string[] = [];
  for (let i = 0; i < MATERIALS.length; i++) {
    const mat = MATERIALS[i];
    const id = `demo-mat-${i + 1}`;
    materialIds.push(id);
    await db.insert(materials).values({
      id,
      code: mat.code,
      description: mat.description,
      category: materialCategoryEnum.enumValues[0],
      unitId: "u-kg",
      warehouseId: "wh-mp",
      isCritical: i < 3,
      active: true,
      costPerKg: (50 + Math.floor(Math.random() * 100)).toString(),
      isDemo: true,
      createdBy: actor?.id ?? null,
      updatedBy: actor?.id ?? null,
      createdAt: now,
      updatedAt: now,
    }).onConflictDoNothing();
  }
  console.log(`✓ ${MATERIALS.length} materiales creados`);

  // 3. Create inventory balances
  for (let i = 0; i < materialIds.length; i++) {
    await db.insert(inventoryBalances).values({
      id: `demo-bal-${i + 1}`,
      materialId: materialIds[i],
      warehouseId: "wh-mp",
      onHand: formatQty(Math.floor(Math.random() * 500) + 100),
      reserved: "0",
      updatedAt: now,
    }).onConflictDoNothing();
  }
  console.log(`✓ ${materialIds.length} balances de inventario creados`);

  // 4. Create quotes (30 total, 3 per customer)
  const quoteIds: string[] = [];
  for (let i = 0; i < 30; i++) {
    const customerId = customerIds[i % customerIds.length];
    const partIndex = i % PARTS.length;
    const part = PARTS[partIndex];
    const qty = part.qty;
    const line = calculateLineTotals({
      quantity: qty,
      unitPrice: part.unitPrice,
      discountPercent: 0,
      taxPercent: 16,
      estimatedCost: part.unitPrice * 0.4,
    });
    const totals = calculateQuoteTotals([line]);
    const quoteNum = `COT-${YEAR}-${String(i + 1).padStart(5, "0")}`;
    const quoteId = `demo-quote-${i + 1}`;
    quoteIds.push(quoteId);

    await db.insert(quotes).values({
      id: quoteId,
      number: quoteNum,
      customerId,
      contactId: null,
      ownerUserId: actor?.id ?? null,
      issueDate: daysFromNow(-Math.floor(Math.random() * 30) - 5),
      validUntil: daysFromNow(Math.floor(Math.random() * 15) + 15),
      currency: i % 5 === 3 ? "usd" : "mxn",
      paymentTerms: "30 días",
      paymentTerm: "net_30",
      leadTime: "12 días hábiles",
      notes: `Cotización demo ${i + 1}. Parte ${part.number}`,
      addresseeMode: "nombre",
      branchId: "amd-branch-cjs",
      branchName: "Ciudad Juárez",
      branchCode: "CJS",
      shippingAddress: "Puerta 3, Parque Industrial",
      shippingCity: "Ciudad Juárez",
      shippingState: "Chihuahua",
      shippingPostalCode: "32600",
      shippingCountry: "México",
      rfqType: "solo_fabricacion",
      requiresEngineering: false,
      engineeringStatus: "no_requerida",
      status: i % 4 === 0 ? "convertida" : i % 4 === 1 ? "enviada" : i % 4 === 2 ? "borrador" : "en_revision",
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

    await db.insert(quoteItems).values({
      id: `${quoteId}-item-1`,
      quoteId,
      position: 1,
      kind: "pieza",
      description: part.description,
      partNumber: part.number,
      quantity: formatQty(qty),
      unit: "pza",
      unitPrice: formatMoney(part.unitPrice, 4),
      discountPercent: "0",
      taxPercent: "16",
      estimatedCost: formatMoney(part.unitPrice * 0.4, 4),
      lineSubtotal: formatMoney(line.lineSubtotal),
      lineTax: formatMoney(line.lineTax),
      lineTotal: formatMoney(line.lineTotal),
      lineEstimatedCost: formatMoney(line.lineEstimatedCost),
      lineProfit: formatMoney(line.lineProfit),
      lineMarginPercent: line.lineMarginPercent === null ? null : formatMoney(line.lineMarginPercent),
      createdAt: now,
      updatedAt: now,
    }).onConflictDoNothing();

    if (i % 4 === 0) {
      const orderNum = `AMD-${YEAR}-${String(i + 1).padStart(5, "0")}`;
      const orderId = `demo-order-${i + 1}`;

      await db.insert(orders).values({
        id: orderId,
        number: orderNum,
        customerId,
        quoteId,
        origin: "rfq_directa",
        ownerUserId: actor?.id ?? null,
        promisedDate: daysFromNow(Math.floor(Math.random() * 14) + 7),
        notes: `Orden demo ${i + 1}`,
        currency: i % 5 === 3 ? "usd" : "mxn",
        total: formatMoney(totals.total),
        status: i % 3 === 0 ? "en_produccion" : "aprobado",
        branchId: "amd-branch-cjs",
        isDemo: true,
        createdBy: actor?.id ?? null,
        updatedBy: actor?.id ?? null,
        createdAt: daysFromNow(-Math.floor(Math.random() * 20)),
        updatedAt: now,
      }).onConflictDoNothing();

      await db.insert(orderItems).values({
        id: `${orderId}-item-1`,
        orderId,
        position: 1,
        kind: "pieza",
        description: part.description,
        partNumber: part.number,
        quantity: formatQty(qty),
        unit: "pza",
        unitPrice: formatMoney(part.unitPrice, 4),
        discountPercent: "0",
        taxPercent: "16",
        lineSubtotal: formatMoney(line.lineSubtotal),
        lineTax: formatMoney(line.lineTax),
        lineTotal: formatMoney(line.lineTotal),
      }).onConflictDoNothing();

      if (i % 2 === 0) {
        const otNum = `OT-${YEAR}-${String(i + 1).padStart(5, "0")}`;
        const otId = `demo-ot-${i + 1}`;
        const routeId = i % 3 === 0 ? "route-a" : i % 3 === 1 ? "route-b" : null;

        await db.insert(productionOrders).values({
          id: otId,
          number: otNum,
          orderId,
          orderItemId: `${orderId}-item-1`,
          customerId,
          quoteId,
          origin: "rfq_directa",
          routeId,
          description: part.description,
          partNumber: part.number,
          quantity: formatQty(qty),
          unit: "pza",
          promisedDate: daysFromNow(Math.floor(Math.random() * 10) + 5),
          priority: i % 4 === 0 ? "urgente" : i % 4 === 1 ? "compromiso_inmediato" : "programada",
          status: i % 5 === 0 ? "en_produccion" : i % 5 === 1 ? "terminada" : i % 5 === 2 ? "calidad" : i % 5 === 3 ? "programada" : "liberada",
          notes: `OT demo ${i + 1}`,
          workCenterId: i % 3 === 0 ? "wc-cnc" : i % 3 === 1 ? "wc-laser" : "wc-ensamble",
          machineId: i % 3 === 0 ? "m-vmc-1" : i % 3 === 1 ? "m-laser-1" : null,
          operatorUserId: i % 2 === 0 ? "op-juan-martinez" : "op-ramiro-sanchez",
          releasedAt: i % 5 >= 3 ? daysFromNow(-Math.floor(Math.random() * 5) - 2) : null,
          scheduledAt: i % 5 >= 3 ? daysFromNow(-Math.floor(Math.random() * 3) - 1) : null,
          startedAt: i % 5 === 0 ? daysFromNow(-1) : null,
          qualityAt: i % 5 === 2 ? now : null,
          isDemo: true,
          createdBy: actor?.id ?? null,
          updatedBy: actor?.id ?? null,
          createdAt: daysFromNow(-Math.floor(Math.random() * 15)),
          updatedAt: now,
        }).onConflictDoNothing();

        const numProcesses = 3 + Math.floor(Math.random() * 5);
        for (let p = 0; p < numProcesses; p++) {
          await db.insert(productionOperations).values({
            id: `${otId}-op-${p + 1}`,
            productionOrderId: otId,
            position: p + 1,
            kind: p === numProcesses - 1 ? "calidad" : p === 0 ? "produccion" : "produccion",
            workCenterId: p === 0 ? "wc-laser" : p < numProcesses - 1 ? "wc-cnc" : "wc-calidad",
            name: PROCESS_NAMES[p % PROCESS_NAMES.length],
            status: i % 5 === 0 && p === 0 ? "en_proceso" : p < numProcesses - 2 ? "terminada" : "pendiente",
            machineId: p === 0 ? "m-laser-1" : p < numProcesses - 1 ? "m-vmc-1" : null,
            operatorUserId: p === 0 ? "op-juan-martinez" : p === 1 ? "op-ramiro-sanchez" : null,
            startedAt: p < numProcesses - 1 ? daysFromNow(-Math.floor(Math.random() * 3)) : null,
            finishedAt: p < numProcesses - 2 ? daysFromNow(-Math.floor(Math.random() * 2)) : null,
            createdAt: now,
            updatedAt: now,
          }).onConflictDoNothing();
        }

        if (i % 5 === 2) {
          await db.insert(qualityInspections).values({
            id: `demo-insp-${i + 1}`,
            number: `INSP-${YEAR}-${String(i + 1).padStart(5, "0")}`,
            productionOrderId: otId,
            type: "final",
            inspectorUserId: "op-ana-torres",
            inspectedAt: now,
            partNumber: part.number,
            qtyInspected: formatQty(qty),
            qtyAccepted: formatQty(qty - 1),
            qtyRejected: "1",
            result: "aprobado_observaciones",
            notes: "Inspección final aprobada con observaciones menores",
            createdBy: actor?.id ?? null,
            createdAt: now,
            updatedAt: now,
          }).onConflictDoNothing();
        }

        if (i % 5 === 1) {
          await db.insert(deliveries).values({
            id: `demo-del-${i + 1}`,
            number: `ENT-${YEAR}-${String(i + 1).padStart(5, "0")}`,
            orderId,
            productionOrderId: otId,
            branchId: "amd-branch-cjs",
            status: "enviado",
            scheduledDate: daysFromNow(1),
            shippedAt: now,
            carrier: "Transporte propio",
            trackingNumber: `AMD-${String(i + 1).padStart(5, "0")}`,
            quantity: formatQty(qty),
            shippingAddress: "Puerta 3, Parque Industrial",
            shippingCity: "Ciudad Juárez",
            shippingState: "Chihuahua",
            shippingCountry: "México",
            notes: "Entrega en tránsito",
            createdBy: actor?.id ?? null,
            updatedBy: actor?.id ?? null,
            createdAt: now,
            updatedAt: now,
          }).onConflictDoNothing();
        }

        if (i % 5 === 1 || i % 5 === 2) {
          await db.insert(invoices).values({
            id: `demo-inv-${i + 1}`,
            number: `FAC-${YEAR}-${String(i + 1).padStart(5, "0")}`,
            orderId,
            customerId,
            branchId: "amd-branch-cjs",
            issueDate: daysFromNow(-Math.floor(Math.random() * 10)),
            dueDate: daysFromNow(30),
            currency: i % 5 === 3 ? "usd" : "mxn",
            paymentTerm: "net_30",
            status: i % 5 === 1 ? "emitida" : "pagada",
            subtotal: formatMoney(totals.subtotal),
            taxTotal: formatMoney(totals.taxTotal),
            total: formatMoney(totals.total),
            paidTotal: i % 5 === 2 ? formatMoney(totals.total) : "0",
            notes: `Factura demo ${i + 1}`,
            createdBy: actor?.id ?? null,
            updatedBy: actor?.id ?? null,
            createdAt: now,
            updatedAt: now,
          }).onConflictDoNothing();

          if (i % 5 === 2) {
            await db.insert(invoicePayments).values({
              id: `demo-invpay-${i + 1}`,
              invoiceId: `demo-inv-${i + 1}`,
              paidAt: daysFromNow(-Math.floor(Math.random() * 5)),
              amount: formatMoney(totals.total),
              method: "transferencia",
              reference: `SPEI-${String(i + 1).padStart(5, "0")}`,
              createdBy: actor?.id ?? null,
              createdAt: now,
            }).onConflictDoNothing();
          }
        }
      }
    }
  }

  console.log(`✓ ${quoteIds.length} cotizaciones creadas`);
  console.log("✓ Pedidos, OT, Operaciones, Inspecciones, Entregas, Facturas creadas");

  await db.insert(activityLogs).values({
    id: "demo-activity-seed",
    actorUserId: actor?.id ?? null,
    action: "created",
    entityType: "customer",
    entityId: "demo-customer-1",
    summary: activitySummary({
      actorName: actor?.name ?? null,
      action: "created",
      entityType: "customer",
      entityLabel: "Seed demo completo",
    }),
    createdAt: now,
  }).onConflictDoNothing();

  console.log("✅ Seed completo de demo finalizado");
}
