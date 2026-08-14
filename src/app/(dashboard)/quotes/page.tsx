import Link from "next/link";
import { QuoteFilters } from "@/features/quotes/quote-filters";
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
import { QUOTE_STATUS_LABELS, type QuoteStatus } from "@/lib/quotes/status";
import { quoteStatusSchema } from "@/lib/validation/quotes";
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
    page?: string | string[];
  }>;
}) {
  const { access } = await requirePermission(PERMISSION_IDS.quotesRead);
  const params = await searchParams;
  const q = first(params.q)?.trim() || undefined;
  const statusParsed = quoteStatusSchema.safeParse(first(params.status));
  const page = Number(first(params.page) ?? "1") || 1;
  const canWrite = access.permissions.includes(PERMISSION_IDS.quotesWrite);

  const result = await listQuotes({
    q,
    status: statusParsed.success ? statusParsed.data : undefined,
    page,
  });

  const query = new URLSearchParams();
  if (q) query.set("q", q);
  if (statusParsed.success) query.set("status", statusParsed.data);

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

      <QuoteFilters q={q} status={statusParsed.success ? statusParsed.data : undefined} />

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Número</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Margen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {result.rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-muted-foreground">
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
                    <Badge variant={statusVariant(row.status)}>{QUOTE_STATUS_LABELS[row.status]}</Badge>
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
