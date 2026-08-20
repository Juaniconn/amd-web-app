import { NextResponse } from "next/server";
import { PERMISSION_IDS } from "@/lib/permissions/catalog";
import { getSession } from "@/lib/auth/session";
import { generatePurchaseOrderPdf } from "@/lib/purchasing/pdf";
import { userHasPermission } from "@/server/services/access";
import { getPurchaseOrderById } from "@/server/services/purchasing";
import { workOrderNumber } from "@/lib/production/ot-number";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }
  const allowed = await userHasPermission(session.user.id, PERMISSION_IDS.purchasingRead);
  if (!allowed) {
    return NextResponse.json({ error: "Sin permiso." }, { status: 403 });
  }
  const { id } = await context.params;
  const po = await getPurchaseOrderById(id);
  if (!po) {
    return NextResponse.json({ error: "La orden de compra no existe." }, { status: 404 });
  }
  const bytes = await generatePurchaseOrderPdf({
    number: po.number,
    supplierName: po.supplierName,
    supplierCode: po.supplierCode,
    issueDate: po.issueDate,
    currency: po.currency,
    notes: po.notes,
    subtotal: po.subtotal,
    taxTotal: po.taxTotal,
    total: po.total,
    workOrderNumber: po.workOrderNumber ? workOrderNumber(po.workOrderNumber) : null,
    items: po.items.map((item) => ({
      materialCode: item.materialCode,
      description: item.materialDescription ?? item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      lineTotal: item.lineTotal,
    })),
  });
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${po.number}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
