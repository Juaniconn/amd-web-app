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
import { Plus, ShoppingCart, Clock, AlertCircle, FileText } from "lucide-react";
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
    status?: string | string[];
    page?: string | string[];
    perPage?: string | string[];
  }>;
}) {
  const { access } = await requirePermission(PERMISSION_IDS.purchasingRead);
  const canWrite = access.permissions.includes(PERMISSION_IDS.purchasingWrite);
  const params = await searchParams;
  const q = Array.isArray(params.q) ? params.q[0] : params.q;
  const statusFilter = Array.isArray(params.status) ? params.status[0] : params.status;
  const page = Number(Array.isArray(params.page) ? params.page[0] : params.page) || 1;
  const pageSize = Number(Array.isArray(params.perPage) ? params.perPage[0] : params.perPage) || 20;
  const filtered = Boolean(q || statusFilter);

  const [result, requests] = await Promise.all([
    listPurchaseOrders({
      q: q?.trim() || undefined,
      status: statusFilter as any,
      page,
      pageSize,
    }),
    listPurchaseRequests({ q: q?.trim() || undefined, page: 1, pageSize: 10 }),
  ]);

  // KPIs sobre la página actual (datos reales visibles)
  const openCount = result.rows.filter((po) => po.status !== "recibida" && po.status !== "cerrada" && po.status !== "cancelada").length;
  const urgentCount = result.rows.filter((po) => po.isUrgent).length;
  const draftCount = result.rows.filter((po) => po.status === "borrador").length;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Compras"
        description="Órdenes de compra y solicitudes de material."
        actions={
          canWrite ? (
            <Link href="/purchasing/new" className={buttonVariants({ size: "sm" })}>
              <Plus className="mr-1 h-3.5 w-3.5" />
              Nueva OC
            </Link>
          ) : null
        }
      />

      <StatRow>
        <StatCard label="En esta vista" value={result.rows.length} icon={<ShoppingCart className="h-4 w-4" />} />
        <StatCard label="OC abiertas" value={openCount} tone="blue" icon={<FileText className="h-4 w-4" />} />
        <StatCard label="Urgentes" value={urgentCount} tone="red" icon={<AlertCircle className="h-4 w-4" />} />
        <StatCard label="Solicitudes" value={requests.total} tone="neutral" icon={<Clock className="h-4 w-4" />} />
      </StatRow>

      <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-card p-2">
        {[
          { label: "Todas", status: undefined },
          { label: "Borrador", status: "borrador" },
          { label: "Enviadas", status: "enviada" },
          { label: "Confirmadas", status: "confirmada" },
          { label: "Parciales", status: "parcial" },
          { label: "Recibidas", status: "recibida" },
        ].map((f) => {
          const sp = new URLSearchParams();
          if (q) sp.set("q", q);
          if (f.status) sp.set("status", f.status);
          const s = sp.toString();
          const active = statusFilter === f.status;
          return (
            <Link
              key={f.label}
              href={s ? `/purchasing?${s}` : "/purchasing"}
              className={`rounded-md px-2.5 py-1 text-xs transition-colors ${
                active
                  ? "bg-primary/10 font-medium text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {f.label}
            </Link>
          );
        })}
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
                <TableCell colSpan={5} className="py-8">
                  <EmptyState
                    icon={<ShoppingCart className="h-8 w-8" />}
                    title={filtered ? "Sin resultados" : "Aún no hay OC"}
                    description={
                      filtered
                        ? "Ajusta los filtros o la búsqueda para encontrar la OC."
                        : "Crea tu primera orden de compra para gestionar proveedores."
                    }
                    action={
                      !filtered && canWrite ? (
                        <Link href="/purchasing/new" className={buttonVariants({ size: "sm" })}>
                          <Plus className="mr-1 h-3.5 w-3.5" />
                          Crear primera OC
                        </Link>
                      ) : null
                    }
                  />
                </TableCell>
              </TableRow>
            ) : (
              result.rows.map((po) => (
                <TableRow key={po.id} className="hover:bg-muted/40">
                  <TableCell>
                    <Link href={`/purchasing/${po.id}`} className="font-medium hover:underline">
                      {po.number}
                    </Link>
                  </TableCell>
                  <TableCell>{po.supplierName}</TableCell>
                  <TableCell>{displayMoney(po.total, po.currency)}</TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1.5 text-xs">
                      <span
                        className={`h-2 w-2 rounded-full ${
                          po.isUrgent
                            ? "bg-red-500"
                            : po.status === "recibida" || po.status === "cerrada"
                            ? "bg-emerald-500"
                            : po.status === "cancelada"
                            ? "bg-gray-400"
                            : "bg-amber-500"
                        }`}
                      />
                      <Badge variant={po.isUrgent ? "destructive" : "secondary"}>
                        {PURCHASE_ORDER_STATUS_LABELS[po.status as keyof typeof PURCHASE_ORDER_STATUS_LABELS]}
                      </Badge>
                    </span>
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