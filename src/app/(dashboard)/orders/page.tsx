import Link from "next/link";
import { OrderFilters } from "@/features/orders/order-filters";
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
import { ORDER_ORIGIN_LABELS, ORDER_STATUS_LABELS, type OrderStatus } from "@/lib/orders/status";
import { PERMISSION_IDS } from "@/lib/permissions/catalog";
import { RFQ_TYPE_LABELS, type RfqType } from "@/lib/quotes/rfq";
import { orderStatusSchema } from "@/lib/validation/orders";
import { getOrderDashboardStats } from "@/server/services/orders-kpis";
import { listOrders } from "@/server/services/orders";

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function money(value: string, currency: string) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(Number(value));
}

function statusVariant(status: OrderStatus) {
  if (status === "cancelado") return "destructive" as const;
  if (status === "completado") return "default" as const;
  if (status === "borrador" || status === "pendiente") return "outline" as const;
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
  }>;
}) {
  await requirePermission(PERMISSION_IDS.ordersView);
  const params = await searchParams;
  const q = first(params.q)?.trim() || undefined;
  const statusParsed = orderStatusSchema.safeParse(first(params.status));
  const delayed = first(params.delayed) === "1";
  const page = Number(first(params.page) ?? "1") || 1;
  const stats = await getOrderDashboardStats();
  const result = await listOrders({
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
    return `/orders?${next.toString()}`;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Pedidos</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Documento comercial firme. Nace al convertir una RFQ. Ancla toda OT.
          Los registros DEMO no son ventas reales.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <KpiCard label="Pedidos activos" value={String(stats.active)} hint="No completados ni cancelados" />
        <KpiCard label="Pedidos aprobados" value={String(stats.approved)} hint="Listos para OT" />
        <KpiCard label="En producción" value={String(stats.inProduction)} hint="Con piso abierto" />
        <KpiCard label="Completados" value={String(stats.completed)} hint="Cierre comercial" />
        <KpiCard label="Retrasados" value={String(stats.delayed)} hint="Fecha prometida vencida" />
      </div>

      <OrderFilters
        q={q}
        status={statusParsed.success ? statusParsed.data : undefined}
        delayed={delayed}
      />

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Pedido</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>RFQ</TableHead>
              <TableHead>Origen</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Prometida</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {result.rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-muted-foreground">
                  No hay pedidos con esos filtros.
                </TableCell>
              </TableRow>
            ) : (
              result.rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <Link href={`/orders/${row.id}`} className="font-medium hover:underline">
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
                    <p className="text-xs text-muted-foreground">
                      {RFQ_TYPE_LABELS[row.rfqType as RfqType]}
                    </p>
                  </TableCell>
                  <TableCell>
                    {ORDER_ORIGIN_LABELS[row.origin as keyof typeof ORDER_ORIGIN_LABELS]}
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
                    {money(row.total, row.currency)}
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
