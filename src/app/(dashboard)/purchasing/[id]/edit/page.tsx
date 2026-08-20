import Link from "next/link";
import { notFound } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { PurchaseOrderForm } from "@/features/purchasing/purchase-order-form";
import { requirePermission } from "@/lib/auth/session";
import { PERMISSION_IDS } from "@/lib/permissions/catalog";
import { canEditPurchaseOrder, type PurchaseOrderStatus } from "@/lib/purchasing/catalog";
import type { PaymentTerm } from "@/lib/quotes/commercial";
import { inputQty } from "@/lib/inventory/catalog";
import { inputMoney } from "@/lib/quotes/money";
import { listBranches } from "@/server/services/branches";
import { listActiveMaterialsForSelect } from "@/server/services/inventory";
import { getPurchaseOrderById, listActiveSuppliers } from "@/server/services/purchasing";

export default async function EditPurchaseOrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermission(PERMISSION_IDS.purchasingWrite);
  const { id } = await params;
  const po = await getPurchaseOrderById(id);
  if (!po || !canEditPurchaseOrder(po.status as PurchaseOrderStatus)) notFound();
  const [suppliers, branches, materials] = await Promise.all([
    listActiveSuppliers(),
    listBranches({ activeOnly: true }),
    listActiveMaterialsForSelect(),
  ]);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <Link href={`/purchasing/${po.id}`} className={buttonVariants({ variant: "ghost" })}>
          ← {po.number}
        </Link>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight">Editar OC</h2>
      </div>
      <PurchaseOrderForm
        mode="edit"
        purchaseOrderId={po.id}
        suppliers={suppliers}
        branches={branches}
        materials={materials}
        defaultValues={{
          supplierId: po.supplierId,
          branchId: po.branchId ?? "",
          expectedDate: po.expectedDate
            ? po.expectedDate.toISOString().slice(0, 10)
            : "",
          currency: po.currency as "mxn" | "usd",
          paymentTerm: (po.paymentTerm as PaymentTerm) ?? "net_30",
          isUrgent: po.isUrgent,
          urgentReason: po.urgentReason ?? "",
          notes: po.notes ?? "",
          items: po.items.map((item) => ({
            materialId: item.materialId,
            description: item.description,
            quantity: inputQty(item.quantity),
            unitPrice: inputMoney(item.unitPrice),
            taxPercent: String(Number(item.taxPercent)),
          })),
        }}
      />
    </div>
  );
}
