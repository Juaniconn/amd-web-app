import Link from "next/link";
import { notFound } from "next/navigation";
import { InspectionResolveForm } from "@/features/quality/inspection-resolve-form";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePermission } from "@/lib/auth/session";
import { PERMISSION_IDS } from "@/lib/permissions/catalog";
import {
  INSPECTION_RESULT_LABELS,
  INSPECTION_TYPE_LABELS,
  type InspectionResult,
  type InspectionType,
} from "@/lib/quality/catalog";
import { displayQty } from "@/lib/inventory/catalog";
import { partIdentity } from "@/lib/production/ot-number";
import { getInspectionById } from "@/server/services/quality";

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm">{value || "—"}</p>
    </div>
  );
}

export default async function InspectionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { access } = await requirePermission(PERMISSION_IDS.qualityRead);
  const { id } = await params;
  const inspection = await getInspectionById(id);
  if (!inspection) notFound();
  const canNcr = access.permissions.includes(PERMISSION_IDS.qualityNcr);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Inspección
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <h2 className="text-2xl font-semibold tracking-tight">{inspection.number}</h2>
            <Badge variant="secondary">
              {INSPECTION_TYPE_LABELS[inspection.type as InspectionType]}
            </Badge>
            <Badge variant={inspection.result === "rechazado" ? "outline" : "secondary"}>
              {INSPECTION_RESULT_LABELS[inspection.result as InspectionResult]}
            </Badge>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href="/quality" className={buttonVariants({ variant: "outline" })}>
            Volver
          </Link>
          {canNcr && inspection.result === "rechazado" ? (
            <Link
              href={`/quality/ncrs/new?ot=${inspection.productionOrderId}&inspection=${inspection.id}`}
              className={buttonVariants()}
            >
              Abrir NCR
            </Link>
          ) : null}
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Resultado</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Número de parte"
            value={partIdentity(inspection.partNumber, inspection.otNumber)}
          />
          <Field label="Cliente" value={inspection.customerName} />
          <Field
            label="Fecha"
            value={inspection.inspectedAt.toLocaleString("es-MX")}
          />
          <Field label="Inspeccionadas" value={displayQty(inspection.qtyInspected)} />
          <Field label="Aceptadas" value={displayQty(inspection.qtyAccepted)} />
          <Field label="Rechazadas" value={displayQty(inspection.qtyRejected)} />
          <Field label="Notas" value={inspection.notes} />
        </CardContent>
      </Card>
      {access.permissions.includes(PERMISSION_IDS.qualityInspect) &&
      inspection.result === "pendiente" ? (
        <Card>
          <CardHeader>
            <CardTitle>Veredicto</CardTitle>
          </CardHeader>
          <CardContent>
            <InspectionResolveForm inspectionId={inspection.id} />
          </CardContent>
        </Card>
      ) : null}
      <Link href={`/production/${inspection.productionOrderId}`} className="text-sm underline">
        Ver número de parte
      </Link>
    </div>
  );
}
