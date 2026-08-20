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
import { INVOICE_STATUS_LABELS, type InvoiceStatus } from "@/lib/billing/catalog";
import { PERMISSION_IDS } from "@/lib/permissions/catalog";
import { displayMoney } from "@/lib/quotes/money";
import { workOrderNumber } from "@/lib/production/ot-number";
import { firstSearchParam, parsePage, parsePageSize } from "@/lib/ui/pagination";
import { listInvoices } from "@/server/services/billing";

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string | string[];
    page?: string | string[];
    perPage?: string | string[];
  }>;
}) {
  await requirePermission(PERMISSION_IDS.billingRead);
  const params = await searchParams;
  const q = firstSearchParam(params.q)?.trim() || undefined;
  const page = parsePage(firstSearchParam(params.page));
  const pageSize = parsePageSize(firstSearchParam(params.perPage));
  const result = await listInvoices({ q, page, pageSize });
  const query = new URLSearchParams();
  if (q) query.set("q", q);
  query.set("perPage", String(pageSize));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Facturación</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Solicitudes de facturación de OT entregadas. CONTPAQi emite el CFDI; aquí
            solo se gestiona el folio de borrador a enviada al cliente.
          </p>
        </div>
      </div>
      <ListSearchForm
        action="/billing"
        q={q}
        perPage={pageSize}
        placeholder="Folio, orden de trabajo o cliente"
      />
      <TableCard>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Folio</TableHead>
              <TableHead>Orden de trabajo</TableHead>
              <TableHead>Cotización</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {result.rows.length === 0 ? (
              <EmptyTable
                colSpan={6}
                title={q ? "No hay solicitudes con esos filtros." : "No hay solicitudes de facturación."}
                description={
                  q
                    ? "Prueba otra búsqueda o limpia los filtros."
                    : "Cuando Entregas marca una OT como entregada, aquí llega el borrador con los datos de la cotización."
                }
              />
            ) : (
              result.rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <Link href={`/billing/${row.id}`} className="font-medium hover:underline">
                      {row.number}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Link href={`/orders/${row.orderId}`} className="hover:underline">
                      {workOrderNumber(row.orderNumber)}
                    </Link>
                  </TableCell>
                  <TableCell>
                    {row.quoteId ? (
                      <Link href={`/quotes/${row.quoteId}`} className="hover:underline">
                        {row.quoteNumber}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>{row.customerName}</TableCell>
                  <TableCell>
                    {displayMoney(row.total, row.currency)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {INVOICE_STATUS_LABELS[row.status as InvoiceStatus]}
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
        label={result.total === 1 ? "factura" : "facturas"}
        path="/billing"
        query={query}
        pageSize={pageSize}
      />
    </div>
  );
}
