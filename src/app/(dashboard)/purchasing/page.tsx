import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { EmptyTable, TableCard, TablePager } from "@/components/layout/data-table";
import { ListSearchForm } from "@/components/layout/list-search-form";
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
  PURCHASE_ORDER_STATUS_LABELS,
  PURCHASE_REQUEST_STATUS_LABELS,
  type PurchaseOrderStatus,
  type PurchaseRequestStatus,
} from "@/lib/purchasing/catalog";
import { displayMoney } from "@/lib/quotes/money";
import { firstSearchParam, parsePage, parsePageSize } from "@/lib/ui/pagination";
import { listPurchaseOrders, listPurchaseRequests } from "@/server/services/purchasing";

export default async function PurchasingPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string | string[];
    page?: string | string[];
    perPage?: string | string[];
  }>;
}) {
  const { access } = await requirePermission(PERMISSION_IDS.purchasingRead);
  const canWrite = access.permissions.includes(PERMISSION_IDS.purchasingWrite);
  const params = await searchParams;
  const q = firstSearchParam(params.q)?.trim() || undefined;
  const page = parsePage(firstSearchParam(params.page));
  const pageSize = parsePageSize(firstSearchParam(params.perPage));
  const [result, requests] = await Promise.all([
    listPurchaseOrders({ q, page, pageSize }),
    listPurchaseRequests({ q, page: 1, pageSize: 10 }),
  ]);
  const query = new URLSearchParams();
  if (q) query.set("q", q);
  query.set("perPage", String(pageSize));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Compras</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Solicitudes de material desde la OT y órdenes de compra. La recepción
            incrementa inventario.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/suppliers" className={buttonVariants({ variant: "outline" })}>
            Proveedores
          </Link>
          {canWrite ? (
            <Link href="/purchasing/new" className={buttonVariants()}>
              Nueva OC
            </Link>
          ) : null}
        </div>
      </div>
      <ListSearchForm
        action="/purchasing"
        q={q}
        perPage={pageSize}
        placeholder="OC, SR, proveedor o código"
      />

      {requests.rows.length > 0 ? (
        <TableCard>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Solicitud</TableHead>
                <TableHead>Orden de trabajo</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <Link
                      href={`/purchasing/requests/${row.id}`}
                      className="font-medium hover:underline"
                    >
                      {row.number}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Link href={`/orders/${row.orderId}`} className="hover:underline">
                      {row.workOrderNumber}
                    </Link>
                  </TableCell>
                  <TableCell>
                    {PURCHASE_REQUEST_STATUS_LABELS[row.status as PurchaseRequestStatus]}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableCard>
      ) : null}

      <TableCard>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>OC</TableHead>
              <TableHead>Proveedor</TableHead>
              <TableHead>Sucursal</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {result.rows.length === 0 ? (
              <EmptyTable
                colSpan={5}
                title={q ? "No hay órdenes de compra con esos filtros." : "No hay órdenes de compra."}
                description={
                  q
                    ? "Prueba otra búsqueda o limpia los filtros."
                    : "Crea la primera OC cuando exista un proveedor y un material."
                }
                href={!q && canWrite ? "/purchasing/new" : undefined}
                actionLabel="Capturar OC"
              />
            ) : (
              result.rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <Link href={`/purchasing/${row.id}`} className="font-medium hover:underline">
                      {row.number}
                    </Link>
                    {row.isUrgent ? (
                      <Badge variant="outline" className="ml-2">
                        Urgente
                      </Badge>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    {row.supplierCode} · {row.supplierName}
                  </TableCell>
                  <TableCell>{row.branchCode ?? "—"}</TableCell>
                  <TableCell>{displayMoney(row.total, row.currency)}</TableCell>
                  <TableCell>
                    {PURCHASE_ORDER_STATUS_LABELS[row.status as PurchaseOrderStatus]}
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
        label={result.total === 1 ? "orden de compra" : "órdenes de compra"}
        path="/purchasing"
        query={query}
        pageSize={pageSize}
      />
    </div>
  );
}
