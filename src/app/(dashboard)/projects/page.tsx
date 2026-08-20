import Link from "next/link";
import { ProjectFilters } from "@/features/projects/project-filters";
import { EmptyTable, TableCard, TablePager } from "@/components/layout/data-table";
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

  const query = new URLSearchParams();
  if (q) query.set("q", q);
  if (statusParsed.success) query.set("status", statusParsed.data);
  if (delayed) query.set("delayed", "1");
  query.set("perPage", String(pageSize));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Proyectos"
        description="Agrupador opcional de RFQ y órdenes de trabajo. No sustituye la OT."
        actions={
          canCreate ? (
            <Link href="/projects/new" className={buttonVariants()}>
              Nuevo proyecto
            </Link>
          ) : null
        }
      />

      <ProjectFilters
        q={q}
        status={statusParsed.success ? statusParsed.data : undefined}
        delayed={delayed}
        perPage={pageSize}
      />

      <TableCard>
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
              <EmptyTable
                colSpan={6}
                title={filtered ? "No hay proyectos con esos filtros." : "Aún no hay proyectos."}
                description={
                  filtered
                    ? "Prueba otro estado o limpia los filtros."
                    : "Crea un proyecto solo si varias RFQ u órdenes de trabajo van juntas."
                }
                href={!filtered && canCreate ? "/projects/new" : undefined}
                actionLabel="Nuevo proyecto"
              />
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
      </TableCard>

      <TablePager
        total={result.total}
        page={result.page}
        pageCount={result.pageCount}
        label={result.total === 1 ? "proyecto" : "proyectos"}
        path="/projects"
        query={query}
        pageSize={pageSize}
      />
    </div>
  );
}
