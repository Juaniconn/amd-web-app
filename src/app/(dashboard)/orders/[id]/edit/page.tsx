import Link from "next/link";
import { notFound } from "next/navigation";
import { OrderForm } from "@/features/orders/order-form";
import { buttonVariants } from "@/components/ui/button";
import { requirePermission } from "@/lib/auth/session";
import { canEditOrder, type OrderStatus } from "@/lib/orders/status";
import { PERMISSION_IDS } from "@/lib/permissions/catalog";
import { getOrderById, listUsersForOrders, resolveOrdersModuleId } from "@/server/services/orders";
import { listProjectsByCustomer } from "@/server/services/projects";

function toDateInput(value: Date | null) {
  if (!value) return "";
  return value.toISOString().slice(0, 10);
}

export default async function EditOrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermission(PERMISSION_IDS.ordersUpdate);
  const { id } = await params;
  const resolved = await resolveOrdersModuleId(id);
  if (!resolved) notFound();
  const order = await getOrderById(resolved.orderId);
  if (!order) notFound();
  if (!canEditOrder(order.status as OrderStatus)) {
    notFound();
  }

  const users = await listUsersForOrders();
  const projects = await listProjectsByCustomer(order.customerId);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Editar {order.number}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Campos comerciales. El material se gestiona en la ficha de la orden de
            trabajo.
          </p>
        </div>
        <Link
          href={`/orders/${order.id}#materiales`}
          className={buttonVariants({ variant: "outline" })}
        >
          Volver
        </Link>
      </div>
      <OrderForm
        orderId={order.id}
        users={users}
        projects={projects}
        defaultValues={{
          ownerUserId: order.ownerUserId ?? "",
          promisedDate: toDateInput(order.promisedDate),
          projectId: order.projectId ?? "",
          notes: order.notes ?? "",
        }}
      />
    </div>
  );
}
