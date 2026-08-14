import Link from "next/link";
import { ProductionForm } from "@/features/production/production-form";
import { buttonVariants } from "@/components/ui/button";
import { requirePermission } from "@/lib/auth/session";
import { PERMISSION_IDS } from "@/lib/permissions/catalog";
import {
  listOrderItems,
  listOrdersEligibleForProduction,
  listUsersForProduction,
} from "@/server/services/production";
import {
  listMachines,
  listProductionRoutes,
  listWorkCenters,
} from "@/server/services/production-catalogs";

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function NewProductionPage({
  searchParams,
}: {
  searchParams: Promise<{ orderId?: string | string[] }>;
}) {
  await requirePermission(PERMISSION_IDS.productionCreate);
  const params = await searchParams;
  const orderId = first(params.orderId);
  const orders = await listOrdersEligibleForProduction();
  const selected = orders.find((order) => order.id === orderId) ?? orders[0];
  const items = selected ? await listOrderItems(selected.id) : [];
  const routes = await listProductionRoutes({ activeOnly: true });
  const workCenters = await listWorkCenters({ activeOnly: true });
  const machines = await listMachines({ activeOnly: true });
  const users = await listUsersForProduction();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Nueva orden de trabajo</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            La OT nace del pedido. Diseño solamente y origen RFQ + Ingeniería sin
            Liberado están bloqueados.
          </p>
        </div>
        <Link href="/production" className={buttonVariants({ variant: "outline" })}>
          Volver
        </Link>
      </div>
      {orders.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No hay pedidos elegibles. Convierte una RFQ a pedido. Las RFQ de diseño
          solamente no generan OT.
        </p>
      ) : (
        <ProductionForm
          mode="create"
          orders={orders}
          items={items}
          routes={routes.map((route) => ({ id: route.id, name: route.name }))}
          workCenters={workCenters.map((center) => ({ id: center.id, name: center.name }))}
          machines={machines.map((machine) => ({
            id: machine.id,
            name: machine.name,
            workCenterId: machine.workCenterId,
          }))}
          users={users}
          defaultValues={
            selected
              ? {
                  orderId: selected.id,
                  description: `Fabricación ${selected.number}.`,
                }
              : undefined
          }
        />
      )}
    </div>
  );
}
