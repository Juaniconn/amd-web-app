import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { InvoiceFromOrderForm } from "@/features/billing/invoice-from-order-form";
import { requirePermission } from "@/lib/auth/session";
import { PERMISSION_IDS } from "@/lib/permissions/catalog";
import { listPendingToInvoice } from "@/server/services/billing";

export default async function NewInvoicePage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string | string[] }>;
}) {
  await requirePermission(PERMISSION_IDS.billingWrite);
  const params = await searchParams;
  const orderId = Array.isArray(params.order) ? params.order[0] : params.order;
  const orders = await listPendingToInvoice();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link href="/billing" className={buttonVariants({ variant: "ghost" })}>
          ← Facturación
        </Link>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight">Nueva factura operativa</h2>
      </div>
      {orders.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No hay órdenes de trabajo pendientes de facturar. Todas las vigentes ya tienen factura o
          están canceladas.
        </p>
      ) : (
        <InvoiceFromOrderForm orders={orders} defaultOrderId={orderId} />
      )}
    </div>
  );
}
