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
import { Plus, ShoppingCart, Truck } from "lucide-react";
import { requirePermission } from "@/lib/auth/session";
import { PERMISSION_IDS } from "@/lib/permissions/catalog";
import {
  PURCHASE_ORDER_STATUS_LABELS,
  PURCHASE_REQUEST_STATUS_LABELS,
} from "@/lib/purchasing/catalog";
import { displayMoney } from "@/lib/quotes/money";
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
  const q = Array.isArray(params.q) ? params.q[0] : params.q;
  const page = Number(Array.isArray(params.page) ? params.page[0] : params.page) || 1;
  const pageSize = Number(Array.isArray(params.perPage) ? params.perPage[0] : params.perPage) || 20;

  const [result, requests] = await Promise.all([
    listPurchaseOrders({ q: q?.trim() || undefined, page, pageSize }),
    listPurchaseRequests({ q: q?.trim() || undefined, page: 1, pageSize: 10 }),
  ]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Compras</h1>
          <p className="text-xs text-muted-foreground">
            {result.total} OC · {requests.total} solicitudes
          </p>
        </div>
        {canWrite && (
          <Link href="/purchasing/new" className="inline-flex items-center justify-center gap-1 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            <Plus className="h-3 w-3" />
            Nueva OC
          </Link>
        )}
      </div>

      <div className="flex items-center gap-2 rounded-md border bg-card p-2">
        <button className="rounded bg-muted px-2 py-1 text-xs">Todas</button>
        <button className="rounded px-2 py-1 text-xs hover:bg-muted">Pendientes</button>
        <button className="rounded px-2 py-1 text-xs hover:bg-muted">Recibidas</button>
        <button className="rounded px-2 py-1 text-xs hover:bg-muted">Urgentes</button>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>OC</TableHead>
              <TableHead>Proveedor</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Fecha</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {result.rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-12 text-center">
                  <ShoppingCart className="mx-auto h-8 w-8 text-muted-foreground" />
                  <p className="mt-2 text-sm text-muted-foreground">Aún no hay OC</p>
                </TableCell>
              </TableRow>
            ) : (
              result.rows.map((po) => (
                <TableRow key={po.id}>
                  <TableCell>
                    <Link href={`/purchasing/${po.id}`} className="font-medium hover:underline">
                      {po.number}
                    </Link>
                  </TableCell>
                  <TableCell>{po.supplierName}</TableCell>
                  <TableCell>{displayMoney(po.total, po.currency)}</TableCell>
                  <TableCell>
                    <Badge variant={po.isUrgent ? "destructive" : "secondary"}>
                      {PURCHASE_ORDER_STATUS_LABELS[po.status as keyof typeof PURCHASE_ORDER_STATUS_LABELS]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs">
                    {po.expectedDate ? new Date(po.expectedDate).toLocaleDateString("es-MX") : "—"}
                   </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
