import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { NcrForm } from "@/features/quality/ncr-form";
import { requirePermission } from "@/lib/auth/session";
import { PERMISSION_IDS } from "@/lib/permissions/catalog";
import {
  listInspectionOptions,
  listProductionOrdersForQuality,
} from "@/server/services/quality";

export default async function NewNcrPage({
  searchParams,
}: {
  searchParams: Promise<{ ot?: string | string[]; inspection?: string | string[] }>;
}) {
  await requirePermission(PERMISSION_IDS.qualityNcr);
  const params = await searchParams;
  const ot = Array.isArray(params.ot) ? params.ot[0] : params.ot;
  const inspection = Array.isArray(params.inspection)
    ? params.inspection[0]
    : params.inspection;
  const [orders, inspections] = await Promise.all([
    listProductionOrdersForQuality(),
    listInspectionOptions(),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link href="/quality" className={buttonVariants({ variant: "ghost" })}>
          ← Calidad
        </Link>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight">Nuevo NCR</h2>
      </div>
      <NcrForm
        orders={orders}
        inspections={inspections}
        defaultProductionOrderId={ot}
        defaultInspectionId={inspection}
      />
    </div>
  );
}
