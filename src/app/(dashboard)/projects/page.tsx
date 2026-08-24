import Link from "next/link";
import { ProjectFilters } from "@/features/projects/project-filters";
import { EmptyState, StatCard, StatRow } from "@/components/shared/ui-patterns";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
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
import { listProjects } from "@/server/services/projects";
import { parsePage, parsePageSize } from "@/lib/ui/pagination";
import { FolderOpen, CheckCircle, Pause, XCircle, Clock } from "lucide-react";

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function statusVariant(status: ProjectStatus) {
  if (status === "cancelado") return "destructive" as const;
  if (status === "completado") return "default" as const;
  if (status === "planeacion" || status === "pausado") return "outline" as const;
  return "secondary" as const;
}

function statusTone(status: ProjectStatus) {
  if (status === "completado") return "emerald";
  if (status === "activo") return "blue";
  if (status === "pausado") return "amber";
  if (status === "cancelado") return "red";
  return "gray";
}

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string | string[];
    status?: string | string[];
    delayed?: string | string[];
    page?: string | string[];
    perPage?: string | string[];
  }>;
}) {
  const { access } = await requirePermission(PERMISSION_IDS.projectsView);
  const params = await searchParams;
  const q = first(params.q)?.trim() || undefined;
  const statusParsed = projectStatusSchema.safeParse(first(params.status));
  const delayed = first(params.delayed) === "1";
  const page = parsePage(first(params.page));
  const pageSize = parsePageSize(first(params.perPage));
  const canCreate = access.permissions.includes(PERMISSION_IDS.projectsCreate);
  const filtered = Boolean(q || statusParsed.success || delayed);
  const result = await listProjects({
    q,
    status: statusParsed.success ? statusParsed.data : undefined,
    delayed,
    page,
    pageSize,
  });

  // KPIs sobre la página actual (datos reales visibles)
  const activos = result.rows.filter((r) => r.status === "activo").length;
  const completados = result.rows.filter((r) => r.status === "completado").length;
  const pausados = result.rows.filter((r) => r.status === "pausado").length;
  const cancelados = result.rows.filter((r) => r.status === "cancelado").length;

  const query = new URLSearchParams();
  if (q) query.set("q", q);
  if (statusParsed.success) query.set("status", statusParsed.data);
  if (delayed) query.set("delayed", "1");
  query.set("perPage", String(pageSize));

  return (
    <div className="space-y-4">
      <PageHeader
        title="Proyectos"
        description="Agrupador opcional de RFQ y órdenes de trabajo. No sustituye la OT."
        actions={
          canCreate ? (
            <Link href="/projects/new" className={buttonVariants({ size: "sm" })}>
              Nuevo proyecto
            </Link>
          ) : null
        }
      />

      <StatRow>
        <StatCard label="En esta vista" value={result.rows.length} icon={<FolderOpen className="h-4 w-4" />} />
        <StatCard label="Activos" value={activos} tone="blue" icon={<CheckCircle className="h-4 w-4" />} />
        <StatCard label="Pausados" value={pausados} tone="amber" icon={<Pause className="h-4 w-4" />} />
        <StatCard label="Completados" value={completados} tone="green" icon={<CheckCircle className="h-4 w-4" />} />
      </StatRow>

      <ProjectFilters
        q={q}
        status={statusParsed.success ? statusParsed.data : undefined}
        delayed={delayed}
        perPage={pageSize}
      />

      <div className="rounded-lg border bg-card">
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
                <TableCell colSpan={6} className="py-8">
                  <EmptyState
                    icon={<FolderOpen className="h-8 w-8" />}
                    title={filtered ? "Sin resultados" : "Aún no hay proyectos"}
                    description={
                      filtered
                        ? "Prueba otro estado o limpia los filtros."
                        : "Crea un proyecto solo si varias RFQ u órdenes de trabajo van juntas."
                    }
                    action={
                      !filtered && canCreate ? (
                        <Link href="/projects/new" className={buttonVariants({ size: "sm" })}>
                          Nuevo proyecto
                        </Link>
                      ) : null
                    }
                  />
                </TableCell>
              </TableRow>
            ) : (
              result.rows.map((row) => {
                const tone = statusTone(row.status as ProjectStatus);
                return (
                  <TableRow key={row.id} className="hover:bg-muted/40">
                    <TableCell>
                      <Link href={`/projects/${row.id}`} className="font-medium hover:underline">
                        {row.code}
                      </Link>
                      {row.isDemo ? (
                        <Badge variant="outline" className="ml-2 text-[10px]">
                          DEMO
                        </Badge>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-sm">{row.name}</TableCell>
                    <TableCell>
                      <Link href={`/customers/${row.customerId}`} className="hover:underline text-sm">
                        {row.customerName}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1.5 text-xs">
                        <span
                          className={`h-2 w-2 rounded-full ${
                            tone === "emerald"
                              ? "bg-emerald-500"
                              : tone === "blue"
                                ? "bg-blue-500"
                                : tone === "amber"
                                  ? "bg-amber-500"
                                  : tone === "red"
                                    ? "bg-red-500"
                                    : "bg-gray-400"
                          }`}
                        />
                        <Badge variant={statusVariant(row.status as ProjectStatus)}>
                          {PROJECT_STATUS_LABELS[row.status as ProjectStatus]}
                        </Badge>
                      </span>
                    </TableCell>
                    <TableCell className="text-sm">{row.ownerName ?? "—"}</TableCell>
                    <TableCell className="text-xs">
                      {row.estimatedEndDate ? (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          {row.estimatedEndDate.toLocaleDateString("es-MX")}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {result.pageCount > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
          <p>
            {result.total} {result.total === 1 ? "proyecto" : "proyectos"} · página {page} de {result.pageCount}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {page > 1 && (
              <Link
                href={`/projects?${query.toString()}&page=${page - 1}`}
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                Anterior
              </Link>
            )}
            {page < result.pageCount && (
              <Link
                href={`/projects?${query.toString()}&page=${page + 1}`}
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                Siguiente
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}