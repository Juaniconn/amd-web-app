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
import { Plus, FileText, Calendar } from "lucide-react";
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

  const result = await listQuotes({
    q: q?.trim() || undefined,
    status: status as any,
    page,
    pageSize,
  });

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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Cotizaciones</h1>
          <p className="text-xs text-muted-foreground">
            {result.total} cotizaciones · {result.rows.filter((r) => r.status === "enviada").length} enviadas
          </p>
        </div>
        {canWrite && (
          <Link href="/quotes/new" className="inline-flex items-center justify-center gap-1 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            <Plus className="h-3 w-3" />
            Nueva Cotización
          </Link>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 rounded-md border bg-card p-2">
        {FILTERS.map((f) => (
          <Link
            key={f.label}
            href={filterHref(f.value)}
            className={`rounded px-2 py-1 text-xs ${
              status === f.value || (!status && !f.value)
                ? "bg-muted font-medium"
                : "hover:bg-muted"
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
                <TableCell colSpan={6} className="py-12 text-center">
                  <FileText className="mx-auto h-8 w-8 text-muted-foreground" />
                  <p className="mt-2 text-sm text-muted-foreground">
                    {q ? "No se encontraron resultados" : "Aún no hay cotizaciones"}
                  </p>
                  {!q && canWrite && (
                    <Link href="/quotes/new" className="mt-2 inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground hover:bg-primary/90">
                      <Plus className="h-3 w-3" />
                      Crear primera cotización
                    </Link>
                  )}
                </TableCell>
              </TableRow>
            ) : (
              result.rows.map((quote) => (
                <TableRow key={quote.id}>
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
                    <Badge variant={statusVariant(quote.status as QuoteStatus)}>
                      {QUOTE_STATUS_LABELS[quote.status as QuoteStatus]}
                    </Badge>
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
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {result.pageCount > 1 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{result.total} resultados · Página {page} de {result.pageCount}</span>
        </div>
      )}
    </div>
  );
}
