import Link from "next/link";
import { Badge } from "@/components/ui/badge";
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
import {
  DELIVERY_STATUS_LABELS,
  type DeliveryStatus,
} from "@/lib/deliveries/catalog";
import { PERMISSION_IDS } from "@/lib/permissions/catalog";
import { workOrderNumber } from "@/lib/production/ot-number";
import { firstSearchParam, parsePage, parsePageSize } from "@/lib/ui/pagination";
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
  await requirePermission(PERMISSION_IDS.deliveriesRead);
  const params = await searchParams;
  const q = firstSearchParam(params.q)?.trim() || undefined;
  const page = parsePage(firstSearchParam(params.page));
  const pageSize = parsePageSize(firstSearchParam(params.perPage));
  const result = await listDeliveries({ q, page, pageSize });
  const query = new URLSearchParams();
  if (q) query.set("q", q);
  query.set("perPage", String(pageSize));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Entregas</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Folios que salen de una OT cuando todos sus números de parte están terminados.
            Aquí solo se programa fecha y transportista.
          </p>
        </div>
      </div>
      <ListSearchForm
        action="/deliveries"
        q={q}
        perPage={pageSize}
        placeholder="Folio, orden de trabajo, cliente o guía"
      />
      <TableCard>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Folio</TableHead>
              <TableHead>Orden de trabajo</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Guía</TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {result.rows.length === 0 ? (
              <EmptyTable
                colSpan={5}
                title={q ? "No hay entregas con esos filtros." : "No hay entregas."}
                description={
                  q
                    ? "Prueba otra búsqueda o limpia los filtros."
                    : "Cuando una OT tenga todos los números de parte terminados, el administrador de OT pulsa Enviar a Entregas."
                }
              />
            ) : (
              result.rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <Link href={`/deliveries/${row.id}`} className="font-medium hover:underline">
                      {row.number}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Link href={`/orders/${row.orderId}`} className="hover:underline">
                      {workOrderNumber(row.orderNumber)}
                    </Link>
                  </TableCell>
                  <TableCell>{row.customerName}</TableCell>
                  <TableCell>{row.trackingNumber ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant={row.status === "incidencia" ? "outline" : "secondary"}>
                      {DELIVERY_STATUS_LABELS[row.status as DeliveryStatus]}
                    </Badge>
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
        label={result.total === 1 ? "entrega" : "entregas"}
        path="/deliveries"
        query={query}
        pageSize={pageSize}
      />
    </div>
  );
}
