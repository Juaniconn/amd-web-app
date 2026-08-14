import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductionForm } from "@/features/production/production-form";
import { buttonVariants } from "@/components/ui/button";
import { requirePermission } from "@/lib/auth/session";
import { canEditProduction } from "@/lib/production/status";
import { PERMISSION_IDS } from "@/lib/permissions/catalog";
import { getProductionOrderById, listOrderItems } from "@/server/services/production";
import {
  listMachines,
  listProductionRoutes,
  listWorkCenters,
} from "@/server/services/production-catalogs";
import { listUsersForProduction } from "@/server/services/production";

export default async function EditProductionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermission(PERMISSION_IDS.productionUpdate);
  const { id } = await params;
  const order = await getProductionOrderById(id);
  if (!order || !canEditProduction(order.status)) notFound();

  const items = await listOrderItems(order.orderId);
  const routes = await listProductionRoutes({ activeOnly: true });
  const workCenters = await listWorkCenters({ activeOnly: true });
  const machines = await listMachines({ activeOnly: true });
  const users = await listUsersForProduction();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Editar OT</h2>
          <p className="mt-1 text-sm text-muted-foreground">{order.number}</p>
        </div>
        <Link
          href={`/production/${order.id}`}
          className={buttonVariants({ variant: "outline" })}
        >
          Cancelar
        </Link>
      </div>
      <ProductionForm
        mode="edit"
        productionOrderId={order.id}
        orders={[
          {
            id: order.orderId,
            number: order.orderNumber,
            customerName: order.customerName,
            quoteNumber: order.quoteNumber,
            origin: order.origin,
            engineeringNumber: order.engineeringNumber,
          },
        ]}
        items={items}
        routes={routes.map((route) => ({ id: route.id, name: route.name }))}
        workCenters={workCenters.map((center) => ({ id: center.id, name: center.name }))}
        machines={machines.map((machine) => ({
          id: machine.id,
          name: machine.name,
          workCenterId: machine.workCenterId,
        }))}
        users={users}
        defaultValues={{
          orderId: order.orderId,
          orderItemId: order.orderItemId ?? "",
          routeId: order.routeId ?? "",
          description: order.description,
          partNumber: order.partNumber ?? "",
          quantity: order.quantity,
          unit: order.unit,
          promisedDate: order.promisedDate.toISOString().slice(0, 10),
          priority: order.priority,
          notes: order.notes ?? "",
          workCenterId: order.workCenterId ?? "",
          machineId: order.machineId ?? "",
          operatorUserId: order.operatorUserId ?? "",
        }}
      />
    </div>
  );
}
