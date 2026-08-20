import Link from "next/link";
import { OrderFilters } from "@/features/orders/order-filters";
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
import { ORDER_STATUS_LABELS, type OrderStatus } from "@/lib/orders/status";
import { PERMISSION_IDS } from "@/lib/permissions/catalog";
import { RFQ_TYPE_LABELS, type RfqType } from "@/lib/quotes/rfq";
import { displayMoney } from "@/lib/quotes/money";
import { orderStatusSchema } from "@/lib/validation/orders";
import { listOrders } from "@/server/services/orders";
import { parsePage, parsePageSize } from "@/lib/ui/pagination";

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function statusVariant(status: OrderStatus) {
  if (status === "cancelado") return "destructive" as const;
  if (status === "completado") return "default" as const;
  if (status === "pendiente" || status === "borrador") return "outline" as const;
  return "secondary" as const;
}

export default async function OrdersPage({
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
  await requirePermission(PERMISSION_IDS.ordersView);
  const params = await searchParams;
  const q = first(params.q)?.trim() || undefined;
  const statusParsed = orderStatusSchema.safeParse(first(params.status));
  const delayed = first(params.delayed) === "1";
  const page = parsePage(first(params.page));
  const pageSize = parsePageSize(first(params.perPage));
  const filtered = Boolean(q || statusParsed.success || delayed);
  const result = await listOrders({
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
        title="Órdenes de Trabajo"
        description="Cada OT nace al convertir una cotización. La cantidad de planos es el número de partidas de fabricación."
        actions={
          <Link href="/quotes" className={buttonVariants({ variant: "outline" })}>
            Cotizaciones
          </Link>
        }
      />

      <OrderFilters
        q={q}
        status={statusParsed.success ? statusParsed.data : undefined}
        delayed={delayed}
        perPage={pageSize}
      />

      <TableCard>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Cantidad de Planos</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>RFQ</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Prometida</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {result.rows.length === 0 ? (
              <EmptyTable
                colSpan={7}
                title={
                  filtered
                    ? "No hay órdenes de trabajo con esos filtros."
                    : "Aún no hay órdenes de trabajo."
                }
                description={
                  filtered
                    ? "Prueba otro estado o limpia los filtros."
                    : "Convierte una cotización aprobada para crear la primera OT."
                }
                href={!filtered ? "/quotes" : undefined}
                actionLabel="Ver cotizaciones"
              />
            ) : (
              result.rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <Link href={`/orders/${row.id}`} className="font-medium hover:underline">
                      {row.workOrderNumber}
                    </Link>
                    {row.isDemo ? (
                      <Badge variant="outline" className="ml-2">
                        DEMO
                      </Badge>
                    ) : null}
                  </TableCell>
                  <TableCell className="font-medium">{row.drawingCount}</TableCell>
                  <TableCell>
                    <Link href={`/customers/${row.customerId}`} className="hover:underline">
                      {row.customerName}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Link href={`/quotes/${row.quoteId}`} className="hover:underline">
                      {row.quoteNumber}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {RFQ_TYPE_LABELS[row.rfqType as RfqType]}
                    </p>
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(row.status as OrderStatus)}>
                      {ORDER_STATUS_LABELS[row.status as OrderStatus]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {row.promisedDate
                      ? row.promisedDate.toLocaleDateString("es-MX")
                      : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    {displayMoney(row.total, row.currency)}
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
        label={result.total === 1 ? "orden de trabajo" : "órdenes de trabajo"}
        path="/orders"
        query={query}
        pageSize={pageSize}
      />
    </div>
  );
}
