import Link from "next/link";
import { ProjectFilters } from "@/features/projects/project-filters";
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
import { PERMISSION_IDS } from "@/lib/permissions/catalog";
import { PROJECT_STATUS_LABELS, type ProjectStatus } from "@/lib/projects/status";
import { projectStatusSchema } from "@/lib/validation/projects";
import { getProjectDashboardStats } from "@/server/services/projects-kpis";
import { listProjects } from "@/server/services/projects";

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function statusVariant(status: ProjectStatus) {
  if (status === "cancelado") return "destructive" as const;
  if (status === "completado") return "default" as const;
  if (status === "planeacion" || status === "pausado") return "outline" as const;
  return "secondary" as const;
}

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string | string[];
    status?: string | string[];
    delayed?: string | string[];
    page?: string | string[];
  }>;
}) {
  const { access } = await requirePermission(PERMISSION_IDS.projectsView);
  const params = await searchParams;
  const q = first(params.q)?.trim() || undefined;
  const statusParsed = projectStatusSchema.safeParse(first(params.status));
  const delayed = first(params.delayed) === "1";
  const page = Number(first(params.page) ?? "1") || 1;
  const canCreate = access.permissions.includes(PERMISSION_IDS.projectsCreate);
  const stats = await getProjectDashboardStats();
  const result = await listProjects({
    q,
    status: statusParsed.success ? statusParsed.data : undefined,
    delayed,
    page,
  });

  const query = new URLSearchParams();
  if (q) query.set("q", q);
  if (statusParsed.success) query.set("status", statusParsed.data);
  if (delayed) query.set("delayed", "1");

  function pageHref(nextPage: number) {
    const next = new URLSearchParams(query);
    next.set("page", String(nextPage));
    return `/projects?${next.toString()}`;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Proyectos</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Agrupador opcional de RFQ, pedidos y OT. No es un ERP de gestión de
            proyectos. Los registros DEMO no son trabajos reales.
          </p>
        </div>
        {canCreate ? (
          <Link href="/projects/new" className={buttonVariants()}>
            Nuevo proyecto
          </Link>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <KpiCard label="Proyectos activos" value={String(stats.active)} hint="En ejecución" />
        <KpiCard label="Completados" value={String(stats.completed)} hint="Cerrados" />
        <KpiCard label="Retrasados" value={String(stats.delayed)} hint="Activos con fin vencido" />
        <KpiCard label="Pedidos asociados" value={String(stats.linkedOrders)} hint="orders.project_id" />
        <KpiCard label="OT asociadas" value={String(stats.linkedOts)} hint="Vía pedidos del proyecto" />
      </div>

      <ProjectFilters
        q={q}
        status={statusParsed.success ? statusParsed.data : undefined}
        delayed={delayed}
      />

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Responsable</TableHead>
              <TableHead>Fin estimada</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {result.rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-muted-foreground">
                  No hay proyectos con esos filtros.
                </TableCell>
              </TableRow>
            ) : (
              result.rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <Link href={`/projects/${row.id}`} className="font-medium hover:underline">
                      {row.code}
                    </Link>
                    {row.isDemo ? (
                      <Badge variant="outline" className="ml-2">
                        DEMO
                      </Badge>
                    ) : null}
                  </TableCell>
                  <TableCell>{row.name}</TableCell>
                  <TableCell>
                    <Link href={`/customers/${row.customerId}`} className="hover:underline">
                      {row.customerName}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(row.status as ProjectStatus)}>
                      {PROJECT_STATUS_LABELS[row.status as ProjectStatus]}
                    </Badge>
                  </TableCell>
                  <TableCell>{row.ownerName ?? "—"}</TableCell>
                  <TableCell>
                    {row.estimatedEndDate
                      ? row.estimatedEndDate.toLocaleDateString("es-MX")
                      : "—"}
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
