import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { displayMoney } from "@/lib/quotes/money";
import { displayQty } from "@/lib/inventory/catalog";

type PoPdfItem = {
  materialCode: string;
  description: string;
  quantity: string;
  unitPrice: string;
  lineTotal: string;
};

export async function generatePurchaseOrderPdf(input: {
  number: string;
  supplierName: string;
  supplierCode: string;
  issueDate: Date;
  currency: string;
  notes: string | null;
  subtotal: string;
  taxTotal: string;
  total: string;
  workOrderNumber: string | null;
  items: PoPdfItem[];
}): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const page = pdf.addPage([612, 792]);
  const ink = rgb(0.12, 0.12, 0.14);
  let y = 744;

  const line = (text: string, size = 11, useBold = false) => {
    page.drawText(text, { x: 48, y, size, font: useBold ? bold : font, color: ink });
    y -= 16;
  };

  line(`Orden de compra ${input.number}`, 16, true);
  line(`Proveedor: ${input.supplierCode} · ${input.supplierName}`);
  line(`Fecha: ${input.issueDate.toLocaleDateString("es-MX")}`);
  if (input.workOrderNumber) line(`OT: ${input.workOrderNumber}`);
  y -= 8;
  line("Material", 11, true);
  for (const item of input.items) {
    line(
      `${item.materialCode} · ${item.description} · ${displayQty(item.quantity)} · ${displayMoney(item.unitPrice, input.currency)} · ${displayMoney(item.lineTotal, input.currency)}`,
      10,
    );
  }
  y -= 8;
  line(`Subtotal ${displayMoney(input.subtotal, input.currency)}`, 11, true);
  line(`IVA ${displayMoney(input.taxTotal, input.currency)}`);
  line(`Total ${displayMoney(input.total, input.currency)}`, 12, true);
  if (input.notes) {
    y -= 8;
    line(`Notas: ${input.notes}`, 10);
  }
  return pdf.save();
}
