import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NcrStatusActions } from "@/features/quality/ncr-status-actions";
import { requirePermission } from "@/lib/auth/session";
import { PERMISSION_IDS } from "@/lib/permissions/catalog";
import { NCR_STATUS_LABELS, type NcrStatus } from "@/lib/quality/catalog";
import { partIdentity } from "@/lib/production/ot-number";
import { getNcrById } from "@/server/services/quality";

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm">{value || "—"}</p>
    </div>
  );
}

export default async function NcrDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { access } = await requirePermission(PERMISSION_IDS.qualityRead);
  const { id } = await params;
  const ncr = await getNcrById(id);
  if (!ncr) notFound();
  const canNcr = access.permissions.includes(PERMISSION_IDS.qualityNcr);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">NCR</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <h2 className="text-2xl font-semibold tracking-tight">{ncr.number}</h2>
            <Badge variant="secondary">{NCR_STATUS_LABELS[ncr.status as NcrStatus]}</Badge>
          </div>
        </div>
        <Link href="/quality" className={buttonVariants({ variant: "outline" })}>
          Volver
        </Link>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>No conformidad</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Número de parte" value={partIdentity(ncr.partNumber, ncr.otNumber)} />
          <Field label="Cliente" value={ncr.customerName} />
          <Field label="Inspección" value={ncr.inspectionNumber} />
          <Field label="Causa" value={ncr.cause} />
          <Field label="Disposición" value={ncr.disposition} />
          <Field label="Notas" value={ncr.notes} />
        </CardContent>
      </Card>
      {canNcr ? (
        <Card>
          <CardHeader>
            <CardTitle>Flujo</CardTitle>
          </CardHeader>
          <CardContent>
            <NcrStatusActions id={ncr.id} status={ncr.status as NcrStatus} />
          </CardContent>
        </Card>
      ) : null}
      <Link href={`/production/${ncr.productionOrderId}`} className="text-sm underline">
        Ver orden de trabajo
      </Link>
    </div>
  );
}
