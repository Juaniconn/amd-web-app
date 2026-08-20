import Link from "next/link";
import { notFound } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { DeliveryForm } from "@/features/deliveries/delivery-form";
import { requirePermission } from "@/lib/auth/session";
import { canEditDelivery, type DeliveryStatus } from "@/lib/deliveries/catalog";
import { inputQty } from "@/lib/inventory/catalog";
import { PERMISSION_IDS } from "@/lib/permissions/catalog";
import { listBranches } from "@/server/services/branches";
import { getDeliveryById, listOrdersForDelivery } from "@/server/services/deliveries";

export default async function EditDeliveryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermission(PERMISSION_IDS.deliveriesWrite);
  const { id } = await params;
  const delivery = await getDeliveryById(id);
  if (!delivery || !canEditDelivery(delivery.status as DeliveryStatus)) notFound();
  const [orders, branches] = await Promise.all([
    listOrdersForDelivery(),
    listBranches({ activeOnly: true }),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link href={`/deliveries/${delivery.id}`} className={buttonVariants({ variant: "ghost" })}>
          ← {delivery.number}
        </Link>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight">Gestionar entrega</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Programa fecha y transportista. El resto viene de la orden de trabajo.
        </p>
      </div>
      <DeliveryForm
        mode="edit"
        deliveryId={delivery.id}
        orders={orders}
        branches={branches}
        manageOnly
        defaultValues={{
          orderId: delivery.orderId,
          branchId: delivery.branchId ?? "",
          scheduledDate: delivery.scheduledDate
            ? delivery.scheduledDate.toISOString().slice(0, 10)
            : "",
          carrier: delivery.carrier ?? "",
          trackingNumber: delivery.trackingNumber ?? "",
          quantity: delivery.quantity ? inputQty(delivery.quantity) : "",
          shippingAddress: delivery.shippingAddress ?? "",
          shippingCity: delivery.shippingCity ?? "",
          shippingState: delivery.shippingState ?? "",
          shippingCountry: delivery.shippingCountry ?? "México",
          notes: delivery.notes ?? "",
        }}
      />
    </div>
  );
}
