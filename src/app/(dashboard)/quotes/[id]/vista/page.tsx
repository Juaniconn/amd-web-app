import Link from "next/link";
import { notFound } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { QuoteStatusActions } from "@/features/quotes/quote-status-actions";
import { requirePermission } from "@/lib/auth/session";
import { PERMISSION_IDS } from "@/lib/permissions/catalog";
import { canEditQuote } from "@/lib/quotes/status";
import { getQuoteById } from "@/server/services/quotes";

export default async function QuotePreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { access } = await requirePermission(PERMISSION_IDS.quotesRead);
  const { id } = await params;
  const quote = await getQuoteById(id);
  if (!quote || quote.deletedAt) notFound();
  const canWrite = access.permissions.includes(PERMISSION_IDS.quotesWrite);
  const editable = canWrite && canEditQuote(quote.status);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Vista previa
          </p>
          <h2 className="text-2xl font-semibold tracking-tight">{quote.number}</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/quotes/${quote.id}`}
            className={buttonVariants({ variant: "outline" })}
          >
            {editable ? "Regresar a editar" : "Volver a la cotización"}
          </Link>
          <a
            href={`/api/quotes/${quote.id}/pdf`}
            className={buttonVariants({ variant: "outline" })}
          >
            Descargar PDF
          </a>
        </div>
      </div>
      <iframe
        title={`Vista ${quote.number}`}
        src={`/api/quotes/${quote.id}/pdf?inline=1`}
        className="h-[70vh] w-full rounded-lg border bg-card"
      />
      {canWrite ? (
        <QuoteStatusActions
          quoteId={quote.id}
          status={quote.status}
          requiresEngineering={quote.requiresEngineering}
          engineeringStatus={quote.engineeringStatus}
        />
      ) : null}
    </div>
  );
}
