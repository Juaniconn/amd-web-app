import Link from "next/link";
import { notFound } from "next/navigation";
import { ArchiveEngineeringButton } from "@/features/engineering/archive-engineering-button";
import { EngineeringDocuments } from "@/features/engineering/engineering-documents";
import { EngineeringHoursPanel } from "@/features/engineering/engineering-hours-panel";
import { EngineeringStatusActions } from "@/features/engineering/engineering-status-actions";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard, StatRow } from "@/components/shared/ui-patterns";
import { requirePermission } from "@/lib/auth/session";
import {
  canEditEngineering,
  canLogEngineeringHours,
  ENGINEERING_PRIORITY_LABELS,
  ENGINEERING_STATUS_LABELS,
  type EngineeringStatus,
} from "@/lib/engineering/status";
import { PERMISSION_IDS } from "@/lib/permissions/catalog";
import {
  formatHoursMinutes,
  hoursToMinutes,
} from "@/lib/production/catalog";
import { QUOTE_ENGINEERING_TYPE_LABELS, type QuoteEngineeringType } from "@/lib/quotes/rfq";
import { listEngineeringActivity } from "@/server/services/activity";
import {
  getEngineeringRequestById,
  listUsersForAssignment,
} from "@/server/services/engineering";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  FileText,
  Timer,
  User,
} from "lucide-react";

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

function statusSemaforo(status: EngineeringStatus) {
  if (status === "liberado") return "bg-emerald-500";
  if (status === "cancelado") return "bg-red-500";
  return "bg-amber-500";
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

  const hoursDisplay = formatHoursMinutes(hoursToMinutes(Number(request.hoursLogged)));

  return (
    <div className="space-y-4">
      <PageHeader
        title={request.number}
        description={`${ENGINEERING_STATUS_LABELS[status]}${request.isDemo ? " · DEMO" : ""}${request.deletedAt ? " · Archivada" : ""}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href="/engineering" className={buttonVariants({ variant: "outline", size: "sm" })}>
              Volver
            </Link>
            {editable ? (
              <Link
                href={`/engineering/${request.id}/edit`}
                className={buttonVariants({ variant: "outline", size: "sm" })}
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
        }
      />

      {/* Semáforo status bar */}
      <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2">
        <span className={`h-2.5 w-2.5 rounded-full ${statusSemaforo(status)}`} />
        <span className="text-sm font-medium">{ENGINEERING_STATUS_LABELS[status]}</span>
        {request.isDemo && <Badge variant="outline">DEMO</Badge>}
        {request.deletedAt && <Badge variant="destructive">Archivada</Badge>}
      </div>

      {/* Breadcrumb / contexto */}
      <div className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
        <Link href={`/customers/${request.customerId}`} className="hover:underline">
          {request.customerName}
        </Link>
        <span>·</span>
        <Link href={`/quotes/${request.quoteId}`} className="hover:underline">
          {request.quoteNumber}
        </Link>
      </div>

      {/* KPIs */}
      <StatRow>
        <StatCard
          label="Estado"
          value={ENGINEERING_STATUS_LABELS[status]}
          tone={status === "liberado" ? "green" : status === "cancelado" ? "red" : "amber"}
          icon={<AlertCircle className="h-4 w-4" />}
        />
        <StatCard
          label="Prioridad"
          value={ENGINEERING_PRIORITY_LABELS[request.priority]}
          tone={request.priority === "alta" ? "red" : request.priority === "media" ? "amber" : "neutral"}
          icon={<Clock className="h-4 w-4" />}
        />
        <StatCard
          label="Horas registradas"
          value={hoursDisplay}
          icon={<Timer className="h-4 w-4" />}
        />
        <StatCard
          label="Responsable"
          value={request.assigneeName ?? "Sin asignar"}
          icon={<User className="h-4 w-4" />}
        />
      </StatRow>

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
        <div className="rounded-lg border bg-emerald-50 dark:bg-emerald-950/30 px-4 py-3 text-sm flex items-start gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
          <span>
            Plano liberado. Los planos pasan a la cotización, se generan las partidas
            y la calculadora arma el precio. La orden de trabajo futura nacerá con origen{" "}
            <span className="font-medium">RFQ + Ingeniería</span>.
          </span>
        </div>
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
          <Field
            label="Horas"
            value={hoursDisplay}
          />
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
          <CardDescription>
            Sube el plano PDF y el CAD. Al liberar, pasan a la cotización y la
            calculadora genera las partidas.
          </CardDescription>
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