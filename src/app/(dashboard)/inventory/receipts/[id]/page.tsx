import Link from "next/link";
import { notFound } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ReceivePurchaseForm } from "@/features/purchasing/receive-purchase-form";
import { requirePermission } from "@/lib/auth/session";
import { PERMISSION_IDS } from "@/lib/permissions/catalog";
import {
  canReceivePurchaseOrder,
  PURCHASE_ORDER_STATUS_LABELS,
  type PurchaseOrderStatus,
} from "@/lib/purchasing/catalog";
import { getPurchaseOrderById } from "@/server/services/purchasing";

export default async function InventoryReceiptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { access } = await requirePermission(PERMISSION_IDS.inventoryRead);
  const { id } = await params;
  const po = await getPurchaseOrderById(id);
  if (!po) notFound();
  const status = po.status as PurchaseOrderStatus;
  const canReceive =
    access.permissions.includes(PERMISSION_IDS.inventoryWrite) ||
    access.permissions.includes(PERMISSION_IDS.purchasingReceive);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link href="/inventory" className={buttonVariants({ variant: "ghost" })}>
          ← Inventario
        </Link>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight">
          Recibir {po.number}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {po.supplierCode} · {po.supplierName} · {PURCHASE_ORDER_STATUS_LABELS[status]}
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Material a recibir</CardTitle>
        </CardHeader>
        <CardContent>
          {canReceive && canReceivePurchaseOrder(status) ? (
            <ReceivePurchaseForm purchaseOrderId={po.id} items={po.items} />
          ) : (
            <p className="text-sm text-muted-foreground">
              Esta OC no admite recepción en su estado actual.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
