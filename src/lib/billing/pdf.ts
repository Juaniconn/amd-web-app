import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { displayMoney } from "@/lib/quotes/money";
import { displayQty } from "@/lib/inventory/catalog";
import { INVOICE_STATUS_LABELS, type InvoiceStatus } from "@/lib/billing/catalog";
import { workOrderNumber } from "@/lib/production/ot-number";
import { PAYMENT_TERM_LABELS, type PaymentTerm } from "@/lib/quotes/commercial";

type PdfItem = {
  position: number;
  description: string;
  quantity: string;
  unitPrice: string;
  lineTotal: string;
};

export type InvoicePdfInput = {
  number: string;
  status: InvoiceStatus;
  orderNumber: string;
  customerName: string;
  customerRfc: string | null;
  currency: string;
  issueDate: Date;
  dueDate: Date | null;
  paymentTerm: string | null;
  notes: string | null;
  subtotal: string;
  taxTotal: string;
  total: string;
  paidTotal: string;
  items: PdfItem[];
  branchName: string | null;
  branchCode: string | null;
};

export async function generateInvoicePdf(invoice: InvoicePdfInput): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const pageSize: [number, number] = [612, 792];
  const margin = 48;
  const lineHeight = 14;
  let page = pdf.addPage(pageSize);
  let y = 744;
  const ink = rgb(0.12, 0.12, 0.14);
  const muted = rgb(0.4, 0.4, 0.42);

  function ensureSpace(needed = 40) {
    if (y < margin + needed) {
      page = pdf.addPage(pageSize);
      y = 744;
    }
  }

  function text(
    value: string,
    x: number,
    size = 10,
    options?: { bold?: boolean; color?: ReturnType<typeof rgb> },
  ) {
    page.drawText(value.slice(0, 120), {
      x,
      y,
      size,
      font: options?.bold ? bold : font,
      color: options?.color ?? ink,
    });
  }

  text(invoice.branchName || "AMD Mexico", margin, 16, { bold: true });
  y -= 18;
  text("Factura operativa — sin CFDI / SAT", margin, 9, { color: muted });
  y -= 28;
  text(invoice.number, margin, 18, { bold: true });
  y -= 16;
  text(
    `${INVOICE_STATUS_LABELS[invoice.status]}  ·  Orden de trabajo ${workOrderNumber(invoice.orderNumber)}  ·  ${invoice.currency.toUpperCase()}`,
    margin,
    10,
    { color: muted },
  );
  y -= 24;
  text(invoice.customerName, margin, 11, { bold: true });
  y -= 14;
  if (invoice.customerRfc) {
    text(`RFC ${invoice.customerRfc}`, margin, 9, { color: muted });
    y -= 14;
  }
  text(`Emision ${invoice.issueDate.toLocaleDateString("es-MX")}`, margin, 9, { color: muted });
  y -= 12;
  if (invoice.dueDate) {
    text(`Vencimiento ${invoice.dueDate.toLocaleDateString("es-MX")}`, margin, 9, { color: muted });
    y -= 12;
  }
  const term = invoice.paymentTerm
    ? PAYMENT_TERM_LABELS[(invoice.paymentTerm as PaymentTerm) ?? "net_30"]
    : null;
  if (term) {
    text(`Pago ${term}`, margin, 9, { color: muted });
    y -= 20;
  }

  for (const item of invoice.items) {
    ensureSpace(28);
    text(`${item.position}. ${item.description}`, margin, 9);
    y -= 12;
    text(`${displayQty(item.quantity)}  ·  ${displayMoney(item.unitPrice, invoice.currency)}`, 360, 9);
    text(displayMoney(item.lineTotal, invoice.currency), 510, 9);
    y -= 16;
  }

  y -= 8;
  ensureSpace(70);
  text("Subtotal", 400, 10, { color: muted });
  text(displayMoney(invoice.subtotal, invoice.currency), 490, 10);
  y -= lineHeight;
  text("IVA", 400, 10, { color: muted });
  text(displayMoney(invoice.taxTotal, invoice.currency), 490, 10);
  y -= lineHeight;
  text("Total", 400, 12, { bold: true });
  text(displayMoney(invoice.total, invoice.currency), 490, 12, { bold: true });
  y -= lineHeight;
  text("Pagado", 400, 10, { color: muted });
  text(displayMoney(invoice.paidTotal, invoice.currency), 490, 10);

  if (invoice.notes) {
    y -= 28;
    ensureSpace(40);
    text("Notas", margin, 11, { bold: true });
    y -= 16;
    text(invoice.notes.replace(/\s+/g, " ").slice(0, 240), margin, 9);
  }

  y = margin;
  text("Vista previa / documento interno AMD Operations.", margin, 8, { color: muted });
  return pdf.save();
}
