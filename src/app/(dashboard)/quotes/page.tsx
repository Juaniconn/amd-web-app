import Link from "next/link";
import { QuoteFilters } from "@/features/quotes/quote-filters";
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
import {
  QUOTE_ENGINEERING_STATUS_LABELS,
  RFQ_TYPE_LABELS,
  type QuoteEngineeringStatus,
  type RfqType,
} from "@/lib/quotes/rfq";
import { QUOTE_STATUS_LABELS, type QuoteStatus } from "@/lib/quotes/status";
import {
  quoteEngineeringStatusSchema,
  quoteStatusSchema,
  rfqTypeSchema,
} from "@/lib/validation/quotes";
import { getQuoteEngineeringStats } from "@/server/services/engineering";
import { listQuotes } from "@/server/services/quotes";

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function money(value: string, currency: string) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(Number(value));
}

function statusVariant(status: QuoteStatus) {
  if (status === "rechazada" || status === "expirada") return "destructive" as const;
  if (status === "borrador") return "outline" as const;
  return "secondary" as const;
}

export default async function QuotesPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string | string[];
    status?: string | string[];
    rfqType?: string | string[];
    engineeringStatus?: string | string[];
    page?: string | string[];
  }>;
}) {
  const { access } = await requirePermission(PERMISSION_IDS.quotesRead);
  const params = await searchParams;
  const q = first(params.q)?.trim() || undefined;
  const statusParsed = quoteStatusSchema.safeParse(first(params.status));
  const rfqTypeParsed = rfqTypeSchema.safeParse(first(params.rfqType));
  const engineeringParsed = quoteEngineeringStatusSchema.safeParse(
    first(params.engineeringStatus),
  );
  const page = Number(first(params.page) ?? "1") || 1;
  const canWrite = access.permissions.includes(PERMISSION_IDS.quotesWrite);
  const stats = await getQuoteEngineeringStats();

  const result = await listQuotes({
    q,
    status: statusParsed.success ? statusParsed.data : undefined,
    rfqType: rfqTypeParsed.success ? rfqTypeParsed.data : undefined,
    engineeringStatus: engineeringParsed.success ? engineeringParsed.data : undefined,
    page,
  });

  const query = new URLSearchParams();
  if (q) query.set("q", q);
  if (statusParsed.success) query.set("status", statusParsed.data);
  if (rfqTypeParsed.success) query.set("rfqType", rfqTypeParsed.data);
  if (engineeringParsed.success) {
    query.set("engineeringStatus", engineeringParsed.data);
  }

  function pageHref(nextPage: number) {
    const next = new URLSearchParams(query);
    next.set("page", String(nextPage));
    return `/quotes?${next.toString()}`;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Cotizaciones</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            RFQ y cotizaciones de AMD Operations. Los registros DEMO no son ventas reales.
          </p>
        </div>
        {canWrite ? (
          <Link href="/quotes/new" className={buttonVariants()}>
            Nueva cotización
          </Link>
        ) : null}
      </div>

      <QuoteFilters
        q={q}
        status={statusParsed.success ? statusParsed.data : undefined}
        rfqType={rfqTypeParsed.success ? rfqTypeParsed.data : undefined}
        engineeringStatus={engineeringParsed.success ? engineeringParsed.data : undefined}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Requieren ingeniería"
          value={String(stats.requiringEngineering)}
          hint="RFQ con diseño o validación"
        />
        <KpiCard
          label="Ingeniería pendiente"
          value={String(stats.engineeringPending)}
          hint="Solicitud aún no asignada"
        />
        <KpiCard
          label="Ingeniería en proceso"
          value={String(stats.engineeringInProcess)}
          hint="Diseño o revisión en curso"
        />
        <KpiCard
          label="Ingeniería liberada"
          value={String(stats.engineeringReleased)}
          hint="Listas para cotización final / pedido"
        />
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Número</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Tipo RFQ</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Ingeniería</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Margen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {result.rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-muted-foreground">
                  No hay cotizaciones con esos filtros.
                </TableCell>
              </TableRow>
            ) : (
              result.rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <Link href={`/quotes/${row.id}`} className="font-medium hover:underline">
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
                    {RFQ_TYPE_LABELS[row.rfqType as RfqType]}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(row.status)}>{QUOTE_STATUS_LABELS[row.status]}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={row.requiresEngineering ? "secondary" : "outline"}>
                      {QUOTE_ENGINEERING_STATUS_LABELS[row.engineeringStatus as QuoteEngineeringStatus]}
                    </Badge>
                  </TableCell>
                  <TableCell>{row.issueDate.toLocaleDateString("es-MX")}</TableCell>
                  <TableCell className="text-right">{money(row.total, row.currency)}</TableCell>
                  <TableCell className="text-right">
                    {row.marginPercent ? `${row.marginPercent}%` : "—"}
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
