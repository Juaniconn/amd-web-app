import Link from "next/link";
import { notFound } from "next/navigation";
import { QuoteForm } from "@/features/quotes/quote-form";
import { buttonVariants } from "@/components/ui/button";
import { requirePermission } from "@/lib/auth/session";
import { PERMISSION_IDS } from "@/lib/permissions/catalog";
import { canEditQuote } from "@/lib/quotes/status";
import {
  listActiveCustomersForSelect,
  listContactsForCustomer,
} from "@/server/services/customers";
import { getQuoteById } from "@/server/services/quotes";

export default async function EditQuotePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermission(PERMISSION_IDS.quotesWrite);
  const { id } = await params;
  const quote = await getQuoteById(id);
  if (!quote || quote.deletedAt || !canEditQuote(quote.status)) {
    notFound();
  }

  const customers = await listActiveCustomersForSelect();
  const contactsByCustomer: Record<
    string,
    { id: string; name: string; isPrimary: boolean }[]
  > = {};
  for (const customer of customers) {
    contactsByCustomer[customer.id] = await listContactsForCustomer(customer.id);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Editar cotización</h2>
          <p className="mt-1 text-sm text-muted-foreground">{quote.number}</p>
        </div>
        <Link
          href={`/quotes/${quote.id}`}
          className={buttonVariants({ variant: "outline" })}
        >
          Cancelar
        </Link>
      </div>
      <QuoteForm
        mode="edit"
        quoteId={quote.id}
        customers={customers}
        contactsByCustomer={contactsByCustomer}
        defaultValues={{
          customerId: quote.customerId,
          contactId: quote.contactId ?? "",
          issueDate: quote.issueDate.toISOString().slice(0, 10),
          validUntil: quote.validUntil ? quote.validUntil.toISOString().slice(0, 10) : "",
          currency: quote.currency,
          paymentTerms: quote.paymentTerms ?? "",
          leadTime: quote.leadTime ?? "",
          notes: quote.notes ?? "",
          rfqType: quote.rfqType,
          requiresEngineering: quote.requiresEngineering,
          engineeringType: quote.engineeringType ?? "",
        }}
      />
    </div>
  );
}
