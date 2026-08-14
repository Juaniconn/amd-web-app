import Link from "next/link";
import { notFound } from "next/navigation";
import { ArchiveEngineeringButton } from "@/features/engineering/archive-engineering-button";
import { EngineeringDocuments } from "@/features/engineering/engineering-documents";
import { EngineeringHoursPanel } from "@/features/engineering/engineering-hours-panel";
import { EngineeringStatusActions } from "@/features/engineering/engineering-status-actions";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePermission } from "@/lib/auth/session";
import {
  canEditEngineering,
  canLogEngineeringHours,
  ENGINEERING_PRIORITY_LABELS,
  ENGINEERING_STATUS_LABELS,
  type EngineeringStatus,
} from "@/lib/engineering/status";
import { PERMISSION_IDS } from "@/lib/permissions/catalog";
import { QUOTE_ENGINEERING_TYPE_LABELS, type QuoteEngineeringType } from "@/lib/quotes/rfq";
import { listEngineeringActivity } from "@/server/services/activity";
import {
  getEngineeringRequestById,
  listUsersForAssignment,
} from "@/server/services/engineering";

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

export default async function EngineeringDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { access } = await requirePermission(PERMISSION_IDS.engineeringRead);
  const { id } = await params;
  const request = await getEngineeringRequestById(id);
  if (!request) notFound();

  const activity = await listEngineeringActivity(request.id);
  const users = await listUsersForAssignment();
  const status = request.status as EngineeringStatus;
  const canUpdate = access.permissions.includes(PERMISSION_IDS.engineeringUpdate);
  const canDelete = access.permissions.includes(PERMISSION_IDS.engineeringDelete);
  const editable = canUpdate && canEditEngineering(status) && !request.deletedAt;
  const canHours = canUpdate && canLogEngineeringHours(status);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-2xl font-semibold tracking-tight">{request.number}</h2>
            <Badge variant="secondary">{ENGINEERING_STATUS_LABELS[status]}</Badge>
            {request.isDemo ? <Badge variant="outline">DEMO</Badge> : null}
            {request.deletedAt ? <Badge variant="destructive">Archivada</Badge> : null}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            <Link href={`/customers/${request.customerId}`} className="hover:underline">
              {request.customerName}
            </Link>
            {" · "}
            <Link href={`/quotes/${request.quoteId}`} className="hover:underline">
              {request.quoteNumber}
            </Link>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/engineering" className={buttonVariants({ variant: "outline" })}>
            Volver
          </Link>
          {editable ? (
            <Link
              href={`/engineering/${request.id}/edit`}
              className={buttonVariants({ variant: "outline" })}
            >
              Editar
            </Link>
          ) : null}
          {canDelete &&
          !request.deletedAt &&
          (status === "pendiente" || status === "cancelado") ? (
            <ArchiveEngineeringButton requestId={request.id} number={request.number} />
          ) : null}
        </div>
      </div>

      {!request.deletedAt ? (
        <EngineeringStatusActions
          requestId={request.id}
          status={status}
          assigneeUserId={request.assigneeUserId}
          users={users}
          permissions={access.permissions}
        />
      ) : null}

      {status === "liberado" ? (
        <p className="rounded-lg border bg-muted/40 px-4 py-3 text-sm">
          Plano liberado. La RFQ puede cerrar cotización final y el pedido futuro
          nacerá con origen <span className="font-medium">RFQ + Ingeniería</span>.
        </p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Información general</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Cliente" value={request.customerName} />
          <Field label="RFQ" value={request.quoteNumber} />
          <Field label="Responsable" value={request.assigneeName} />
          <Field
            label="Tipo"
            value={QUOTE_ENGINEERING_TYPE_LABELS[request.projectType as QuoteEngineeringType]}
          />
          <Field label="Prioridad" value={ENGINEERING_PRIORITY_LABELS[request.priority]} />
          <Field
            label="Fecha compromiso"
            value={request.dueDate?.toLocaleDateString("es-MX") ?? null}
          />
          <Field label="Horas" value={`${request.hoursLogged} h`} />
          <Field
            label="Liberado"
            value={request.releasedAt?.toLocaleString("es-MX") ?? null}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Descripción</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="whitespace-pre-wrap text-sm">{request.description}</p>
          {request.notes ? (
            <p className="mt-4 whitespace-pre-wrap text-sm text-muted-foreground">
              {request.notes}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Archivos de ingeniería</CardTitle>
        </CardHeader>
        <CardContent>
          <EngineeringDocuments
            engineeringRequestId={request.id}
            documents={request.documents}
            canWrite={editable}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Horas de ingeniería</CardTitle>
        </CardHeader>
        <CardContent>
          <EngineeringHoursPanel
            engineeringRequestId={request.id}
            hoursLogged={request.hoursLogged}
            entries={request.hoursEntries}
            canWrite={canHours}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Historial</CardTitle>
        </CardHeader>
        <CardContent>
          {activity.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aún no hay actividad registrada.</p>
          ) : (
            <ul className="space-y-3">
              {activity.map((item) => (
                <li key={item.id} className="border-b pb-3 last:border-0 last:pb-0">
                  <p className="text-sm">{item.summary}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {item.createdAt.toLocaleString("es-MX")}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
