import { NextResponse } from "next/server";
import { PERMISSION_IDS } from "@/lib/permissions/catalog";
import { getSession } from "@/lib/auth/session";
import { generateQuotePdf } from "@/lib/quotes/pdf";
import type { RfqType } from "@/lib/quotes/rfq";
import type { QuoteStatus } from "@/lib/quotes/status";
import { userHasPermission } from "@/server/services/access";
import { getQuoteById } from "@/server/services/quotes";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }
  const allowed = await userHasPermission(
    session.user.id,
    PERMISSION_IDS.quotesRead,
  );
  if (!allowed) {
    return NextResponse.json({ error: "Sin permiso." }, { status: 403 });
  }

  const { id } = await context.params;
  const quote = await getQuoteById(id);
  if (!quote || quote.deletedAt) {
    return NextResponse.json({ error: "La cotización no existe." }, { status: 404 });
  }

  const bytes = await generateQuotePdf({
    number: quote.number,
    status: quote.status as QuoteStatus,
    rfqType: quote.rfqType as RfqType,
    customerName: quote.customerName,
    customerCode: quote.customerCode,
    contactName: quote.contactName,
    contactPhone: quote.contactPhone,
    contactTitle: quote.contactTitle,
    contactDepartment: quote.contactDepartment,
    addresseeMode: quote.addresseeMode,
    currency: quote.currency,
    issueDate: quote.issueDate,
    validUntil: quote.validUntil,
    paymentTerm: quote.paymentTerm,
    paymentTerms: quote.paymentTerms,
    leadTime: quote.leadTime,
    notes: quote.notes,
    subtotal: quote.subtotal,
    taxTotal: quote.taxTotal,
    total: quote.total,
    items: quote.items.map((item) => ({
      position: item.position,
      description: item.description,
      partNumber: item.partNumber,
      quantity: item.quantity,
      unit: item.unit,
      unitPrice: item.unitPrice,
      lineSubtotal: item.lineSubtotal,
      lineTax: item.lineTax,
      lineTotal: item.lineTotal,
    })),
    branchName: quote.branchName,
    branchCode: quote.branchCode,
    branchAddress: quote.branchAddress,
    branchCity: quote.branchCity,
    branchState: quote.branchState,
    branchCountry: quote.branchCountry,
    branchPostalCode: quote.branchPostalCode,
    branchPhone: quote.branchPhone,
    branchEmail: quote.branchEmail,
    branchRfc: quote.branchRfc,
    shippingAddress: quote.shippingAddress,
    shippingCity: quote.shippingCity,
    shippingState: quote.shippingState,
    shippingPostalCode: quote.shippingPostalCode,
    shippingCountry: quote.shippingCountry,
  });

  const inline = new URL(request.url).searchParams.get("inline") === "1";
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${quote.number}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
