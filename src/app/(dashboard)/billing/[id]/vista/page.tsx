import Link from "next/link";
import { notFound } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { InvoiceActions } from "@/features/billing/invoice-actions";
import { requirePermission } from "@/lib/auth/session";
import { PERMISSION_IDS } from "@/lib/permissions/catalog";
import { getInvoiceById } from "@/server/services/billing";

export default async function InvoicePreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { access } = await requirePermission(PERMISSION_IDS.billingRead);
  const { id } = await params;
  const invoice = await getInvoiceById(id);
  if (!invoice) notFound();
  const canWrite = access.permissions.includes(PERMISSION_IDS.billingWrite);
  const canPay = access.permissions.includes(PERMISSION_IDS.billingRegisterPayment);
  const draft = invoice.status === "borrador";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Vista previa
          </p>
          <h2 className="text-2xl font-semibold tracking-tight">{invoice.number}</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/billing/${invoice.id}`}
            className={buttonVariants({ variant: "outline" })}
          >
            {draft ? "Regresar a editar" : "Volver a la factura"}
          </Link>
          <a
            href={`/api/invoices/${invoice.id}/pdf`}
            className={buttonVariants({ variant: "outline" })}
          >
            Descargar PDF
          </a>
        </div>
      </div>
      <iframe
        title={`Vista ${invoice.number}`}
        src={`/api/invoices/${invoice.id}/pdf?inline=1`}
        className="h-[70vh] w-full rounded-lg border bg-card"
      />
      {draft && canWrite ? (
        <InvoiceActions
          invoiceId={invoice.id}
          status={invoice.status}
          canWrite={canWrite}
          canPay={canPay}
          currency={invoice.currency}
          balance={invoice.balance}
        />
      ) : null}
    </div>
  );
}
