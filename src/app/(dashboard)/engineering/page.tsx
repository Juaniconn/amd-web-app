import Link from "next/link";
import { EngineeringFilters } from "@/features/engineering/engineering-filters";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { KpiCard } from "@/components/dashboard/kpi-card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requirePermission } from "@/lib/auth/session";
import {
  ENGINEERING_PRIORITY_LABELS,
  ENGINEERING_STATUS_LABELS,
  type EngineeringStatus,
} from "@/lib/engineering/status";
import { PERMISSION_IDS } from "@/lib/permissions/catalog";
import { QUOTE_ENGINEERING_TYPE_LABELS, type QuoteEngineeringType } from "@/lib/quotes/rfq";
import { engineeringStatusSchema } from "@/lib/validation/engineering";
import {
  getEngineeringDashboardStats,
  listEngineeringRequests,
} from "@/server/services/engineering";

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function statusVariant(status: EngineeringStatus) {
  if (status === "cancelado") return "destructive" as const;
  if (status === "liberado") return "default" as const;
  if (status === "pendiente") return "outline" as const;
  return "secondary" as const;
}

export default async function EngineeringPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string | string[];
    status?: string | string[];
    overdue?: string | string[];
    page?: string | string[];
  }>;
}) {
  const { access } = await requirePermission(PERMISSION_IDS.engineeringRead);
  const params = await searchParams;
  const q = first(params.q)?.trim() || undefined;
  const statusParsed = engineeringStatusSchema.safeParse(first(params.status));
  const overdue = first(params.overdue) === "1";
  const page = Number(first(params.page) ?? "1") || 1;
  const canCreate = access.permissions.includes(PERMISSION_IDS.engineeringCreate);
  const stats = await getEngineeringDashboardStats();
  const result = await listEngineeringRequests({
    q,
    status: statusParsed.success ? statusParsed.data : undefined,
    overdue,
    page,
  });

  const query = new URLSearchParams();
  if (q) query.set("q", q);
  if (statusParsed.success) query.set("status", statusParsed.data);
  if (overdue) query.set("overdue", "1");

  function pageHref(nextPage: number) {
    const next = new URLSearchParams(query);
    next.set("page", String(nextPage));
    return `/engineering?${next.toString()}`;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Ingeniería y diseño</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Solicitudes de CAD, revisión, aprobación del cliente y liberación. Los
            registros DEMO no son proyectos reales.
          </p>
        </div>
        {canCreate ? (
          <Link href="/engineering/new" className={buttonVariants()}>
            Nueva solicitud
          </Link>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Solicitudes abiertas" value={String(stats.open)} hint="No aprobadas, liberadas ni canceladas" />
        <KpiCard label="Solicitudes vencidas" value={String(stats.overdue)} hint="Abiertas con fecha compromiso vencida" />
        <KpiCard label="Diseños aprobados" value={String(stats.approvedThisMonth)} hint="Aprobados este mes" />
        <KpiCard label="Diseños rechazados" value={String(stats.rejected)} hint="Solicitudes canceladas" />
        <KpiCard label="Diseños liberados" value={String(stats.released)} hint="Listos para cotización final / OT" />
        <KpiCard label="Horas ingeniería" value={String(stats.hoursLogged)} hint="Suma capturada en solicitudes activas" />
        <KpiCard
          label="Tiempo promedio diseño"
          value={stats.averageDesignDays === null ? "—" : `${stats.averageDesignDays} d`}
          hint="Alta → aprobación o liberación"
        />
      </div>

      <EngineeringFilters
        q={q}
        status={statusParsed.success ? statusParsed.data : undefined}
        overdue={overdue}
      />

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Número</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>RFQ</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Prioridad</TableHead>
              <TableHead>Responsable</TableHead>
              <TableHead>Compromiso</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {result.rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-muted-foreground">
                  No hay solicitudes con esos filtros.
                </TableCell>
              </TableRow>
            ) : (
              result.rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <Link href={`/engineering/${row.id}`} className="font-medium hover:underline">
                      {row.number}
                    </Link>
                    {row.isDemo ? (
                      <Badge variant="outline" className="ml-2">
                        DEMO
                      </Badge>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    <Link href={`/customers/${row.customerId}`} className="hover:underline">
                      {row.customerName}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Link href={`/quotes/${row.quoteId}`} className="hover:underline">
                      {row.quoteNumber}
                    </Link>
                  </TableCell>
                  <TableCell>
                    {QUOTE_ENGINEERING_TYPE_LABELS[row.projectType as QuoteEngineeringType] ??
                      row.projectType}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(row.status as EngineeringStatus)}>
                      {ENGINEERING_STATUS_LABELS[row.status as EngineeringStatus]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {ENGINEERING_PRIORITY_LABELS[row.priority]}
                  </TableCell>
                  <TableCell>{row.assigneeName ?? "—"}</TableCell>
                  <TableCell>
                    {row.dueDate ? row.dueDate.toLocaleDateString("es-MX") : "—"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <p>
          {result.total} registro{result.total === 1 ? "" : "s"} · página {result.page} de{" "}
          {result.pageCount}
        </p>
        <div className="flex gap-2">
          {result.page > 1 ? (
            <Link href={pageHref(result.page - 1)} className={buttonVariants({ variant: "outline" })}>
              Anterior
            </Link>
          ) : null}
          {result.page < result.pageCount ? (
            <Link href={pageHref(result.page + 1)} className={buttonVariants({ variant: "outline" })}>
              Siguiente
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
