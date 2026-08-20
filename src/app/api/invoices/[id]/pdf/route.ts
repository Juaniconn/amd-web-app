import { NextResponse } from "next/server";
import { PERMISSION_IDS } from "@/lib/permissions/catalog";
import { getSession } from "@/lib/auth/session";
import { generateInvoicePdf } from "@/lib/billing/pdf";
import type { InvoiceStatus } from "@/lib/billing/catalog";
import { userHasPermission } from "@/server/services/access";
import { getInvoiceById } from "@/server/services/billing";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }
  const allowed = await userHasPermission(session.user.id, PERMISSION_IDS.billingRead);
  if (!allowed) {
    return NextResponse.json({ error: "Sin permiso." }, { status: 403 });
  }

  const { id } = await context.params;
  const invoice = await getInvoiceById(id);
  if (!invoice) {
    return NextResponse.json({ error: "La factura no existe." }, { status: 404 });
  }

  const bytes = await generateInvoicePdf({
    number: invoice.number,
    status: invoice.status as InvoiceStatus,
    orderNumber: invoice.orderNumber,
    customerName: invoice.customerName,
    customerRfc: invoice.customerRfc,
    currency: invoice.currency,
    issueDate: invoice.issueDate,
    dueDate: invoice.dueDate,
    paymentTerm: invoice.paymentTerm,
    notes: invoice.notes,
    subtotal: invoice.subtotal,
    taxTotal: invoice.taxTotal,
    total: invoice.total,
    paidTotal: invoice.paidTotal,
    items: invoice.items.map((item) => ({
      position: item.position,
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      lineTotal: item.lineTotal,
    })),
    branchName: invoice.branchName,
    branchCode: invoice.branchCode,
  });

  const inline = new URL(request.url).searchParams.get("inline") === "1";
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${invoice.number}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
