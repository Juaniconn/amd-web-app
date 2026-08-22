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
import { Plus, Truck, MapPin, Calendar } from "lucide-react";
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Entregas</h1>
          <p className="text-xs text-muted-foreground">{result.total} entregas</p>
        </div>
        {canWrite && (
          <Link href="/deliveries/new" className="inline-flex items-center justify-center gap-1 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            <Plus className="h-3 w-3" />
            Nueva Entrega
          </Link>
        )}
      </div>

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
                <TableCell colSpan={5} className="py-12 text-center">
                  <Truck className="mx-auto h-8 w-8 text-muted-foreground" />
                  <p className="mt-2 text-sm text-muted-foreground">Sin entregas</p>
                </TableCell>
              </TableRow>
            ) : (
              result.rows.map((delivery) => (
                <TableRow key={delivery.id}>
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
                    <Badge variant={delivery.status === "entregado" ? "default" : delivery.status === "enviado" ? "secondary" : "outline"}>
                      {DELIVERY_STATUS_LABELS[delivery.status as keyof typeof DELIVERY_STATUS_LABELS]}
                    </Badge>
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
    </div>
  );
}
