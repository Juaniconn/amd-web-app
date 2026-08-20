import Link from "next/link";
import { notFound } from "next/navigation";
import { ConvertRequestForm } from "@/features/purchasing/convert-request-form";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requirePermission } from "@/lib/auth/session";
import { displayQty } from "@/lib/inventory/catalog";
import { PERMISSION_IDS } from "@/lib/permissions/catalog";
import {
  canConvertPurchaseRequest,
  PURCHASE_REQUEST_STATUS_LABELS,
  type PurchaseRequestStatus,
} from "@/lib/purchasing/catalog";
import { PAYMENT_TERM_LABELS, type PaymentTerm } from "@/lib/quotes/commercial";
import { displayMoney } from "@/lib/quotes/money";
import { getPurchaseRequestById } from "@/server/services/purchasing";

export default async function PurchaseRequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { access } = await requirePermission(PERMISSION_IDS.purchasingRead);
  const { id } = await params;
  const request = await getPurchaseRequestById(id);
  if (!request) notFound();
  const status = request.status as PurchaseRequestStatus;
  const canWrite = access.permissions.includes(PERMISSION_IDS.purchasingWrite);
  const ready = request.items.every((item) => item.supplierId);
  const paymentTerms = [
    ...new Set(
      request.items
        .map((item) => item.paymentTerm)
        .filter((value): value is string => Boolean(value)),
    ),
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Solicitud de material
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <h2 className="text-2xl font-semibold tracking-tight">{request.number}</h2>
            <Badge variant="secondary">{PURCHASE_REQUEST_STATUS_LABELS[status]}</Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Viene de la orden de trabajo{" "}
            <Link href={`/orders/${request.orderId}`} className="font-medium hover:underline">
              {request.workOrderNumber}
            </Link>
            {request.orderBranchCode
              ? ` · sucursal ${request.orderBranchCode} · ${request.orderBranchName}`
              : ""}
            {paymentTerms.length === 1
              ? ` · plazo ${PAYMENT_TERM_LABELS[paymentTerms[0] as PaymentTerm] ?? paymentTerms[0]}`
              : ""}
            .
          </p>
        </div>
        <Link href="/purchasing" className={buttonVariants({ variant: "outline" })}>
          Volver
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Material a pedir</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Proveedor, sucursal y precio salen del material. Al crear la OC se
            copian solos.
          </p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Material</TableHead>
                <TableHead>Proveedor</TableHead>
                <TableHead>Sucursal</TableHead>
                <TableHead>Almacén</TableHead>
                <TableHead className="text-right">Cantidad</TableHead>
                <TableHead className="text-right">Precio</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {request.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <span className="font-medium">{item.materialCode}</span>
                    <span className="block text-muted-foreground">
                      {item.materialDescription}
                    </span>
                  </TableCell>
                  <TableCell>
                    {item.supplierCode
                      ? `${item.supplierCode} · ${item.supplierName}`
                      : "Sin proveedor"}
                  </TableCell>
                  <TableCell>
                    {item.branchCode
                      ? `${item.branchCode} · ${item.branchName}`
                      : "—"}
                  </TableCell>
                  <TableCell>{item.warehouseName}</TableCell>
                  <TableCell className="text-right">
                    {displayQty(item.quantity)} {item.unitCode}
                  </TableCell>
                  <TableCell className="text-right">
                    {item.costPerKg
                      ? `${displayMoney(item.costPerKg, "mxn")}/${item.unitCode}`
                      : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {canWrite && canConvertPurchaseRequest(status) ? (
            <div className="space-y-2">
              {!ready ? (
                <p className="text-sm text-destructive">
                  Falta proveedor en algún material. Asígnalo en Inventario para
                  poder crear la OC.
                </p>
              ) : null}
              <ConvertRequestForm requestId={request.id} disabled={!ready} />
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
