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
import {
  ClipboardList,
  Calendar,
  Layers,
  Wrench,
  Factory,
  FileText,
} from "lucide-react";
import { requirePermission } from "@/lib/auth/session";
import { ORDER_STATUS_LABELS, type OrderStatus } from "@/lib/orders/status";
import { PERMISSION_IDS } from "@/lib/permissions/catalog";
import { RFQ_TYPE_LABELS, type RfqType } from "@/lib/quotes/rfq";
import { displayMoney } from "@/lib/quotes/money";
import { listOrders } from "@/server/services/orders";

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
  const q = Array.isArray(params.q) ? params.q[0] : params.q;
  const status = Array.isArray(params.status) ? params.status[0] : params.status;
  const delayed = (Array.isArray(params.delayed) ? params.delayed[0] : params.delayed) === "1";
  const page = Number(Array.isArray(params.page) ? params.page[0] : params.page) || 1;
  const pageSize = Number(Array.isArray(params.perPage) ? params.perPage[0] : params.perPage) || 20;

  const filtered = Boolean(q || status || delayed);

  const result = await listOrders({
    q: q?.trim() || undefined,
    status: status as OrderStatus | undefined,
    delayed,
    page,
    pageSize,
  });

  const now = new Date();
  const pendingCount = result.rows.filter(
    (r) => r.status === "pendiente" || r.status === "aprobado",
  ).length;
  const inProductionCount = result.rows.filter((r) => r.status === "en_produccion").length;

  function buildQuery(overrides: Record<string, string | undefined>) {
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    if (status) sp.set("status", status);
    if (delayed) sp.set("delayed", "1");
    for (const [key, value] of Object.entries(overrides)) {
      if (value === undefined) sp.delete(key);
      else sp.set(key, value);
    }
    const s = sp.toString();
    return s ? `?${s}` : "";
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Órdenes de Trabajo</h1>
          <p className="text-xs text-muted-foreground">
            {result.total} OT · {pendingCount} pendientes · {inProductionCount} en producción
          </p>
        </div>
        <Link
          href="/quotes"
          className="inline-flex items-center justify-center gap-1 rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-muted"
        >
          <FileText className="h-3 w-3" />
          Cotizaciones
        </Link>
      </div>

      {/* Jerarquía explicativa */}
      <div className="flex items-center gap-2 rounded-md border border-dashed bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
        <FileText className="h-3.5 w-3.5" />
        <span>Cotización</span>
        <span>→</span>
        <ClipboardList className="h-3.5 w-3.5" />
        <span className="font-medium text-foreground">OT (padre)</span>
        <span>→</span>
        <Layers className="h-3.5 w-3.5" />
        <span>Números de Parte (hijos)</span>
        <span>→</span>
        <Factory className="h-3.5 w-3.5" />
        <span>Procesos</span>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2 rounded-md border bg-card p-2">
        <Link
          href={`/orders${buildQuery({ status: undefined, delayed: undefined, page: undefined })}`}
          className={`rounded px-2 py-1 text-xs ${!status && !delayed ? "bg-muted font-medium" : "hover:bg-muted"}`}
        >
          Todas
        </Link>
        <Link
          href={`/orders${buildQuery({ status: "pendiente", page: undefined })}`}
          className={`rounded px-2 py-1 text-xs ${status === "pendiente" ? "bg-muted font-medium" : "hover:bg-muted"}`}
        >
          Pendientes
        </Link>
        <Link
          href={`/orders${buildQuery({ status: "aprobado", page: undefined })}`}
          className={`rounded px-2 py-1 text-xs ${status === "aprobado" ? "bg-muted font-medium" : "hover:bg-muted"}`}
        >
          Aprobadas
        </Link>
        <Link
          href={`/orders${buildQuery({ status: "en_produccion", page: undefined })}`}
          className={`rounded px-2 py-1 text-xs ${status === "en_produccion" ? "bg-muted font-medium" : "hover:bg-muted"}`}
        >
          En Producción
        </Link>
        <Link
          href={`/orders${buildQuery({ status: "completado", page: undefined })}`}
          className={`rounded px-2 py-1 text-xs ${status === "completado" ? "bg-muted font-medium" : "hover:bg-muted"}`}
        >
          Completadas
        </Link>
        <Link
          href={`/orders${buildQuery({ delayed: delayed ? undefined : "1", page: undefined })}`}
          className={`rounded px-2 py-1 text-xs ${delayed ? "bg-red-100 font-medium text-red-700" : "hover:bg-muted"}`}
        >
          Atrasadas
        </Link>
      </div>

      {/* Tabla */}
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>OT</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Números de Parte</TableHead>
              <TableHead>Progreso</TableHead>
              <TableHead>Origen</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Prometida</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {result.rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-12 text-center">
                  <ClipboardList className="mx-auto h-8 w-8 text-muted-foreground" />
                  <p className="mt-2 text-sm text-muted-foreground">
                    {filtered
                      ? "No hay OT con esos filtros"
                      : "Aún no hay Órdenes de Trabajo"}
                  </p>
                  {!filtered && (
                    <Link
                      href="/quotes"
                      className="mt-2 inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground hover:bg-primary/90"
                    >
                      <FileText className="h-3 w-3" />
                      Convertir una cotización
                    </Link>
                  )}
                </TableCell>
              </TableRow>
            ) : (
              result.rows.map((row) => {
                // Progreso de la OT = procesos terminados de TODOS sus números de parte
                const progress =
                  row.opsTotal > 0
                    ? Math.round((row.opsDone / row.opsTotal) * 100)
                    : row.partsTotal > 0
                      ? Math.round((row.partsDone / row.partsTotal) * 100)
                      : 0;
                const isDelayed =
                  row.promisedDate !== null &&
                  new Date(row.promisedDate) < now &&
                  row.status !== "completado" &&
                  row.status !== "cancelado";

                return (
                  <TableRow key={row.id} className={isDelayed ? "bg-red-50/40" : ""}>
                    <TableCell>
                      <Link
                        href={`/orders/${row.id}`}
                        className="font-medium text-blue-600 hover:underline"
                      >
                        {row.workOrderNumber}
                      </Link>
                      {isDelayed && (
                        <span className="ml-2 text-[10px] font-bold uppercase text-red-600">
                          Atrasada
                        </span>
                      )}
                      {row.isDemo && (
                        <Badge variant="outline" className="ml-2 text-[9px]">
                          DEMO
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/customers/${row.customerId}`}
                        className="text-sm hover:underline"
                      >
                        {row.customerName}
                      </Link>
                      <div className="text-xs text-muted-foreground">
                        <Link href={`/quotes/${row.quoteId}`} className="hover:underline">
                          {row.quoteNumber}
                        </Link>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <Layers className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="font-medium">{row.partsTotal}</span>
                        <span className="text-xs text-muted-foreground">
                          {row.partsTotal === 1 ? "parte" : "partes"}
                        </span>
                      </div>
                      {row.partsInProduction > 0 && (
                        <div className="text-[10px] text-amber-600">
                          {row.partsInProduction} en piso
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                            <div
                              className={`h-full transition-all ${progress === 100 ? "bg-green-500" : "bg-blue-500"}`}
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <span className="text-xs font-medium">{progress}%</span>
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          {row.opsTotal > 0
                            ? `${row.opsDone}/${row.opsTotal} procesos`
                            : `${row.partsDone}/${row.partsTotal} partes`}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="gap-1 text-[10px]">
                        {row.requiresEngineering ? (
                          <Wrench className="h-2.5 w-2.5" />
                        ) : (
                          <Factory className="h-2.5 w-2.5" />
                        )}
                        {row.requiresEngineering ? "Ingeniería" : "Fabricación"}
                      </Badge>
                      <div className="text-[10px] text-muted-foreground">
                        {RFQ_TYPE_LABELS[row.rfqType as RfqType]}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(row.status as OrderStatus)}>
                        {ORDER_STATUS_LABELS[row.status as OrderStatus]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">
                      {row.promisedDate ? (
                        <span
                          className={`flex items-center gap-1 ${isDelayed ? "font-medium text-red-600" : ""}`}
                        >
                          <Calendar className="h-3 w-3" />
                          {new Date(row.promisedDate).toLocaleDateString("es-MX")}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {displayMoney(row.total, row.currency)}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Paginación */}
      {result.pageCount > 1 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {result.total} OT · Página {page} de {result.pageCount}
          </span>
          <div className="flex gap-1">
            {page > 1 && (
              <Link
                href={`/orders${buildQuery({ page: String(page - 1) })}`}
                className="rounded-md border px-2 py-1 hover:bg-muted"
              >
                Anterior
              </Link>
            )}
            {page < result.pageCount && (
              <Link
                href={`/orders${buildQuery({ page: String(page + 1) })}`}
                className="rounded-md border px-2 py-1 hover:bg-muted"
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
