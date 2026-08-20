import Link from "next/link";
import { EngineeringFilters } from "@/features/engineering/engineering-filters";
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
import {
  ENGINEERING_PRIORITY_LABELS,
  ENGINEERING_STATUS_LABELS,
  type EngineeringStatus,
} from "@/lib/engineering/status";
import { PERMISSION_IDS } from "@/lib/permissions/catalog";
import { QUOTE_ENGINEERING_TYPE_LABELS, type QuoteEngineeringType } from "@/lib/quotes/rfq";
import { engineeringStatusSchema } from "@/lib/validation/engineering";
import { listEngineeringRequests } from "@/server/services/engineering";
import { parsePage, parsePageSize } from "@/lib/ui/pagination";

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
    perPage?: string | string[];
  }>;
}) {
  const { access } = await requirePermission(PERMISSION_IDS.engineeringRead);
  const params = await searchParams;
  const q = first(params.q)?.trim() || undefined;
  const statusParsed = engineeringStatusSchema.safeParse(first(params.status));
  const overdue = first(params.overdue) === "1";
  const page = parsePage(first(params.page));
  const pageSize = parsePageSize(first(params.perPage));
  const canCreate = access.permissions.includes(PERMISSION_IDS.engineeringCreate);
  const filtered = Boolean(q || statusParsed.success || overdue);
  const result = await listEngineeringRequests({
    q,
    status: statusParsed.success ? statusParsed.data : undefined,
    overdue,
    page,
    pageSize,
  });

  const query = new URLSearchParams();
  if (q) query.set("q", q);
  if (statusParsed.success) query.set("status", statusParsed.data);
  if (overdue) query.set("overdue", "1");
  query.set("perPage", String(pageSize));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ingeniería y diseño"
        description="CAD, revisión, aprobación del cliente y liberación para cotizar o fabricar."
        actions={
          canCreate ? (
            <Link href="/engineering/new" className={buttonVariants()}>
              Nueva solicitud
            </Link>
          ) : null
        }
      />

      <EngineeringFilters
        q={q}
        status={statusParsed.success ? statusParsed.data : undefined}
        overdue={overdue}
        perPage={pageSize}
      />

      <TableCard>
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
              <EmptyTable
                colSpan={8}
                title={
                  filtered ? "No hay solicitudes con esos filtros." : "Aún no hay solicitudes."
                }
                description={
                  filtered
                    ? "Prueba otro estado o limpia los filtros."
                    : "Las RFQ de diseño abren una solicitud aquí."
                }
                href={!filtered && canCreate ? "/engineering/new" : undefined}
                actionLabel="Nueva solicitud"
              />
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
                  <TableCell>{ENGINEERING_PRIORITY_LABELS[row.priority]}</TableCell>
                  <TableCell>{row.assigneeName ?? "—"}</TableCell>
                  <TableCell>
                    {row.dueDate ? row.dueDate.toLocaleDateString("es-MX") : "—"}
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
        label={result.total === 1 ? "solicitud" : "solicitudes"}
        path="/engineering"
        query={query}
        pageSize={pageSize}
      />
    </div>
  );
}
