import { eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { activitySummary } from "../lib/audit/activity";
import { formatQty } from "../lib/inventory/catalog";
import {
  calculateLineTotals,
  calculateQuoteTotals,
  formatMoney,
} from "../lib/quotes/money";
import {
  activityLogs,
  branches,
  contacts,
  customers,
  deliveries,
  engineeringHours,
  engineeringRequests,
  inventoryBalances,
  inventoryMovements,
  invoiceItems,
  invoicePayments,
  invoices,
  laborHours,
  machineHours,
  materials,
  orderItems,
  orders,
  productionOperations,
  productionOrderMaterials,
  productionOrders,
  projects,
  purchaseOrderItems,
  purchaseOrders,
  purchaseReceiptItems,
  purchaseReceipts,
  qualityInspections,
  quoteItems,
  quotes,
  suppliers,
  supplierMaterials,
} from "./schema";

type Actor = { id: string; name: string } | null;

const YEAR = new Date().getFullYear();
const IDS = {
  customerBravo: "beta-customer-bravo",
  contactBravo: "beta-contact-bravo",
  customerElp: "beta-customer-elp",
  contactElp: "beta-contact-elp",
  project: "beta-project-bravo",
  quoteFixture: "beta-quote-fixture",
  quoteDesign: "beta-quote-design",
  quoteElp: "beta-quote-elp",
  order: "beta-order-fixture",
  engineering: "beta-eng-design",
  ot: "beta-ot-fixture",
  supplier: "beta-supplier-aceros",
  po: "beta-po-6061",
  poItem: "beta-po-6061-item",
  receipt: "beta-rec-6061",
  inspection: "beta-insp-final",
  delivery: "beta-delivery-fixture",
  invoice: "beta-invoice-fixture",
  matPlate: "beta-mat-6061",
  matInserts: "beta-mat-insertos",
  supplierMaterial: "beta-sm-6061",
  otMaterial: "beta-ot-mat-6061",
} as const;

function daysFromNow(days: number) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

function lineValues(
  quoteId: string,
  position: number,
  input: {
    kind?: "pieza" | "servicio_ingenieria";
    description: string;
    partNumber?: string;
    quantity: number;
    unit?: string;
    unitPrice: number;
    taxPercent: number;
    estimatedCost: number;
  },
) {
  const totals = calculateLineTotals({
    quantity: input.quantity,
    unitPrice: input.unitPrice,
    discountPercent: 0,
    taxPercent: input.taxPercent,
    estimatedCost: input.estimatedCost,
  });
  return {
    id: `${quoteId}-item-${position}`,
    quoteId,
    position,
    kind: input.kind ?? "pieza",
    description: input.description,
    partNumber: input.partNumber ?? null,
    quantity: formatQty(input.quantity),
    unit: input.unit ?? "pza",
    unitPrice: formatMoney(input.unitPrice, 4),
    discountPercent: "0",
    taxPercent: formatMoney(input.taxPercent),
    estimatedCost: formatMoney(input.estimatedCost, 4),
    lineSubtotal: formatMoney(totals.lineSubtotal),
    lineTax: formatMoney(totals.lineTax),
    lineTotal: formatMoney(totals.lineTotal),
    lineEstimatedCost: formatMoney(totals.lineEstimatedCost),
    lineProfit: formatMoney(totals.lineProfit),
    lineMarginPercent:
      totals.lineMarginPercent === null ? null : formatMoney(totals.lineMarginPercent),
    totals,
  };
}

async function log(
  db: PostgresJsDatabase,
  actor: Actor,
  input: {
    id: string;
    action: "created" | "sent" | "converted" | "approved" | "closed" | "stock_moved";
    entityType:
      | "customer"
      | "quote"
      | "order"
      | "production_order"
      | "material"
      | "supplier"
      | "purchase_order"
      | "quality_inspection"
      | "delivery"
      | "invoice"
      | "engineering_request"
      | "project";
    entityId: string;
    entityLabel: string;
    parentEntityType?: "customer" | "quote" | "order" | "production_order";
    parentEntityId?: string;
    createdAt: Date;
  },
) {
  await db.insert(activityLogs).values({
    id: input.id,
    actorUserId: actor?.id ?? null,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    parentEntityType: input.parentEntityType ?? null,
    parentEntityId: input.parentEntityId ?? null,
    summary: activitySummary({
      actorName: actor?.name ?? null,
      action: input.action,
      entityType: input.entityType,
      entityLabel: input.entityLabel,
    }),
    createdAt: input.createdAt,
  });
}

export async function seedBetaFlow(db: PostgresJsDatabase, actor: Actor) {
  const now = new Date();
  const [cjs] = await db
    .select()
    .from(branches)
    .where(eq(branches.id, "amd-branch-cjs"))
    .limit(1);
  const [elp] = await db
    .select()
    .from(branches)
    .where(eq(branches.id, "amd-branch-elp"))
    .limit(1);

  const fixtureLine = lineValues(IDS.quoteFixture, 1, {
    description: "Fixture de ensamble línea Bravo — placa 6061 CNC",
    partNumber: "AMD-FX-BRV-01",
    quantity: 24,
    unitPrice: 1850,
    taxPercent: 16,
    estimatedCost: 980,
  });
  const designLine = lineValues(IDS.quoteDesign, 1, {
    kind: "servicio_ingenieria",
    description: "Diseño de gabinete de control — CAD y manufacturabilidad",
    quantity: 1,
    unitPrice: 18500,
    taxPercent: 16,
    estimatedCost: 7200,
  });
  const elpLine = lineValues(IDS.quoteElp, 1, {
    description: "Stamping die insert — D2, Wire EDM",
    partNumber: "PST-DI-440",
    quantity: 10,
    unitPrice: 420,
    taxPercent: 0,
    estimatedCost: 180,
  });
  const fixtureHeader = calculateQuoteTotals([fixtureLine.totals]);
  const designHeader = calculateQuoteTotals([designLine.totals]);
  const elpHeader = calculateQuoteTotals([elpLine.totals]);

  const poQty = 80;
  const poPrice = 95;
  const poTax = 16;
  const poLine = calculateLineTotals({
    quantity: poQty,
    unitPrice: poPrice,
    discountPercent: 0,
    taxPercent: poTax,
    estimatedCost: 0,
  });

  await db.insert(customers).values([
    {
      id: IDS.customerBravo,
      code: `CLI-${YEAR}-00001`,
      legalName: "Industrias del Bravo S.A. de C.V.",
      tradeName: "Bravo Maquila",
      rfc: "IBR850615XX1",
      phone: "656-123-4400",
      email: "compras@industriasdelbravo.example",
      address: "Av. Tecnológico 2450, Parque Industrial",
      city: "Ciudad Juárez",
      state: "Chihuahua",
      country: "México",
      shippingSameAsBilling: false,
      shippingAddress: "Puerta 3, Av. Tecnológico 2450",
      shippingCity: "Ciudad Juárez",
      shippingState: "Chihuahua",
      shippingPostalCode: "32600",
      shippingCountry: "México",
      type: "maquiladora",
      status: "activo",
      notes: "Cliente de recorrido demo. Maquiladora en Juárez.",
      isDemo: true,
      createdBy: actor?.id ?? null,
      updatedBy: actor?.id ?? null,
      createdAt: daysFromNow(-20),
      updatedAt: now,
    },
    {
      id: IDS.customerElp,
      code: `CLI-${YEAR}-00002`,
      legalName: "Precision Stampings LLC",
      tradeName: "Precision Stampings",
      rfc: null,
      phone: "915-555-0188",
      email: "purchasing@precisionstampings.example",
      address: "4100 Doniphan Dr",
      city: "El Paso",
      state: "Texas",
      country: "Estados Unidos",
      shippingSameAsBilling: true,
      shippingAddress: "4100 Doniphan Dr",
      shippingCity: "El Paso",
      shippingState: "Texas",
      shippingPostalCode: "79922",
      shippingCountry: "Estados Unidos",
      type: "industrial",
      status: "activo",
      notes: "Cliente de recorrido demo. RFQ abierta en USD.",
      isDemo: true,
      createdBy: actor?.id ?? null,
      updatedBy: actor?.id ?? null,
      createdAt: daysFromNow(-8),
      updatedAt: now,
    },
  ]);

  await db.insert(contacts).values([
    {
      id: IDS.contactBravo,
      customerId: IDS.customerBravo,
      name: "María Elena Ríos",
      title: "Gerente de compras",
      email: "maria.rios@industriasdelbravo.example",
      phone: "656-123-4412",
      whatsapp: "656-123-4412",
      department: "Compras",
      isPrimary: true,
      isDemo: true,
      createdBy: actor?.id ?? null,
      updatedBy: actor?.id ?? null,
      createdAt: daysFromNow(-20),
      updatedAt: now,
    },
    {
      id: IDS.contactElp,
      customerId: IDS.customerElp,
      name: "James Carter",
      title: "Buyer",
      email: "james.carter@precisionstampings.example",
      phone: "915-555-0189",
      department: "Purchasing",
      isPrimary: true,
      isDemo: true,
      createdBy: actor?.id ?? null,
      updatedBy: actor?.id ?? null,
      createdAt: daysFromNow(-8),
      updatedAt: now,
    },
  ]);

  await db.insert(projects).values({
    id: IDS.project,
    code: `PRY-${YEAR}-00001`,
    name: "Fixture línea Bravo",
    customerId: IDS.customerBravo,
    description: "Herramental de ensamble para la línea Bravo.",
    ownerUserId: actor?.id ?? null,
    status: "activo",
    startDate: daysFromNow(-18),
    estimatedEndDate: daysFromNow(12),
    isDemo: true,
    createdBy: actor?.id ?? null,
    updatedBy: actor?.id ?? null,
    createdAt: daysFromNow(-18),
    updatedAt: now,
  });

  await db.insert(quotes).values([
    {
      id: IDS.quoteFixture,
      number: `COT-${YEAR}-00001`,
      customerId: IDS.customerBravo,
      contactId: IDS.contactBravo,
      ownerUserId: actor?.id ?? null,
      issueDate: daysFromNow(-16),
      validUntil: daysFromNow(14),
      currency: "mxn",
      paymentTerms: "30 días",
      paymentTerm: "net_30",
      leadTime: "12 días hábiles",
      notes: "Plano del cliente. Solo fabricación en sucursal Juárez.",
      addresseeMode: "nombre",
      branchId: cjs?.id ?? null,
      branchName: cjs?.name ?? "Ciudad Juárez",
      branchCode: cjs?.code ?? "CJS",
      branchAddress: cjs?.address ?? null,
      branchCity: cjs?.city ?? null,
      branchState: cjs?.state ?? null,
      branchCountry: cjs?.country ?? "México",
      branchPostalCode: cjs?.postalCode ?? null,
      branchPhone: cjs?.phone ?? null,
      branchEmail: cjs?.email ?? null,
      branchRfc: cjs?.rfc ?? null,
      shippingAddress: "Puerta 3, Av. Tecnológico 2450",
      shippingCity: "Ciudad Juárez",
      shippingState: "Chihuahua",
      shippingPostalCode: "32600",
      shippingCountry: "México",
      rfqType: "solo_fabricacion",
      requiresEngineering: false,
      engineeringStatus: "no_requerida",
      status: "convertida",
      subtotal: formatMoney(fixtureHeader.subtotal),
      taxTotal: formatMoney(fixtureHeader.taxTotal),
      total: formatMoney(fixtureHeader.total),
      estimatedCost: formatMoney(fixtureHeader.estimatedCost),
      estimatedProfit: formatMoney(fixtureHeader.estimatedProfit),
      marginPercent:
        fixtureHeader.marginPercent === null
          ? null
          : formatMoney(fixtureHeader.marginPercent),
      projectId: IDS.project,
      convertedOrderId: null,
      isDemo: true,
      createdBy: actor?.id ?? null,
      updatedBy: actor?.id ?? null,
      createdAt: daysFromNow(-16),
      updatedAt: daysFromNow(-12),
    },
    {
      id: IDS.quoteDesign,
      number: `COT-${YEAR}-00002`,
      customerId: IDS.customerBravo,
      contactId: IDS.contactBravo,
      ownerUserId: actor?.id ?? null,
      issueDate: daysFromNow(-5),
      validUntil: daysFromNow(25),
      currency: "mxn",
      paymentTerms: "30 días",
      paymentTerm: "net_30",
      leadTime: "Por definir al liberar diseño",
      notes: "Diseño + fabricación. Ingeniería en curso.",
      addresseeMode: "nombre",
      branchId: cjs?.id ?? null,
      branchName: cjs?.name ?? "Ciudad Juárez",
      branchCode: cjs?.code ?? "CJS",
      branchAddress: cjs?.address ?? null,
      branchCity: cjs?.city ?? null,
      branchState: cjs?.state ?? null,
      branchCountry: cjs?.country ?? "México",
      branchPostalCode: cjs?.postalCode ?? null,
      branchPhone: cjs?.phone ?? null,
      branchEmail: cjs?.email ?? null,
      branchRfc: cjs?.rfc ?? null,
      shippingAddress: "Puerta 3, Av. Tecnológico 2450",
      shippingCity: "Ciudad Juárez",
      shippingState: "Chihuahua",
      shippingPostalCode: "32600",
      shippingCountry: "México",
      rfqType: "diseno_fabricacion",
      requiresEngineering: true,
      engineeringType: "diseno_nuevo",
      engineeringStatus: "en_proceso",
      status: "en_revision",
      subtotal: formatMoney(designHeader.subtotal),
      taxTotal: formatMoney(designHeader.taxTotal),
      total: formatMoney(designHeader.total),
      estimatedCost: formatMoney(designHeader.estimatedCost),
      estimatedProfit: formatMoney(designHeader.estimatedProfit),
      marginPercent:
        designHeader.marginPercent === null ? null : formatMoney(designHeader.marginPercent),
      projectId: IDS.project,
      isDemo: true,
      createdBy: actor?.id ?? null,
      updatedBy: actor?.id ?? null,
      createdAt: daysFromNow(-5),
      updatedAt: now,
    },
    {
      id: IDS.quoteElp,
      number: `COT-${YEAR}-00003`,
      customerId: IDS.customerElp,
      contactId: IDS.contactElp,
      ownerUserId: actor?.id ?? null,
      issueDate: daysFromNow(-3),
      validUntil: daysFromNow(18),
      currency: "usd",
      paymentTerms: "30 días",
      paymentTerm: "net_30",
      leadTime: "3 weeks",
      notes: "RFQ enviada desde El Paso. IVA 0% por USD.",
      addresseeMode: "departamento",
      branchId: elp?.id ?? null,
      branchName: elp?.name ?? "El Paso",
      branchCode: elp?.code ?? "ELP",
      branchAddress: elp?.address ?? null,
      branchCity: elp?.city ?? null,
      branchState: elp?.state ?? null,
      branchCountry: elp?.country ?? "Estados Unidos",
      branchPostalCode: elp?.postalCode ?? null,
      branchPhone: elp?.phone ?? null,
      branchEmail: elp?.email ?? null,
      branchRfc: elp?.rfc ?? null,
      shippingAddress: "4100 Doniphan Dr",
      shippingCity: "El Paso",
      shippingState: "Texas",
      shippingPostalCode: "79922",
      shippingCountry: "Estados Unidos",
      rfqType: "solo_fabricacion",
      requiresEngineering: false,
      engineeringStatus: "no_requerida",
      status: "enviada",
      subtotal: formatMoney(elpHeader.subtotal),
      taxTotal: formatMoney(elpHeader.taxTotal),
      total: formatMoney(elpHeader.total),
      estimatedCost: formatMoney(elpHeader.estimatedCost),
      estimatedProfit: formatMoney(elpHeader.estimatedProfit),
      marginPercent: elpHeader.marginPercent === null ? null : formatMoney(elpHeader.marginPercent),
      isDemo: true,
      createdBy: actor?.id ?? null,
      updatedBy: actor?.id ?? null,
      createdAt: daysFromNow(-3),
      updatedAt: daysFromNow(-2),
    },
  ]);

  const { totals: _fixtureTotals, ...fixtureItemRow } = fixtureLine;
  const { totals: _designTotals, ...designItemRow } = designLine;
  const { totals: _elpTotals, ...elpItemRow } = elpLine;
  void _fixtureTotals;
  void _designTotals;
  void _elpTotals;
  await db.insert(quoteItems).values([fixtureItemRow, designItemRow, elpItemRow]);

  await db.insert(orders).values({
    id: IDS.order,
    number: `AMD-${YEAR}-00001`,
    customerId: IDS.customerBravo,
    quoteId: IDS.quoteFixture,
    origin: "rfq_directa",
    projectId: IDS.project,
    ownerUserId: actor?.id ?? null,
    promisedDate: daysFromNow(5),
    notes: "Pedido convertido de COT de fixtures Bravo.",
    currency: "mxn",
    total: formatMoney(fixtureHeader.total),
    status: "en_produccion",
    branchId: cjs?.id ?? null,
    isDemo: true,
    createdBy: actor?.id ?? null,
    updatedBy: actor?.id ?? null,
    createdAt: daysFromNow(-12),
    updatedAt: now,
  });
  await db.insert(orderItems).values({
    id: `${IDS.order}-item-1`,
    orderId: IDS.order,
    position: 1,
    kind: fixtureItemRow.kind,
    description: fixtureItemRow.description,
    partNumber: fixtureItemRow.partNumber,
    quantity: fixtureItemRow.quantity,
    unit: fixtureItemRow.unit,
    unitPrice: fixtureItemRow.unitPrice,
    discountPercent: fixtureItemRow.discountPercent,
    taxPercent: fixtureItemRow.taxPercent,
    lineSubtotal: fixtureItemRow.lineSubtotal,
    lineTax: fixtureItemRow.lineTax,
    lineTotal: fixtureItemRow.lineTotal,
  });
  await db
    .update(quotes)
    .set({ convertedOrderId: IDS.order, updatedAt: daysFromNow(-12) })
    .where(eq(quotes.id, IDS.quoteFixture));

  await db.insert(engineeringRequests).values({
    id: IDS.engineering,
    number: `ING-${YEAR}-00001`,
    customerId: IDS.customerBravo,
    quoteId: IDS.quoteDesign,
    assigneeUserId: actor?.id ?? null,
    description: "Gabinete de control: CAD, revisión de manufactura y liberación.",
    projectType: "diseno_nuevo",
    priority: "alta",
    dueDate: daysFromNow(10),
    status: "disenando",
    hoursLogged: "6.50",
    assignedAt: daysFromNow(-4),
    designStartedAt: daysFromNow(-3),
    isDemo: true,
    createdBy: actor?.id ?? null,
    updatedBy: actor?.id ?? null,
    createdAt: daysFromNow(-5),
    updatedAt: now,
  });
  if (actor) {
    await db.insert(engineeringHours).values({
      id: "beta-eng-hours-1",
      engineeringRequestId: IDS.engineering,
      userId: actor.id,
      hours: "6.50",
      note: "Layout inicial y selección de herrajes.",
      workedOn: daysFromNow(-2),
      durationMinutes: 390,
      createdBy: actor.id,
      createdAt: daysFromNow(-2),
    });
  }

  await db.insert(materials).values([
    {
      id: IDS.matPlate,
      code: `MAT-${YEAR}-00001`,
      description: "Placa aluminio 6061-T6 12.7 mm",
      category: "materia_prima",
      unitId: "uom-kg",
      warehouseId: "wh-mp",
      branchId: "amd-branch-cjs",
      grade: "6061-T6",
      thicknessIn: "0.500",
      costPerKg: "78",
      densityGCm3: "2.70",
      isCritical: false,
      active: true,
      minStock: "20",
      notes: "Materia prima del recorrido demo.",
      isDemo: true,
      createdBy: actor?.id ?? null,
      updatedBy: actor?.id ?? null,
      createdAt: daysFromNow(-15),
      updatedAt: now,
    },
    {
      id: IDS.matInserts,
      code: `MAT-${YEAR}-00002`,
      description: "Insertos CNMG 432",
      category: "consumibles",
      unitId: "uom-pza",
      warehouseId: "wh-cons",
      branchId: "amd-branch-cjs",
      isCritical: true,
      active: true,
      minStock: "20",
      notes: "Consumible crítico del recorrido demo.",
      isDemo: true,
      createdBy: actor?.id ?? null,
      updatedBy: actor?.id ?? null,
      createdAt: daysFromNow(-15),
      updatedAt: now,
    },
  ]);

  await db.insert(suppliers).values({
    id: IDS.supplier,
    code: `PROV-${YEAR}-00001`,
    legalName: "Aceros y Metales del Norte",
    rfc: "AMN010101XX0",
    contactName: "Roberto Salas",
    email: "ventas@acerosnorte.example",
    phone: "656-200-3300",
    address: "Blvd. Independencia 1800",
    city: "Ciudad Juárez",
    country: "México",
    paymentTerm: "net_30",
    leadTime: "5 días",
    status: "activo",
    isDemo: true,
    createdBy: actor?.id ?? null,
    updatedBy: actor?.id ?? null,
    createdAt: daysFromNow(-14),
    updatedAt: now,
  });

  await db.insert(supplierMaterials).values({
    id: IDS.supplierMaterial,
    supplierId: IDS.supplier,
    position: 1,
    description: "Placa aluminio 6061-T6 12.7 mm",
    grade: "6061-T6",
    thicknessIn: "0.500",
    costPerKg: "78",
    densityGCm3: "2.70",
    unit: "kg",
    notes: "Partida demo ligada al inventario del recorrido.",
    active: true,
  });

  await db
    .update(materials)
    .set({
      supplierId: IDS.supplier,
      supplierMaterialId: IDS.supplierMaterial,
      usedInCalculator: true,
    })
    .where(eq(materials.id, IDS.matPlate));

  await db.insert(purchaseOrders).values({
    id: IDS.po,
    number: `OC-${YEAR}-00001`,
    supplierId: IDS.supplier,
    branchId: cjs?.id ?? null,
    productionOrderId: null,
    ownerUserId: actor?.id ?? null,
    issueDate: daysFromNow(-11),
    expectedDate: daysFromNow(-9),
    currency: "mxn",
    paymentTerm: "net_30",
    status: "recibida",
    notes: "Placa 6061 para OT de fixtures Bravo.",
    subtotal: formatMoney(poLine.lineSubtotal),
    taxTotal: formatMoney(poLine.lineTax),
    total: formatMoney(poLine.lineTotal),
    isDemo: true,
    createdBy: actor?.id ?? null,
    updatedBy: actor?.id ?? null,
    createdAt: daysFromNow(-11),
    updatedAt: daysFromNow(-9),
  });
  await db.insert(purchaseOrderItems).values({
    id: IDS.poItem,
    purchaseOrderId: IDS.po,
    position: 1,
    materialId: IDS.matPlate,
    warehouseId: "wh-mp",
    description: "Placa aluminio 6061-T6 12.7 mm",
    quantity: formatQty(poQty),
    receivedQty: formatQty(poQty),
    unitPrice: formatMoney(poPrice, 4),
    taxPercent: formatMoney(poTax),
    lineSubtotal: formatMoney(poLine.lineSubtotal),
    lineTax: formatMoney(poLine.lineTax),
    lineTotal: formatMoney(poLine.lineTotal),
  });
  await db.insert(purchaseReceipts).values({
    id: IDS.receipt,
    number: `REC-${YEAR}-00001`,
    purchaseOrderId: IDS.po,
    receivedAt: daysFromNow(-9),
    notes: "Recepción completa.",
    createdBy: actor?.id ?? null,
    createdAt: daysFromNow(-9),
  });
  await db.insert(purchaseReceiptItems).values({
    id: `${IDS.receipt}-item-1`,
    receiptId: IDS.receipt,
    purchaseOrderItemId: IDS.poItem,
    quantity: formatQty(poQty),
  });

  const consumedKg = 24;
  const remainingOnHand = poQty - consumedKg;
  await db.insert(inventoryBalances).values([
    {
      id: `bal-${IDS.matPlate}`,
      materialId: IDS.matPlate,
      warehouseId: "wh-mp",
      onHand: formatQty(remainingOnHand),
      reserved: "0",
      updatedAt: now,
    },
    {
      id: `bal-${IDS.matInserts}`,
      materialId: IDS.matInserts,
      warehouseId: "wh-cons",
      onHand: formatQty(18),
      reserved: "0",
      updatedAt: now,
    },
  ]);

  await db.insert(productionOrders).values([
    {
      id: IDS.ot,
      number: `OT-${YEAR}-00001`,
      orderId: IDS.order,
      orderItemId: `${IDS.order}-item-1`,
      customerId: IDS.customerBravo,
      quoteId: IDS.quoteFixture,
      origin: "rfq_directa",
      routeId: "route-a",
      description: "Fixture de ensamble línea Bravo — placa 6061 CNC",
      partNumber: "AMD-FX-BRV-01",
      quantity: formatQty(24),
      unit: "pza",
      promisedDate: daysFromNow(5),
      priority: "programada",
      status: "terminada",
      notes: "Cierre físico tras inspección final aprobada.",
      workCenterId: "wc-cnc",
      machineId: "m-vmc-1",
      operatorUserId: "op-juan-martinez",
      releasedAt: daysFromNow(-10),
      scheduledAt: daysFromNow(-10),
      startedAt: daysFromNow(-9),
      qualityAt: daysFromNow(-1),
      physicallyClosedAt: daysFromNow(-1),
      physicallyClosedBy: actor?.id ?? null,
      isDemo: true,
      createdBy: actor?.id ?? null,
      updatedBy: actor?.id ?? null,
      createdAt: daysFromNow(-12),
      updatedAt: daysFromNow(-1),
    },
    {
      id: `${IDS.ot}-2`,
      number: `OT-${YEAR}-00002`,
      orderId: IDS.order,
      orderItemId: `${IDS.order}-item-1`,
      customerId: IDS.customerBravo,
      quoteId: IDS.quoteFixture,
      origin: "rfq_directa",
      routeId: "route-a",
      description: "Fixture de ensamble línea Bravo — placa 6061 CNC (lote 2)",
      partNumber: "AMD-FX-BRV-02",
      quantity: formatQty(12),
      unit: "pza",
      promisedDate: daysFromNow(2),
      priority: "urgente",
      status: "en_produccion",
      notes: "Lote urgente para cliente Bravo.",
      workCenterId: "wc-cnc",
      machineId: "m-vmc-2",
      operatorUserId: "op-ramiro-sanchez",
      releasedAt: daysFromNow(-2),
      scheduledAt: daysFromNow(-2),
      startedAt: daysFromNow(-1),
      isDemo: true,
      createdBy: actor?.id ?? null,
      updatedBy: actor?.id ?? null,
      createdAt: daysFromNow(-3),
      updatedAt: now,
    },
    {
      id: `${IDS.ot}-3`,
      number: `OT-${YEAR}-00003`,
      orderId: IDS.order,
      orderItemId: `${IDS.order}-item-1`,
      customerId: IDS.customerBravo,
      quoteId: IDS.quoteFixture,
      origin: "rfq_directa",
      routeId: "route-a",
      description: "Fixture de ensamble línea Bravo — placa 6061 CNC (lote 3)",
      partNumber: "AMD-FX-BRV-03",
      quantity: formatQty(8),
      unit: "pza",
      promisedDate: daysFromNow(-1),
      priority: "compromiso_inmediato",
      status: "pendiente",
      notes: "Pendiente de asignación de máquina.",
      workCenterId: "wc-cnc",
      operatorUserId: "op-luis-hernandez",
      isDemo: true,
      createdBy: actor?.id ?? null,
      updatedBy: actor?.id ?? null,
      createdAt: daysFromNow(-1),
      updatedAt: now,
    },
  ]);
  await db
    .update(purchaseOrders)
    .set({ productionOrderId: IDS.ot, updatedAt: daysFromNow(-9) })
    .where(eq(purchaseOrders.id, IDS.po));

  await db.insert(productionOperations).values(
    [
      { position: 1, kind: "ingenieria" as const, name: "Ingeniería", status: "omitida" as const },
      {
        position: 2,
        kind: "produccion" as const,
        name: "CNC",
        status: "terminada" as const,
        workCenterId: "wc-cnc",
        routeStepId: "route-a-step-2",
      },
      {
        position: 3,
        kind: "calidad" as const,
        name: "Calidad",
        status: "terminada" as const,
        workCenterId: "wc-calidad",
        routeStepId: "route-a-step-3",
      },
      {
        position: 4,
        kind: "entrega" as const,
        name: "Entrega",
        status: "en_proceso" as const,
        routeStepId: "route-a-step-4",
      },
    ].map((step) => ({
      id: `${IDS.ot}-op-${step.position}`,
      productionOrderId: IDS.ot,
      routeStepId: step.routeStepId ?? `route-a-step-${step.position}`,
      position: step.position,
      kind: step.kind,
      workCenterId: step.workCenterId ?? null,
      name: step.name,
      status: step.status,
    })),
  );

  await db.insert(productionOrderMaterials).values({
    id: IDS.otMaterial,
    orderId: IDS.order,
    productionOrderId: IDS.ot,
    materialId: IDS.matPlate,
    warehouseId: "wh-mp",
    requiredQty: formatQty(consumedKg),
    reservedQty: formatQty(consumedKg),
    consumedQty: formatQty(consumedKg),
    createdBy: actor?.id ?? null,
    updatedBy: actor?.id ?? null,
    createdAt: daysFromNow(-10),
    updatedAt: daysFromNow(-2),
  });

  await db.insert(inventoryMovements).values([
    {
      id: "beta-mov-po-in",
      materialId: IDS.matPlate,
      warehouseId: "wh-mp",
      type: "entrada",
      quantity: formatQty(poQty),
      onHandDelta: formatQty(poQty),
      reservedDelta: "0",
      reason: `Recepción ${`REC-${YEAR}-00001`}`,
      purchaseOrderId: IDS.po,
      purchaseReceiptId: IDS.receipt,
      isDemo: true,
      createdBy: actor?.id ?? null,
      createdAt: daysFromNow(-9),
    },
    {
      id: "beta-mov-reserve",
      materialId: IDS.matPlate,
      warehouseId: "wh-mp",
      type: "reserva",
      quantity: formatQty(consumedKg),
      onHandDelta: "0",
      reservedDelta: formatQty(consumedKg),
      reason: `Reserva OT-${YEAR}-00001`,
      productionOrderId: IDS.ot,
      productionOrderMaterialId: IDS.otMaterial,
      isDemo: true,
      createdBy: actor?.id ?? null,
      createdAt: daysFromNow(-8),
    },
    {
      id: "beta-mov-consume",
      materialId: IDS.matPlate,
      warehouseId: "wh-mp",
      type: "consumo",
      quantity: formatQty(consumedKg),
      onHandDelta: formatQty(-consumedKg),
      reservedDelta: formatQty(-consumedKg),
      reason: `Consumo OT-${YEAR}-00001`,
      productionOrderId: IDS.ot,
      productionOrderMaterialId: IDS.otMaterial,
      isDemo: true,
      createdBy: actor?.id ?? null,
      createdAt: daysFromNow(-2),
    },
    {
      id: "beta-mov-inserts",
      materialId: IDS.matInserts,
      warehouseId: "wh-cons",
      type: "entrada",
      quantity: formatQty(18),
      onHandDelta: formatQty(18),
      reservedDelta: "0",
      reason: "Carga inicial de consumible",
      isDemo: true,
      createdBy: actor?.id ?? null,
      createdAt: daysFromNow(-14),
    },
  ]);

  await db.insert(machineHours).values({
    id: "beta-mh-1",
    productionOrderId: IDS.ot,
    operationId: `${IDS.ot}-op-2`,
    machineId: "m-vmc-1",
    operatorUserId: actor?.id ?? null,
    startedAt: daysFromNow(-8),
    endedAt: daysFromNow(-8 + 0.25),
    durationMinutes: 270,
    notes: "Desbaste y acabado del fixture.",
    createdBy: actor?.id ?? null,
    createdAt: daysFromNow(-8),
  });
  if (actor) {
    await db.insert(laborHours).values({
      id: "beta-lh-1",
      productionOrderId: IDS.ot,
      operationId: `${IDS.ot}-op-2`,
      operatorUserId: actor.id,
      startedAt: daysFromNow(-8),
      endedAt: new Date(daysFromNow(-8).getTime() + 270 * 60 * 1000),
      durationMinutes: 270,
      notes: "Operación CNC.",
      createdBy: actor.id,
      createdAt: daysFromNow(-8),
    });
  }

  await db.insert(qualityInspections).values({
    id: IDS.inspection,
    number: `INSP-${YEAR}-00001`,
    productionOrderId: IDS.ot,
    type: "final",
    inspectorUserId: actor?.id ?? null,
    inspectedAt: daysFromNow(-1),
    partNumber: "AMD-FX-BRV-01",
    qtyInspected: formatQty(24),
    qtyAccepted: formatQty(24),
    qtyRejected: "0",
    result: "aprobado",
    notes: "Cotas críticas dentro de tolerancia.",
    createdBy: actor?.id ?? null,
    createdAt: daysFromNow(-1),
    updatedAt: daysFromNow(-1),
  });

  await db.insert(deliveries).values({
    id: IDS.delivery,
    number: `ENT-${YEAR}-00001`,
    orderId: IDS.order,
    productionOrderId: IDS.ot,
    branchId: cjs?.id ?? null,
    status: "enviado",
    scheduledDate: now,
    shippedAt: now,
    carrier: "Transporte propio",
    trackingNumber: "AMD-CJS-2401",
    quantity: formatQty(24),
    shippingAddress: "Puerta 3, Av. Tecnológico 2450",
    shippingCity: "Ciudad Juárez",
    shippingState: "Chihuahua",
    shippingCountry: "México",
    notes: "En tránsito a planta Bravo.",
    createdBy: actor?.id ?? null,
    updatedBy: actor?.id ?? null,
    createdAt: now,
    updatedAt: now,
  });

  const paid = 20000;
  await db.insert(invoices).values({
    id: IDS.invoice,
    number: `FAC-${YEAR}-00001`,
    orderId: IDS.order,
    customerId: IDS.customerBravo,
    branchId: cjs?.id ?? null,
    issueDate: now,
    dueDate: daysFromNow(30),
    currency: "mxn",
    paymentTerm: "net_30",
    status: "parcial",
    subtotal: formatMoney(fixtureHeader.subtotal),
    taxTotal: formatMoney(fixtureHeader.taxTotal),
    total: formatMoney(fixtureHeader.total),
    paidTotal: formatMoney(paid),
    notes: "Anticipo recibido. Saldo a 30 días.",
    createdBy: actor?.id ?? null,
    updatedBy: actor?.id ?? null,
    createdAt: now,
    updatedAt: now,
  });
  await db.insert(invoiceItems).values({
    id: `${IDS.invoice}-item-1`,
    invoiceId: IDS.invoice,
    position: 1,
    description: fixtureItemRow.description,
    quantity: fixtureItemRow.quantity,
    unitPrice: fixtureItemRow.unitPrice,
    taxPercent: fixtureItemRow.taxPercent,
    lineTotal: fixtureItemRow.lineTotal,
  });
  await db.insert(invoicePayments).values({
    id: `${IDS.invoice}-pay-1`,
    invoiceId: IDS.invoice,
    paidAt: now,
    amount: formatMoney(paid),
    method: "transferencia",
    reference: "SPEI-BRV-001",
    createdBy: actor?.id ?? null,
    createdAt: now,
  });

  const createdAt = daysFromNow(-16);
  await log(db, actor, {
    id: "beta-act-customer",
    action: "created",
    entityType: "customer",
    entityId: IDS.customerBravo,
    entityLabel: "Industrias del Bravo S.A. de C.V.",
    createdAt,
  });
  await log(db, actor, {
    id: "beta-act-quote",
    action: "converted",
    entityType: "quote",
    entityId: IDS.quoteFixture,
    entityLabel: `COT-${YEAR}-00001`,
    parentEntityType: "customer",
    parentEntityId: IDS.customerBravo,
    createdAt: daysFromNow(-12),
  });
  await log(db, actor, {
    id: "beta-act-order",
    action: "created",
    entityType: "order",
    entityId: IDS.order,
    entityLabel: `AMD-${YEAR}-00001`,
    parentEntityType: "quote",
    parentEntityId: IDS.quoteFixture,
    createdAt: daysFromNow(-12),
  });
  await log(db, actor, {
    id: "beta-act-ot",
    action: "closed",
    entityType: "production_order",
    entityId: IDS.ot,
    entityLabel: `OT-${YEAR}-00001`,
    parentEntityType: "order",
    parentEntityId: IDS.order,
    createdAt: daysFromNow(-1),
  });

  console.log(
    "Seeded beta flow: Cliente → Cotización → Pedido → OT → OC/Inventario → Calidad → Entrega → Factura.",
  );
}
