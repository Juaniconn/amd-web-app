import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { PAYMENT_TERM_LABELS, resolveAddressee, type AddresseeMode, type PaymentTerm } from "@/lib/quotes/commercial";
import { displayMoney } from "@/lib/quotes/money";
import { displayQty } from "@/lib/inventory/catalog";
import { formatBranchAddress } from "@/lib/branches/catalog";
import { QUOTE_STATUS_LABELS, type QuoteStatus } from "@/lib/quotes/status";
import { RFQ_TYPE_LABELS, type RfqType } from "@/lib/quotes/rfq";

type PdfItem = {
  position: number;
  description: string;
  partNumber: string | null;
  quantity: string;
  unit: string;
  unitPrice: string;
  lineSubtotal: string;
  lineTax: string;
  lineTotal: string;
};

export type QuotePdfInput = {
  number: string;
  status: QuoteStatus;
  rfqType: RfqType;
  customerName: string;
  customerCode: string | null;
  contactName: string | null;
  contactPhone: string | null;
  contactTitle: string | null;
  contactDepartment: string | null;
  addresseeMode: AddresseeMode | string | null;
  currency: string;
  issueDate: Date;
  validUntil: Date | null;
  paymentTerm: PaymentTerm | string | null;
  paymentTerms: string | null;
  leadTime: string | null;
  notes: string | null;
  subtotal: string;
  taxTotal: string;
  total: string;
  items: PdfItem[];
  branchName: string | null;
  branchCode: string | null;
  branchAddress: string | null;
  branchCity: string | null;
  branchState: string | null;
  branchCountry: string | null;
  branchPostalCode: string | null;
  branchPhone: string | null;
  branchEmail: string | null;
  branchRfc: string | null;
  shippingAddress: string | null;
  shippingCity: string | null;
  shippingState: string | null;
  shippingPostalCode: string | null;
  shippingCountry: string | null;
};

function dateEs(value: Date) {
  return value.toLocaleDateString("es-MX");
}

export async function generateQuotePdf(quote: QuotePdfInput): Promise<Uint8Array> {
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

  text(quote.branchName || "AMD Mexico", margin, 16, { bold: true });
  y -= 16;
  const branchLine = formatBranchAddress({
    address: quote.branchAddress,
    city: quote.branchCity,
    state: quote.branchState,
    postalCode: quote.branchPostalCode,
    country: quote.branchCountry,
  });
  if (branchLine) {
    text(branchLine, margin, 9, { color: muted });
    y -= 12;
  }
  const branchContact = [quote.branchPhone, quote.branchEmail, quote.branchRfc]
    .filter(Boolean)
    .join("  ·  ");
  if (branchContact) {
    text(branchContact, margin, 9, { color: muted });
    y -= 12;
  }
  text("Cotizacion", margin, 11, { color: muted });
  y -= 28;

  text(quote.number, margin, 18, { bold: true });
  y -= 16;
  text(
    `${QUOTE_STATUS_LABELS[quote.status]}  ·  ${RFQ_TYPE_LABELS[quote.rfqType]}  ·  ${quote.currency.toUpperCase()}`,
    margin,
    10,
    { color: muted },
  );
  y -= 24;

  const addressee = resolveAddressee({
    mode: quote.addresseeMode,
    name: quote.contactName,
    department: quote.contactDepartment,
    title: quote.contactTitle,
    phone: quote.contactPhone,
  });
  const paymentLabel =
    (quote.paymentTerm &&
      PAYMENT_TERM_LABELS[quote.paymentTerm as PaymentTerm]) ||
    quote.paymentTerms ||
    "—";
  const shipping = [
    quote.shippingAddress,
    [quote.shippingCity, quote.shippingState].filter(Boolean).join(", "),
    quote.shippingPostalCode,
    quote.shippingCountry,
  ]
    .filter(Boolean)
    .join(" · ");

  const fields: [string, string][] = [
    ["Cliente", quote.customerCode ? `${quote.customerName} (${quote.customerCode})` : quote.customerName],
    ["Destinatario", addressee.line || quote.contactName || "—"],
    ["Tel. contacto", addressee.phone || "—"],
    ["Envio", shipping || "—"],
    ["Fecha", dateEs(quote.issueDate)],
    ["Vigencia", quote.validUntil ? dateEs(quote.validUntil) : "—"],
    ["Pago", paymentLabel],
    ["Entrega", quote.leadTime || "—"],
  ];
  for (const [label, value] of fields) {
    ensureSpace();
    text(label, margin, 8, { color: muted, bold: true });
    text(value, margin + 70, 10);
    y -= lineHeight;
  }

  y -= 10;
  ensureSpace(60);
  text("Partidas", margin, 12, { bold: true });
  y -= 18;
  text("#", margin, 8, { bold: true, color: muted });
  text("Descripcion", margin + 20, 8, { bold: true, color: muted });
  text("Cant.", 360, 8, { bold: true, color: muted });
  text("P. unit.", 420, 8, { bold: true, color: muted });
  text("Total", 510, 8, { bold: true, color: muted });
  y -= 12;
  page.drawLine({
    start: { x: margin, y: y + 8 },
    end: { x: 564, y: y + 8 },
    thickness: 0.6,
    color: rgb(0.8, 0.8, 0.82),
  });

  if (quote.items.length === 0) {
    text("Sin partidas.", margin, 10, { color: muted });
    y -= lineHeight;
  }

  for (const item of quote.items) {
    ensureSpace(28);
    const title = item.partNumber
      ? `${item.description} (${item.partNumber})`
      : item.description;
    text(String(item.position), margin, 9);
    text(title, margin + 20, 9);
    y -= 12;
    text(`${displayQty(item.quantity)} ${item.unit}`, 360, 9);
    text(displayMoney(item.unitPrice, quote.currency), 420, 9);
    text(displayMoney(item.lineTotal, quote.currency), 510, 9);
    y -= 16;
  }

  y -= 8;
  ensureSpace(70);
  text("Subtotal", 400, 10, { color: muted });
  text(displayMoney(quote.subtotal, quote.currency), 490, 10);
  y -= lineHeight;
  text("IVA", 400, 10, { color: muted });
  text(displayMoney(quote.taxTotal, quote.currency), 490, 10);
  y -= lineHeight;
  text("Total", 400, 12, { bold: true });
  text(displayMoney(quote.total, quote.currency), 490, 12, { bold: true });
  y -= 24;

  if (quote.notes) {
    ensureSpace(40);
    text("Notas", margin, 11, { bold: true });
    y -= 16;
    const words = quote.notes.replace(/\s+/g, " ").trim();
    let line = "";
    for (const word of words.split(" ")) {
      const next = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(next, 9) > 500) {
        ensureSpace();
        text(line, margin, 9);
        y -= lineHeight;
        line = word;
      } else {
        line = next;
      }
    }
    if (line) {
      ensureSpace();
      text(line, margin, 9);
      y -= lineHeight;
    }
  }

  y = margin;
  text(
    "Documento generado por AMD Operations. No sustituye el envio formal al cliente.",
    margin,
    8,
    { color: muted },
  );

  return pdf.save();
}
