import Link from "next/link";
import { notFound } from "next/navigation";
import { ArchiveBranchButton } from "@/features/branches/archive-branch-button";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BRANCH_STATUS_LABELS } from "@/lib/branches/catalog";
import { PERMISSION_IDS } from "@/lib/permissions/catalog";
import { requirePermission } from "@/lib/auth/session";
import { getBranchById } from "@/server/services/branches";

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-sm">{value || "—"}</p>
    </div>
  );
}

export default async function BranchDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { access } = await requirePermission(PERMISSION_IDS.branchesRead);
  const { id } = await params;
  const branch = await getBranchById(id);
  if (!branch || branch.deletedAt) notFound();
  const canWrite = access.permissions.includes(PERMISSION_IDS.branchesWrite);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-2xl font-semibold tracking-tight">{branch.name}</h2>
            <Badge variant={branch.status === "activo" ? "secondary" : "outline"}>
              {BRANCH_STATUS_LABELS[branch.status]}
            </Badge>
            {branch.isOfficialSeed ? <Badge variant="outline">Oficial</Badge> : null}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{branch.code}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/settings/branches" className={buttonVariants({ variant: "outline" })}>
            Volver
          </Link>
          {canWrite ? (
            <Link
              href={`/settings/branches/${branch.id}/edit`}
              className={buttonVariants({ variant: "outline" })}
            >
              Editar
            </Link>
          ) : null}
          {canWrite && !branch.isOfficialSeed ? (
            <ArchiveBranchButton branchId={branch.id} name={branch.name} />
          ) : null}
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Datos oficiales</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Dirección" value={branch.address} />
          <Field label="Ciudad" value={branch.city} />
          <Field label="Estado" value={branch.state} />
          <Field label="País" value={branch.country} />
          <Field label="Código postal" value={branch.postalCode} />
          <Field label="Teléfono" value={branch.phone} />
          <Field label="Correo" value={branch.email} />
          <Field label="RFC / Tax ID" value={branch.rfc} />
        </CardContent>
      </Card>
    </div>
  );
}
