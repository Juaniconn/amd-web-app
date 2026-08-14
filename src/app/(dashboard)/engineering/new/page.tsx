import Link from "next/link";
import { EngineeringForm } from "@/features/engineering/engineering-form";
import { buttonVariants } from "@/components/ui/button";
import { requirePermission } from "@/lib/auth/session";
import { PERMISSION_IDS } from "@/lib/permissions/catalog";
import type { QuoteEngineeringType } from "@/lib/quotes/rfq";
import {
  listQuotesEligibleForEngineering,
  listUsersForAssignment,
} from "@/server/services/engineering";

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function NewEngineeringPage({
  searchParams,
}: {
  searchParams: Promise<{ quoteId?: string | string[] }>;
}) {
  await requirePermission(PERMISSION_IDS.engineeringCreate);
  const params = await searchParams;
  const quoteId = first(params.quoteId);
  const quotes = await listQuotesEligibleForEngineering();
  const users = await listUsersForAssignment();
  const selected = quotes.find((quote) => quote.id === quoteId);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Nueva solicitud</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Una RFQ genera como máximo una solicitud de ingeniería.
          </p>
        </div>
        <Link href="/engineering" className={buttonVariants({ variant: "outline" })}>
          Volver
        </Link>
      </div>
      {quotes.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No hay RFQ que requieran ingeniería sin solicitud. Marca «Requiere
          ingeniería» en la cotización o espera a que se archive una cancelada.
        </p>
      ) : (
        <EngineeringForm
          mode="create"
          quotes={quotes.map((quote) => ({
            ...quote,
            engineeringType: quote.engineeringType as QuoteEngineeringType | null,
          }))}
          users={users}
          defaultValues={
            selected
              ? {
                  quoteId: selected.id,
                  projectType: (selected.engineeringType ?? "diseno_nuevo") as QuoteEngineeringType,
                  description: `Ingeniería para ${selected.number}.`,
                }
              : undefined
          }
        />
      )}
    </div>
  );
}
