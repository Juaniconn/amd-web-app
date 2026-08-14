import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePermission } from "@/lib/auth/session";
import {
  MACHINE_STATUS_LABELS,
  type MachineStatus,
} from "@/lib/production/catalog";
import { PERMISSION_IDS } from "@/lib/permissions/catalog";
import { getMachineById } from "@/server/services/production-catalogs";

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

export default async function MachineDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { access } = await requirePermission(PERMISSION_IDS.productionView);
  const { id } = await params;
  const machine = await getMachineById(id);
  if (!machine) notFound();
  const canUpdate = access.permissions.includes(PERMISSION_IDS.productionUpdate);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-2xl font-semibold tracking-tight">{machine.name}</h2>
            <Badge variant="secondary">
              {MACHINE_STATUS_LABELS[machine.status as MachineStatus]}
            </Badge>
            {machine.isDemo ? <Badge variant="outline">DEMO</Badge> : null}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{machine.workCenterName}</p>
        </div>
        <div className="flex gap-2">
          <Link href="/machines" className={buttonVariants({ variant: "outline" })}>
            Volver
          </Link>
          {canUpdate ? (
            <Link
              href={`/machines/${machine.id}/edit`}
              className={buttonVariants({ variant: "outline" })}
            >
              Editar
            </Link>
          ) : null}
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Ficha</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Marca" value={machine.brand} />
          <Field label="Modelo" value={machine.model} />
          <Field label="Año" value={machine.year ? String(machine.year) : null} />
          <Field label="Centro" value={machine.workCenterName} />
          <Field label="Horas / turno" value={machine.hoursPerShift} />
          <Field label="Capacidad" value={machine.capacity} />
          <Field
            label="Fecha alta"
            value={machine.commissionedAt?.toLocaleDateString("es-MX")}
          />
          <Field
            label="Fecha baja"
            value={machine.decommissionedAt?.toLocaleDateString("es-MX")}
          />
          <Field label="Activo" value={machine.active ? "Sí" : "No"} />
          <Field label="Observaciones" value={machine.notes} />
        </CardContent>
      </Card>
    </div>
  );
}
