import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { and, eq } from "drizzle-orm";
import {
  activityLogs,
  contacts,
  customers,
  documents,
  orderItems,
  orders,
  quoteItems,
  quotes,
} from "./schema";
import { activitySummary } from "../lib/audit/activity";
import {
  calculateLineTotals,
  calculateQuoteTotals,
  formatMoney,
} from "../lib/quotes/money";
import type { QuoteStatus } from "../lib/quotes/status";
import type { QuoteCurrency } from "../lib/validation/quotes";
import { documentObjectKey, getStorage } from "../lib/storage";

type DemoLine = {
  description: string;
  partNumber: string;
  quantity: number;
  unitPrice: number;
  estimatedCost: number;
  discountPercent?: number;
};

type DemoQuote = {
  id: string;
  number: string;
  customerCode: string;
  contactSuffix?: string;
  status: QuoteStatus;
  currency: QuoteCurrency;
  paymentTerms: string;
  leadTime: string;
  notes: string;
  daysAgo: number;
  validDays: number | null;
  lines: DemoLine[];
  convert?: boolean;
};

const LINES_CNC: DemoLine[] = [
  {
    description: "Placa aluminio 6061 mecanizada CNC",
    partNumber: "AMD-PL-6061",
    quantity: 10,
    unitPrice: 85,
    estimatedCost: 42,
  },
  {
    description: "Desbarbado y limpieza",
    partNumber: "AMD-FIN-01",
    quantity: 10,
    unitPrice: 8,
    estimatedCost: 3,
  },
];

const LINES_LASER: DemoLine[] = [
  {
    description: "Corte láser acero A36 3mm",
    partNumber: "AMD-LS-A36",
    quantity: 25,
    unitPrice: 18.5,
    estimatedCost: 7.2,
  },
];

const LINES_TURN: DemoLine[] = [
  {
    description: "Eje torneado acero 1045",
    partNumber: "AMD-TR-1045",
    quantity: 4,
    unitPrice: 220,
    estimatedCost: 95,
    discountPercent: 5,
  },
];

const DEMO_QUOTES: DemoQuote[] = [
  { id: "demo-quote-001", number: "DEMO_COT_001", customerCode: "DEMO_CLIENTE_001", contactSuffix: "1", status: "borrador", currency: "mxn", paymentTerms: "30 días", leadTime: "10 días hábiles", notes: "RFQ demo: placas CNC. No es una cotización real.", daysAgo: 2, validDays: 15, lines: LINES_CNC },
  { id: "demo-quote-002", number: "DEMO_COT_002", customerCode: "DEMO_CLIENTE_001", contactSuffix: "2", status: "en_revision", currency: "usd", paymentTerms: "Net 30", leadTime: "3 weeks", notes: "Revisión interna de margen.", daysAgo: 5, validDays: 20, lines: LINES_TURN },
  { id: "demo-quote-003", number: "DEMO_COT_003", customerCode: "DEMO_CLIENTE_002", contactSuffix: "1", status: "enviada", currency: "mxn", paymentTerms: "Contado", leadTime: "7 días", notes: "Enviada al cliente demo.", daysAgo: 4, validDays: 12, lines: LINES_LASER },
  { id: "demo-quote-004", number: "DEMO_COT_004", customerCode: "DEMO_CLIENTE_003", contactSuffix: "1", status: "aprobada", currency: "mxn", paymentTerms: "15 días", leadTime: "14 días", notes: "Aprobada. Lista para convertir.", daysAgo: 8, validDays: 30, lines: LINES_CNC },
  { id: "demo-quote-005", number: "DEMO_COT_005", customerCode: "DEMO_CLIENTE_003", contactSuffix: "1", status: "convertida", currency: "mxn", paymentTerms: "30 días", leadTime: "12 días", notes: "Convertida a pedido mínimo demo.", daysAgo: 20, validDays: 30, lines: LINES_TURN, convert: true },
  { id: "demo-quote-006", number: "DEMO_COT_006", customerCode: "DEMO_CLIENTE_004", contactSuffix: "1", status: "rechazada", currency: "usd", paymentTerms: "Net 45", leadTime: "4 weeks", notes: "Cliente eligió otro proveedor (demo).", daysAgo: 18, validDays: 10, lines: LINES_LASER },
  { id: "demo-quote-007", number: "DEMO_COT_007", customerCode: "DEMO_CLIENTE_005", contactSuffix: "1", status: "expirada", currency: "mxn", paymentTerms: "30 días", leadTime: "8 días", notes: "Venció sin respuesta.", daysAgo: 40, validDays: -5, lines: LINES_CNC },
  { id: "demo-quote-008", number: "DEMO_COT_008", customerCode: "DEMO_CLIENTE_006", contactSuffix: "1", status: "enviada", currency: "mxn", paymentTerms: "Contado", leadTime: "5 días", notes: "Corte y doblez.", daysAgo: 1, validDays: 5, lines: LINES_LASER },
  { id: "demo-quote-009", number: "DEMO_COT_009", customerCode: "DEMO_CLIENTE_007", contactSuffix: "1", status: "borrador", currency: "mxn", paymentTerms: "30 días", leadTime: "15 días", notes: "RFQ incompleta: faltan planos.", daysAgo: 0, validDays: 21, lines: LINES_CNC },
  { id: "demo-quote-010", number: "DEMO_COT_010", customerCode: "DEMO_CLIENTE_008", contactSuffix: "1", status: "en_revision", currency: "usd", paymentTerms: "Net 30", leadTime: "2 weeks", notes: "Revisar costo de material.", daysAgo: 3, validDays: 14, lines: LINES_TURN },
  { id: "demo-quote-011", number: "DEMO_COT_011", customerCode: "DEMO_CLIENTE_002", contactSuffix: "1", status: "aprobada", currency: "mxn", paymentTerms: "30 días", leadTime: "9 días", notes: "Aprobada por compras demo.", daysAgo: 6, validDays: 20, lines: LINES_LASER },
  { id: "demo-quote-012", number: "DEMO_COT_012", customerCode: "DEMO_CLIENTE_004", contactSuffix: "1", status: "enviada", currency: "mxn", paymentTerms: "15 días", leadTime: "11 días", notes: "Seguimiento semanal.", daysAgo: 9, validDays: 8, lines: LINES_CNC },
  { id: "demo-quote-013", number: "DEMO_COT_013", customerCode: "DEMO_CLIENTE_005", contactSuffix: "1", status: "borrador", currency: "usd", paymentTerms: "Net 30", leadTime: "6 weeks", notes: "Proyecto mayor. Cotización demo.", daysAgo: 1, validDays: 45, lines: [...LINES_CNC, ...LINES_TURN] },
  { id: "demo-quote-014", number: "DEMO_COT_014", customerCode: "DEMO_CLIENTE_006", contactSuffix: "1", status: "enviada", currency: "mxn", paymentTerms: "Contado", leadTime: "3 días", notes: "Urgente.", daysAgo: 0, validDays: 7, lines: LINES_LASER },
  { id: "demo-quote-015", number: "DEMO_COT_015", customerCode: "DEMO_CLIENTE_007", contactSuffix: "1", status: "convertida", currency: "mxn", paymentTerms: "30 días", leadTime: "20 días", notes: "Segunda conversión demo.", daysAgo: 25, validDays: 30, lines: LINES_TURN, convert: true },
];

export async function seedQuotesDemo(
  db: PostgresJsDatabase,
  actor: { id: string; name: string } | null,
) {
  const now = new Date();

  for (const demo of DEMO_QUOTES) {
    const customerId = `demo-customer-${demo.customerCode.slice(-3)}`;
    const [customer] = await db
      .select({ id: customers.id, isDemo: customers.isDemo })
      .from(customers)
      .where(eq(customers.id, customerId))
      .limit(1);
    if (!customer) continue;

    let contactId: string | null = null;
    if (demo.contactSuffix) {
      const [contact] = await db
        .select({ id: contacts.id })
        .from(contacts)
        .where(
          and(
            eq(contacts.id, `${customerId}-contact-${demo.contactSuffix}`),
            eq(contacts.customerId, customerId),
          ),
        )
        .limit(1);
      contactId = contact?.id ?? null;
    }

    const issueDate = new Date(now);
    issueDate.setDate(issueDate.getDate() - demo.daysAgo);
    const validUntil =
      demo.validDays === null
        ? null
        : new Date(issueDate.getTime() + demo.validDays * 24 * 60 * 60 * 1000);

    const lineRows = demo.lines.map((line, index) => {
      const totals = calculateLineTotals({
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        discountPercent: line.discountPercent ?? 0,
        taxPercent: 16,
        estimatedCost: line.estimatedCost,
      });
      return {
        id: `${demo.id}-item-${index + 1}`,
        quoteId: demo.id,
        position: index + 1,
        description: line.description,
        partNumber: line.partNumber,
        quantity: formatMoney(line.quantity, 4),
        unit: "pza",
        unitPrice: formatMoney(line.unitPrice, 4),
        discountPercent: formatMoney(line.discountPercent ?? 0),
        taxPercent: formatMoney(16),
        estimatedCost: formatMoney(line.estimatedCost, 4),
        lineSubtotal: formatMoney(totals.lineSubtotal),
        lineTax: formatMoney(totals.lineTax),
        lineTotal: formatMoney(totals.lineTotal),
        lineEstimatedCost: formatMoney(totals.lineEstimatedCost),
        lineProfit: formatMoney(totals.lineProfit),
        lineMarginPercent:
          totals.lineMarginPercent === null
            ? null
            : formatMoney(totals.lineMarginPercent),
        createdAt: issueDate,
        updatedAt: issueDate,
      };
    });
    const header = calculateQuoteTotals(
      lineRows.map((row) => ({
        lineSubtotal: Number(row.lineSubtotal),
        lineTax: Number(row.lineTax),
        lineTotal: Number(row.lineTotal),
        lineEstimatedCost: Number(row.lineEstimatedCost),
        lineProfit: Number(row.lineProfit),
        lineMarginPercent: row.lineMarginPercent === null ? null : Number(row.lineMarginPercent),
      })),
    );

    const orderId = demo.convert ? `${demo.id}-order` : null;
    const orderNumber = demo.convert
      ? `DEMO_PEDIDO_${demo.number.slice(-3)}`
      : null;

    await db
      .insert(quotes)
      .values({
        id: demo.id,
        number: demo.number,
        customerId,
        contactId,
        ownerUserId: actor?.id ?? null,
        issueDate,
        validUntil,
        currency: demo.currency,
        paymentTerms: demo.paymentTerms,
        leadTime: demo.leadTime,
        notes: demo.notes,
        status: demo.convert ? "convertida" : demo.status,
        subtotal: formatMoney(header.subtotal),
        taxTotal: formatMoney(header.taxTotal),
        total: formatMoney(header.total),
        estimatedCost: formatMoney(header.estimatedCost),
        estimatedProfit: formatMoney(header.estimatedProfit),
        marginPercent:
          header.marginPercent === null ? null : formatMoney(header.marginPercent),
        convertedOrderId: null,
        isDemo: true,
        createdBy: actor?.id ?? null,
        updatedBy: actor?.id ?? null,
        createdAt: issueDate,
        updatedAt: issueDate,
        deletedAt: null,
      })
      .onConflictDoUpdate({
        target: quotes.number,
        set: {
          customerId,
          contactId,
          status: demo.convert ? "convertida" : demo.status,
          currency: demo.currency,
          paymentTerms: demo.paymentTerms,
          leadTime: demo.leadTime,
          notes: demo.notes,
          issueDate,
          validUntil,
          subtotal: formatMoney(header.subtotal),
          taxTotal: formatMoney(header.taxTotal),
          total: formatMoney(header.total),
          estimatedCost: formatMoney(header.estimatedCost),
          estimatedProfit: formatMoney(header.estimatedProfit),
          marginPercent:
            header.marginPercent === null ? null : formatMoney(header.marginPercent),
          isDemo: true,
          deletedAt: null,
          updatedAt: now,
        },
      });

    await db.delete(quoteItems).where(eq(quoteItems.quoteId, demo.id));
    if (lineRows.length > 0) {
      await db.insert(quoteItems).values(lineRows);
    }

    if (demo.convert && orderId && orderNumber) {
      await db
        .insert(orders)
        .values({
          id: orderId,
          number: orderNumber,
          customerId,
          quoteId: demo.id,
          currency: demo.currency,
          total: formatMoney(header.total),
          status: "nuevo",
          isDemo: true,
          createdBy: actor?.id ?? null,
          updatedBy: actor?.id ?? null,
          createdAt: issueDate,
          updatedAt: issueDate,
        })
        .onConflictDoUpdate({
          target: orders.number,
          set: {
            total: formatMoney(header.total),
            updatedAt: now,
          },
        });

      await db.delete(orderItems).where(eq(orderItems.orderId, orderId));
      await db.insert(orderItems).values(
        lineRows.map((row) => ({
          id: `${orderId}-item-${row.position}`,
          orderId,
          position: row.position,
          description: row.description,
          partNumber: row.partNumber,
          quantity: row.quantity,
          unit: row.unit,
          unitPrice: row.unitPrice,
          discountPercent: row.discountPercent,
          taxPercent: row.taxPercent,
          lineSubtotal: row.lineSubtotal,
          lineTax: row.lineTax,
          lineTotal: row.lineTotal,
        })),
      );

      await db
        .update(quotes)
        .set({ convertedOrderId: orderId, status: "convertida" })
        .where(eq(quotes.id, demo.id));
    }

    const existingLog = await db
      .select({ id: activityLogs.id })
      .from(activityLogs)
      .where(
        and(
          eq(activityLogs.entityType, "quote"),
          eq(activityLogs.entityId, demo.id),
          eq(activityLogs.action, "created"),
        ),
      )
      .limit(1);

    if (existingLog.length === 0) {
      await db.insert(activityLogs).values({
        id: `${demo.id}-created`,
        actorUserId: actor?.id ?? null,
        action: "created",
        entityType: "quote",
        entityId: demo.id,
        parentEntityType: "customer",
        parentEntityId: customerId,
        summary: activitySummary({
          actorName: actor?.name ?? null,
          action: "created",
          entityType: "quote",
          entityLabel: demo.number,
        }),
        newValue: { number: demo.number, source: "demo-seed" },
      });
    }
  }

  const storage = getStorage();
  const dummyFiles = [
    {
      quoteId: "demo-quote-001",
      name: "rfq-placas-cnc.txt",
      body: "Plano / RFQ demo para placas CNC. No es un documento real de AMD.\n",
    },
    {
      quoteId: "demo-quote-003",
      name: "especificacion-corte-laser.txt",
      body: "Especificación demo de corte láser A36. No es un documento real de AMD.\n",
    },
    {
      quoteId: "demo-quote-005",
      name: "cotizacion-aprobada.txt",
      body: "Archivo demo asociado a cotización convertida. No es un documento real de AMD.\n",
    },
  ];

  for (const file of dummyFiles) {
    const id = `${file.quoteId}-doc-1`;
    const objectKey = documentObjectKey("quote", file.quoteId, file.name);
    const stored = await storage.put(objectKey, Buffer.from(file.body, "utf8"));
    await db
      .insert(documents)
      .values({
        id,
        entityType: "quote",
        entityId: file.quoteId,
        originalName: file.name,
        mimeType: "text/plain",
        sizeBytes: stored.sizeBytes,
        checksumSha256: stored.checksumSha256,
        storageBackend: stored.backend,
        objectKey: stored.objectKey,
        uploadedBy: actor?.id ?? null,
      })
      .onConflictDoUpdate({
        target: documents.id,
        set: {
          originalName: file.name,
          sizeBytes: stored.sizeBytes,
          checksumSha256: stored.checksumSha256,
          storageBackend: stored.backend,
          objectKey: stored.objectKey,
        },
      });
  }

  console.log(`Seeded ${DEMO_QUOTES.length} demo quotes.`);
}
