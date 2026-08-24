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
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState, StatCard, StatRow } from "@/components/shared/ui-patterns";
import { PageHeader } from "@/components/layout/page-header";
import { CreditCard, Calendar, FileWarning, CheckCircle, AlertCircle, Clock } from "lucide-react";
import { requirePermission } from "@/lib/auth/session";
import { PERMISSION_IDS } from "@/lib/permissions/catalog";
import { INVOICE_STATUS_LABELS } from "@/lib/billing/catalog";
import { displayMoney } from "@/lib/quotes/money";
import { workOrderNumber } from "@/lib/production/ot-number";
import { listInvoices, listPendingToInvoice } from "@/server/services/billing";

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
  const q = Array.isArray(params.q) ? params.q[0] : params.q;
  const page = Number(Array.isArray(params.page) ? params.page[0] : params.page) || 1;
  const pageSize = Number(Array.isArray(params.perPage) ? params.perPage[0] : params.perPage) || 20;

  const result = await listInvoices({ q: q?.trim() || undefined, page, pageSize });
  const { access } = await requirePermission(PERMISSION_IDS.billingRead);
  const canWrite = access.permissions.includes(PERMISSION_IDS.billingWrite);
  const pending = canWrite ? await listPendingToInvoice() : [];

  // KPIs sobre la página actual (datos reales visibles)
  const paidCount = result.rows.filter((i) => i.status === "pagada").length;
  const overdueCount = result.rows.filter((i) => {
    if (i.status !== "emitida" && i.status !== "parcial") return false;
    return i.dueDate && new Date(i.dueDate) < new Date();
  }).length;
  const openCount = result.rows.filter((i) => i.status === "emitida" || i.status === "parcial").length;
  const draftCount = result.rows.filter((i) => i.status === "borrador").length;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Facturación"
        description="Facturas emitidas y borradores del sistema."
      />

      <StatRow>
        <StatCard label="En esta vista" value={result.rows.length} icon={<CreditCard className="h-4 w-4" />} />
        <StatCard label="Pagadas" value={paidCount} tone="green" icon={<CheckCircle className="h-4 w-4" />} />
        <StatCard label="Vencidas" value={overdueCount} tone="red" icon={<AlertCircle className="h-4 w-4" />} />
        <StatCard label="Pendientes de facturar" value={pending.length} tone="amber" icon={<FileWarning className="h-4 w-4" />} />
      </StatRow>

      {/* Pendientes de facturar — tarjeta funcional intacta */}
      {canWrite ? (
        <Card className="border-amber-500/40">
          <CardContent className="pt-6">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <FileWarning className="h-4 w-4 text-amber-500" />
                <h2 className="text-sm font-semibold">Pendientes de facturar</h2>
                <Badge variant={pending.length > 0 ? "default" : "outline"}>
                  {pending.length}
                </Badge>
              </div>
              <Link href="/billing/new" className={buttonVariants({ variant: "outline", size: "sm" })}>
                Generar borrador
              </Link>
            </div>
            <p className="mb-3 text-xs text-muted-foreground">
              Órdenes de trabajo ya entregadas al cliente que todavía no tienen su borrador de
              facturación. Genera el borrador aquí y factura en CONTPAQi.
            </p>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>OT</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Entrega</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {pending.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-6 text-center text-sm text-muted-foreground">
                      Todo facturado — no hay entregas pendientes
                    </TableCell>
                  </TableRow>
                ) : (
                  pending.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium">{workOrderNumber(row.number)}</TableCell>
                      <TableCell>
                        <span>{row.customerName}</span>
                        {row.customerRfc ? (
                          <span className="ml-2 text-xs text-muted-foreground">{row.customerRfc}</span>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {row.deliveryNumber}
                        {row.deliveredAt
                          ? ` · ${new Date(row.deliveredAt).toLocaleDateString("es-MX")}`
                          : ""}
                      </TableCell>
                      <TableCell className="font-medium">
                        {displayMoney(row.total, row.currency)}
                      </TableCell>
                      <TableCell>
                        <Link
                          href={`/billing/new?order=${row.id}`}
                          className={buttonVariants({ size: "sm" })}
                        >
                          Preparar
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}

      {/* Tabla de facturas */}
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Factura</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Pagado</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Vencimiento</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {result.rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-8">
                  <EmptyState
                    icon={<CreditCard className="h-8 w-8" />}
                    title="Sin facturas"
                    description="No hay facturas registradas. Genera un borrador desde la sección de pendientes."
                  />
                </TableCell>
              </TableRow>
            ) : (
              result.rows.map((invoice) => (
                <TableRow key={invoice.id} className="hover:bg-muted/40">
                  <TableCell>
                    <Link href={`/billing/${invoice.id}`} className="font-medium hover:underline">
                      {invoice.number}
                    </Link>
                  </TableCell>
                  <TableCell>{invoice.customerName}</TableCell>
                  <TableCell>
                    <span className="font-medium">
                      {displayMoney(invoice.total, invoice.currency)}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs">
                    {displayMoney(invoice.paidTotal, invoice.currency)}
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1.5 text-xs">
                      <span
                        className={`h-2 w-2 rounded-full ${
                          invoice.status === "pagada"
                            ? "bg-emerald-500"
                            : invoice.status === "cancelada"
                              ? "bg-gray-400"
                              : invoice.dueDate && new Date(invoice.dueDate) < new Date()
                                ? "bg-red-500"
                                : "bg-amber-500"
                        }`}
                      />
                      {INVOICE_STATUS_LABELS[invoice.status as keyof typeof INVOICE_STATUS_LABELS]}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs">
                    {invoice.dueDate ? (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        {new Date(invoice.dueDate).toLocaleDateString("es-MX")}
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

      {/* Nota sobre CONTPAQi */}
      <p className="text-xs text-muted-foreground">
        sin CFDI, la factura real se hace en CONTPAQi
      </p>

      {/* Pagination */}
      {result.pageCount > 1 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{result.total} resultados · Página {page} de {result.pageCount}</span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={`/billing?page=${page - 1}${q ? `&q=${q}` : ""}`}
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                Anterior
              </Link>
            )}
            {page < result.pageCount && (
              <Link
                href={`/billing?page=${page + 1}${q ? `&q=${q}` : ""}`}
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