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
import { Plus, Truck, MapPin, Calendar, CheckCircle, AlertCircle, Package, CircleDashed } from "lucide-react";
import { requirePermission } from "@/lib/auth/session";
import { PERMISSION_IDS } from "@/lib/permissions/catalog";
import { DELIVERY_STATUS_LABELS } from "@/lib/deliveries/catalog";
import { listDeliveries } from "@/server/services/deliveries";

export default async function DeliveriesPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string | string[];
    page?: string | string[];
    perPage?: string | string[];
  }>;
}) {
  const { access } = await requirePermission(PERMISSION_IDS.deliveriesRead);
  const canWrite = access.permissions.includes(PERMISSION_IDS.deliveriesWrite);
  const params = await searchParams;
  const q = Array.isArray(params.q) ? params.q[0] : params.q;
  const page = Number(Array.isArray(params.page) ? params.page[0] : params.page) || 1;
  const pageSize = Number(Array.isArray(params.perPage) ? params.perPage[0] : params.perPage) || 20;

  const result = await listDeliveries({ q: q?.trim() || undefined, page, pageSize });

  // KPIs sobre la página actual (datos reales visibles)
  const deliveredCount = result.rows.filter((d) => d.status === "entregado").length;
  const incidentCount = result.rows.filter((d) => d.status === "incidencia").length;
  const inTransitCount = result.rows.filter((d) => d.status === "enviado").length;
  const pendingCount = result.rows.filter((d) => d.status === "pendiente" || d.status === "preparando").length;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Entregas"
        description="Seguimiento de entregas a clientes."
        actions={
          canWrite ? (
            <Link href="/deliveries/new" className={buttonVariants({ size: "sm" })}>
              <Plus className="mr-1 h-3.5 w-3.5" />
              Nueva Entrega
            </Link>
          ) : null
        }
      />

      <StatRow>
        <StatCard label="En esta vista" value={result.rows.length} icon={<Truck className="h-4 w-4" />} />
        <StatCard label="Entregadas" value={deliveredCount} tone="green" icon={<CheckCircle className="h-4 w-4" />} />
        <StatCard label="En tránsito" value={inTransitCount} tone="blue" icon={<Package className="h-4 w-4" />} />
        <StatCard label="Incidencias" value={incidentCount} tone="red" icon={<AlertCircle className="h-4 w-4" />} />
      </StatRow>

      {/* Table */}
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Entrega</TableHead>
              <TableHead>Pedido</TableHead>
              <TableHead>Destino</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Fecha</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {result.rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-8">
                  <EmptyState
                    icon={<Truck className="h-8 w-8" />}
                    title="Sin entregas"
                    description="No hay entregas registradas. Crea una nueva entrega para empezar."
                    action={
                      canWrite ? (
                        <Link href="/deliveries/new" className={buttonVariants({ size: "sm" })}>
                          <Plus className="mr-1 h-3.5 w-3.5" />
                          Nueva entrega
                        </Link>
                      ) : null
                    }
                  />
                </TableCell>
              </TableRow>
            ) : (
              result.rows.map((delivery) => (
                <TableRow key={delivery.id} className="hover:bg-muted/40">
                  <TableCell>
                    <Link href={`/deliveries/${delivery.id}`} className="font-medium hover:underline">
                      {delivery.number}
                    </Link>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{delivery.orderNumber}</TableCell>
                  <TableCell className="text-xs">
                    {delivery.shippingCity && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-muted-foreground" />
                        {delivery.shippingCity}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1.5 text-xs">
                      <span
                        className={`h-2 w-2 rounded-full ${
                          delivery.status === "entregado"
                            ? "bg-emerald-500"
                            : delivery.status === "incidencia"
                              ? "bg-red-500"
                              : delivery.status === "enviado"
                                ? "bg-blue-500"
                                : "bg-amber-500"
                        }`}
                      />
                      {DELIVERY_STATUS_LABELS[delivery.status as keyof typeof DELIVERY_STATUS_LABELS]}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs">
                    {delivery.scheduledDate ? (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        {new Date(delivery.scheduledDate).toLocaleDateString("es-MX")}
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
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={`/deliveries?page=${page - 1}${q ? `&q=${q}` : ""}`}
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                Anterior
              </Link>
            )}
            {page < result.pageCount && (
              <Link
                href={`/deliveries?page=${page + 1}${q ? `&q=${q}` : ""}`}
                className={buttonVariants({ variant: "outline", size: "sm" })}
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