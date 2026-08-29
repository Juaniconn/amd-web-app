import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard, StatRow } from "@/components/shared/ui-patterns";
import { InvoiceActions } from "@/features/billing/invoice-actions";
import { requirePermission } from "@/lib/auth/session";
import { INVOICE_STATUS_LABELS, type InvoiceStatus } from "@/lib/billing/catalog";
import { PERMISSION_IDS } from "@/lib/permissions/catalog";
import { PAYMENT_TERM_LABELS, type PaymentTerm } from "@/lib/quotes/commercial";
import { displayQty } from "@/lib/inventory/catalog";
import { displayMoney } from "@/lib/quotes/money";
import { workOrderNumber } from "@/lib/production/ot-number";
import { getInvoiceById } from "@/server/services/billing";

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm">{value || "—"}</p>
    </div>
  );
}

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { access } = await requirePermission(PERMISSION_IDS.billingRead);
  const { id } = await params;
  const invoice = await getInvoiceById(id);
  if (!invoice) notFound();
  const canWrite = access.permissions.includes(PERMISSION_IDS.billingWrite);

  return (
    <div className="space-y-4">
      <PageHeader
        title={invoice.number}
        description={`${INVOICE_STATUS_LABELS[invoice.status as InvoiceStatus]}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/billing/${invoice.id}/vista`}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              Vista
            </Link>
            <Link href="/billing" className={buttonVariants({ variant: "outline", size: "sm" })}>
              Volver
            </Link>
          </div>
        }
      />

      <StatRow>
        <StatCard
          label="Estado"
          value={INVOICE_STATUS_LABELS[invoice.status as InvoiceStatus]}
          tone={invoice.status === "pagada" ? "green" : invoice.status === "cancelada" ? "red" : "amber"}
        />
        <StatCard label="Total" value={displayMoney(invoice.total, invoice.currency)} />
        <StatCard label="OT" value={workOrderNumber(invoice.orderNumber)} />
      </StatRow>

      <Card>
        <CardHeader>
          <CardTitle>Encabezado</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <Field label="Orden de trabajo" value={workOrderNumber(invoice.orderNumber)} />
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Cotización
            </p>
            {invoice.quoteId ? (
              <Link href={`/quotes/${invoice.quoteId}`} className="mt-1 block text-sm hover:underline">
                {invoice.quoteNumber}
              </Link>
            ) : (
              <p className="mt-1 text-sm">—</p>
            )}
          </div>
          <Field label="Cliente" value={invoice.customerName} />
          <Field label="RFC" value={invoice.customerRfc} />
          <Field
            label="Sucursal"
            value={invoice.branchCode ? `${invoice.branchCode} · ${invoice.branchName}` : null}
          />
          <Field
            label="Pago"
            value={PAYMENT_TERM_LABELS[(invoice.paymentTerm as PaymentTerm) ?? "net_30"]}
          />
          <Field label="Emisión" value={invoice.issueDate.toLocaleDateString("es-MX")} />
          <Field label="Vencimiento" value={invoice.dueDate?.toLocaleDateString("es-MX") ?? null} />
          <Field label="Total" value={displayMoney(invoice.total, invoice.currency)} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Partidas</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Descripción</TableHead>
                <TableHead>Cant.</TableHead>
                <TableHead>Precio</TableHead>
                <TableHead>Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoice.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.description}</TableCell>
                  <TableCell>{displayQty(item.quantity)}</TableCell>
                  <TableCell>{displayMoney(item.unitPrice, invoice.currency)}</TableCell>
                  <TableCell>{displayMoney(item.lineTotal, invoice.currency)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Estado</CardTitle>
        </CardHeader>
        <CardContent>
          <InvoiceActions
            invoiceId={invoice.id}
            status={invoice.status}
            canWrite={canWrite}
          />
        </CardContent>
      </Card>
      <Link href={`/orders/${invoice.orderId}`} className="text-sm underline">
        Ver orden de trabajo
      </Link>
    </div>
  );
}
