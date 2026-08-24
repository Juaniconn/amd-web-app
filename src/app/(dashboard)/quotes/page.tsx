import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState, StatCard, StatRow } from "@/components/shared/ui-patterns";
import { PageHeader } from "@/components/layout/page-header";
import { Plus, FileText, Calendar, CheckCircle, Clock, XCircle } from "lucide-react";
import { requirePermission } from "@/lib/auth/session";
import { PERMISSION_IDS } from "@/lib/permissions/catalog";
import { RFQ_TYPE_LABELS } from "@/lib/quotes/rfq";
import { QUOTE_STATUS_LABELS, type QuoteStatus } from "@/lib/quotes/status";
import { displayMoney } from "@/lib/quotes/money";
import { listQuotes } from "@/server/services/quotes";

function statusVariant(status: QuoteStatus) {
  if (status === "rechazada" || status === "expirada") return "destructive" as const;
  if (status === "borrador") return "outline" as const;
  if (status === "aprobada" || status === "convertida") return "default" as const;
  return "secondary" as const;
}

function statusTone(status: QuoteStatus) {
  if (status === "aprobada" || status === "convertida") return "emerald";
  if (status === "enviada" || status === "en_revision") return "amber";
  if (status === "rechazada" || status === "expirada") return "red";
  return "gray";
}

export default async function QuotesPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string | string[];
    status?: string | string[];
    page?: string | string[];
    perPage?: string | string[];
  }>;
}) {
  const { access } = await requirePermission(PERMISSION_IDS.quotesRead);
  const params = await searchParams;
  const q = Array.isArray(params.q) ? params.q[0] : params.q;
  const status = Array.isArray(params.status) ? params.status[0] : params.status;
  const page = Number(Array.isArray(params.page) ? params.page[0] : params.page) || 1;
  const pageSize = Number(Array.isArray(params.perPage) ? params.perPage[0] : params.perPage) || 20;

  const canWrite = access.permissions.includes(PERMISSION_IDS.quotesWrite);
  const filtered = Boolean(q || status);

  const result = await listQuotes({
    q: q?.trim() || undefined,
    status: status as any,
    page,
    pageSize,
  });

  // KPIs sobre la página actual (datos reales visibles)
  const enviadas = result.rows.filter((r) => r.status === "enviada").length;
  const aprobadas = result.rows.filter((r) => r.status === "aprobada" || r.status === "convertida").length;
  const borradores = result.rows.filter((r) => r.status === "borrador" || r.status === "en_revision").length;
  const rechazadas = result.rows.filter((r) => r.status === "rechazada" || r.status === "expirada").length;

  function filterHref(nextStatus?: string) {
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    if (nextStatus) sp.set("status", nextStatus);
    const s = sp.toString();
    return s ? `/quotes?${s}` : "/quotes";
  }

  const FILTERS = [
    { label: "Todas", value: undefined },
    { label: "Borrador", value: "borrador" },
    { label: "Enviadas", value: "enviada" },
    { label: "Aprobadas", value: "aprobada" },
    { label: "Convertidas", value: "convertida" },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Cotizaciones"
        description="Cotizaciones generadas para clientes de las tres sucursales."
        actions={
          canWrite ? (
            <Link href="/quotes/new" className={buttonVariants({ size: "sm" })}>
              <Plus className="mr-1 h-3.5 w-3.5" />
              Nueva Cotización
            </Link>
          ) : null
        }
      />

      <StatRow>
        <StatCard label="En esta vista" value={result.rows.length} icon={<FileText className="h-4 w-4" />} />
        <StatCard label="Enviadas" value={enviadas} tone="amber" icon={<Clock className="h-4 w-4" />} />
        <StatCard label="Aprobadas" value={aprobadas} tone="green" icon={<CheckCircle className="h-4 w-4" />} />
        <StatCard label="Rechazadas/Expiradas" value={rechazadas} tone="red" icon={<XCircle className="h-4 w-4" />} />
      </StatRow>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-card p-2">
        {FILTERS.map((f) => (
          <Link
            key={f.label}
            href={filterHref(f.value)}
            className={`rounded-md px-2.5 py-1 text-xs transition-colors ${
              status === f.value || (!status && !f.value)
                ? "bg-primary/10 font-medium text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cotización</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Vigencia</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {result.rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-8">
                  <EmptyState
                    icon={<FileText className="h-8 w-8" />}
                    title={filtered ? "Sin resultados" : "Aún no hay cotizaciones"}
                    description={
                      filtered
                        ? "Ajusta los filtros o la búsqueda para encontrar la cotización."
                        : "Crea tu primera cotización para empezar."
                    }
                    action={
                      !filtered && canWrite ? (
                        <Link href="/quotes/new" className={buttonVariants({ size: "sm" })}>
                          <Plus className="mr-1 h-3.5 w-3.5" />
                          Crear primera cotización
                        </Link>
                      ) : null
                    }
                  />
                </TableCell>
              </TableRow>
            ) : (
              result.rows.map((quote) => {
                const tone = statusTone(quote.status as QuoteStatus);
                return (
                  <TableRow key={quote.id} className="hover:bg-muted/40">
                    <TableCell>
                      <Link href={`/quotes/${quote.id}`} className="font-medium hover:underline">
                        {quote.number}
                      </Link>
                      <div className="text-xs text-muted-foreground">
                        {1} partes
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-xs">
                          {quote.customerName.charAt(0)}
                        </div>
                        <span className="text-sm">{quote.customerName}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">
                        {displayMoney(quote.total, quote.currency)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1.5 text-xs">
                        <span
                          className={`h-2 w-2 rounded-full ${
                            tone === "emerald"
                              ? "bg-emerald-500"
                              : tone === "amber"
                                ? "bg-amber-500"
                                : tone === "red"
                                  ? "bg-red-500"
                                  : "bg-gray-400"
                          }`}
                        />
                        <Badge variant={statusVariant(quote.status as QuoteStatus)}>
                          {QUOTE_STATUS_LABELS[quote.status as QuoteStatus]}
                        </Badge>
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">
                        {RFQ_TYPE_LABELS[quote.rfqType as keyof typeof RFQ_TYPE_LABELS]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">
                      {quote.validUntil ? (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          {new Date(quote.validUntil).toLocaleDateString("es-MX")}
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

      {/* Pagination */}
      {result.pageCount > 1 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{result.total} resultados · Página {page} de {result.pageCount}</span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={`/quotes?page=${page - 1}${q ? `&q=${q}` : ""}${status ? `&status=${status}` : ""}`}
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                Anterior
              </Link>
            )}
            {page < result.pageCount && (
              <Link
                href={`/quotes?page=${page + 1}${q ? `&q=${q}` : ""}${status ? `&status=${status}` : ""}`}
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