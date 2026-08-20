import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { InspectionForm } from "@/features/quality/inspection-form";
import { requirePermission } from "@/lib/auth/session";
import { PERMISSION_IDS } from "@/lib/permissions/catalog";
import { listProductionOrdersForQuality } from "@/server/services/quality";

export default async function NewInspectionPage({
  searchParams,
}: {
  searchParams: Promise<{ ot?: string | string[] }>;
}) {
  await requirePermission(PERMISSION_IDS.qualityInspect);
  const params = await searchParams;
  const ot = Array.isArray(params.ot) ? params.ot[0] : params.ot;
  const orders = await listProductionOrdersForQuality();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link href="/quality" className={buttonVariants({ variant: "ghost" })}>
          ← Calidad
        </Link>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight">Nueva inspección</h2>
      </div>
      {orders.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No hay números de parte para inspeccionar. Crea uno desde Producción.
        </p>
      ) : (
        <InspectionForm orders={orders} defaultProductionOrderId={ot} />
      )}
    </div>
  );
}
