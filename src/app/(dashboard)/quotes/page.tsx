import Link from "next/link";
import { QuoteFilters } from "@/features/quotes/quote-filters";
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
import {
  QUOTE_ENGINEERING_STATUS_LABELS,
  RFQ_TYPE_LABELS,
  type QuoteEngineeringStatus,
  type RfqType,
} from "@/lib/quotes/rfq";
import { QUOTE_STATUS_LABELS, type QuoteStatus } from "@/lib/quotes/status";
import { displayMoney } from "@/lib/quotes/money";
import {
  quoteEngineeringStatusSchema,
  quoteStatusSchema,
  rfqTypeSchema,
} from "@/lib/validation/quotes";
import { listQuotes } from "@/server/services/quotes";
import { parsePage, parsePageSize } from "@/lib/ui/pagination";

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
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
    perPage?: string | string[];
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
  const page = parsePage(first(params.page));
  const pageSize = parsePageSize(first(params.perPage));
  const canWrite = access.permissions.includes(PERMISSION_IDS.quotesWrite);
  const filtered = Boolean(
    q || statusParsed.success || rfqTypeParsed.success || engineeringParsed.success,
  );

  const result = await listQuotes({
    q,
    status: statusParsed.success ? statusParsed.data : undefined,
    rfqType: rfqTypeParsed.success ? rfqTypeParsed.data : undefined,
    engineeringStatus: engineeringParsed.success ? engineeringParsed.data : undefined,
    page,
    pageSize,
  });

  const query = new URLSearchParams();
  if (q) query.set("q", q);
  if (statusParsed.success) query.set("status", statusParsed.data);
  if (rfqTypeParsed.success) query.set("rfqType", rfqTypeParsed.data);
  if (engineeringParsed.success) {
    query.set("engineeringStatus", engineeringParsed.data);
  }
  query.set("perPage", String(pageSize));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cotizaciones"
        description="RFQ y cotizaciones. Al aprobarse se convierten en orden de trabajo."
        actions={
          canWrite ? (
            <Link href="/quotes/new" className={buttonVariants()}>
              Nueva cotización
            </Link>
          ) : null
        }
      />

      <QuoteFilters
        q={q}
        status={statusParsed.success ? statusParsed.data : undefined}
        rfqType={rfqTypeParsed.success ? rfqTypeParsed.data : undefined}
        engineeringStatus={engineeringParsed.success ? engineeringParsed.data : undefined}
        perPage={pageSize}
      />

      <TableCard>
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
            </TableRow>
          </TableHeader>
          <TableBody>
            {result.rows.length === 0 ? (
              <EmptyTable
                colSpan={7}
                title={
                  filtered ? "No hay cotizaciones con esos filtros." : "Aún no hay cotizaciones."
                }
                description={
                  filtered
                    ? "Prueba otro estado o limpia los filtros."
                    : "Crea una RFQ desde un cliente para empezar a cotizar."
                }
                href={!filtered && canWrite ? "/quotes/new" : undefined}
                actionLabel="Nueva cotización"
              />
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
                  <TableCell>{RFQ_TYPE_LABELS[row.rfqType as RfqType]}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(row.status)}>{QUOTE_STATUS_LABELS[row.status]}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={row.requiresEngineering ? "secondary" : "outline"}>
                      {QUOTE_ENGINEERING_STATUS_LABELS[row.engineeringStatus as QuoteEngineeringStatus]}
                    </Badge>
                  </TableCell>
                  <TableCell>{row.issueDate.toLocaleDateString("es-MX")}</TableCell>
                  <TableCell className="text-right">{displayMoney(row.total, row.currency)}</TableCell>
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
        label={result.total === 1 ? "cotización" : "cotizaciones"}
        path="/quotes"
        query={query}
        pageSize={pageSize}
      />
    </div>
  );
}
