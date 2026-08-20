import Link from "next/link";
import { notFound } from "next/navigation";
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
import { PurchaseOrderStatusActions } from "@/features/purchasing/purchase-order-status-actions";
import { requirePermission } from "@/lib/auth/session";
import { PERMISSION_IDS } from "@/lib/permissions/catalog";
import {
  canEditPurchaseOrder,
  canReceivePurchaseOrder,
  PURCHASE_ORDER_STATUS_LABELS,
  type PurchaseOrderStatus,
} from "@/lib/purchasing/catalog";
import { PAYMENT_TERM_LABELS, type PaymentTerm } from "@/lib/quotes/commercial";
import { displayQty } from "@/lib/inventory/catalog";
import { displayMoney } from "@/lib/quotes/money";
import { workOrderNumber } from "@/lib/production/ot-number";
import { getPurchaseOrderById } from "@/server/services/purchasing";

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm">{value || "—"}</p>
    </div>
  );
}

export default async function PurchaseOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { access } = await requirePermission(PERMISSION_IDS.purchasingRead);
  const { id } = await params;
  const po = await getPurchaseOrderById(id);
  if (!po) notFound();
  const status = po.status as PurchaseOrderStatus;
  const canWrite = access.permissions.includes(PERMISSION_IDS.purchasingWrite);
  const canApprove = access.permissions.includes(PERMISSION_IDS.purchasingApprove);
  const pendingReceive = canReceivePurchaseOrder(status);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Orden de compra
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <h2 className="text-2xl font-semibold tracking-tight">{po.number}</h2>
            <Badge variant="secondary">{PURCHASE_ORDER_STATUS_LABELS[status]}</Badge>
            {po.isUrgent ? <Badge variant="outline">Urgente</Badge> : null}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            <Link href={`/suppliers/${po.supplierId}`} className="hover:underline">
              {po.supplierCode} · {po.supplierName}
            </Link>
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/purchasing" className={buttonVariants({ variant: "outline" })}>
            Volver
          </Link>
          {canWrite && canEditPurchaseOrder(status) ? (
            <Link href={`/purchasing/${po.id}/edit`} className={buttonVariants()}>
              Editar
            </Link>
          ) : null}
          <a href={`/api/purchasing/${po.id}/pdf`} className={buttonVariants({ variant: "outline" })}>
            Descargar PDF
          </a>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Encabezado</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <Field label="Sucursal" value={po.branchCode ? `${po.branchCode} · ${po.branchName}` : null} />
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Orden de trabajo
            </p>
            {po.workOrderId && po.workOrderNumber ? (
              <Link
                href={`/orders/${po.workOrderId}`}
                className="mt-1 block text-sm hover:underline"
              >
                {workOrderNumber(po.workOrderNumber)}
              </Link>
            ) : (
              <p className="mt-1 text-sm">—</p>
            )}
          </div>
          <Field
            label="Solicitud"
            value={po.requestNumber}
          />
          <Field
            label="Pago"
            value={PAYMENT_TERM_LABELS[(po.paymentTerm as PaymentTerm) ?? "net_30"]}
          />
          <Field
            label="Fecha esperada"
            value={po.expectedDate?.toLocaleDateString("es-MX") ?? null}
          />
          <Field label="Subtotal" value={displayMoney(po.subtotal, po.currency)} />
          <Field label="IVA" value={displayMoney(po.taxTotal, po.currency)} />
          <Field label="Total" value={displayMoney(po.total, po.currency)} />
          <Field label="Notas" value={po.notes} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Partidas</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Material</TableHead>
                <TableHead>Proveedor</TableHead>
                <TableHead>Cantidad</TableHead>
                <TableHead>Recibido</TableHead>
                <TableHead>Precio</TableHead>
                <TableHead>Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {po.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <span className="font-medium">{item.materialCode}</span>
                    <span className="block text-muted-foreground">
                      {item.materialDescription ?? item.description}
                    </span>
                  </TableCell>
                  <TableCell>
                    {po.supplierCode} · {po.supplierName}
                  </TableCell>
                  <TableCell>{displayQty(item.quantity)}</TableCell>
                  <TableCell>{displayQty(item.receivedQty)}</TableCell>
                  <TableCell>{displayMoney(item.unitPrice, po.currency)}</TableCell>
                  <TableCell>{displayMoney(item.lineTotal, po.currency)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Flujo</CardTitle>
        </CardHeader>
        <CardContent>
          <PurchaseOrderStatusActions
            id={po.id}
            status={status}
            canWrite={canWrite}
            canApprove={canApprove}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recepción</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {pendingReceive ? (
            <p>
              Pendiente. Inventario recibe el material de esta OC. Aquí solo se ve el
              estado.
            </p>
          ) : status === "recibida" || status === "cerrada" ? (
            <p>Recibida. Inventario ya confirmó la entrada.</p>
          ) : status === "borrador" ? (
            <p>Aún no se envía al proveedor. Al pulsar Enviar se abre la recepción en Inventario.</p>
          ) : (
            <p>Estado: {PURCHASE_ORDER_STATUS_LABELS[status]}.</p>
          )}
          {po.receipts.length > 0 ? (
            <div className="space-y-1">
              {po.receipts.map((receipt) => (
                <p key={receipt.id}>
                  {receipt.number} · {receipt.receivedAt.toLocaleString("es-MX")}
                  {receipt.notes ? ` · ${receipt.notes}` : ""}
                </p>
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
