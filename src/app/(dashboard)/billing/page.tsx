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
import { CreditCard, Calendar } from "lucide-react";
import { requirePermission } from "@/lib/auth/session";
import { PERMISSION_IDS } from "@/lib/permissions/catalog";
import { INVOICE_STATUS_LABELS } from "@/lib/billing/catalog";
import { displayMoney } from "@/lib/quotes/money";
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
  const q = Array.isArray(params.q) ? params.q[0] : params.q;
  const page = Number(Array.isArray(params.page) ? params.page[0] : params.page) || 1;
  const pageSize = Number(Array.isArray(params.perPage) ? params.perPage[0] : params.perPage) || 20;

  const result = await listInvoices({ q: q?.trim() || undefined, page, pageSize });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Facturación</h1>
          <p className="text-xs text-muted-foreground">{result.total} facturas</p>
        </div>
      </div>

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
                <TableCell colSpan={6} className="py-12 text-center">
                  <CreditCard className="mx-auto h-8 w-8 text-muted-foreground" />
                  <p className="mt-2 text-sm text-muted-foreground">Sin facturas</p>
                </TableCell>
              </TableRow>
            ) : (
              result.rows.map((invoice) => (
                <TableRow key={invoice.id}>
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
                    <Badge variant={invoice.status === "pagada" ? "default" : invoice.status === "emitida" ? "secondary" : "outline"}>
                      {INVOICE_STATUS_LABELS[invoice.status as keyof typeof INVOICE_STATUS_LABELS]}
                    </Badge>
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
    </div>
  );
}
