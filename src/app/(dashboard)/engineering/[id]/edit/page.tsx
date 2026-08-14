import Link from "next/link";
import { notFound } from "next/navigation";
import {
  EngineeringForm,
  toEngineeringDateInput,
} from "@/features/engineering/engineering-form";
import { buttonVariants } from "@/components/ui/button";
import { requirePermission } from "@/lib/auth/session";
import { canEditEngineering, type EngineeringStatus } from "@/lib/engineering/status";
import { PERMISSION_IDS } from "@/lib/permissions/catalog";
import type { QuoteEngineeringType } from "@/lib/quotes/rfq";
import { getEngineeringRequestById } from "@/server/services/engineering";

export default async function EditEngineeringPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermission(PERMISSION_IDS.engineeringUpdate);
  const { id } = await params;
  const request = await getEngineeringRequestById(id);
  if (
    !request ||
    request.deletedAt ||
    !canEditEngineering(request.status as EngineeringStatus)
  ) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Editar solicitud</h2>
          <p className="mt-1 text-sm text-muted-foreground">{request.number}</p>
        </div>
        <Link
          href={`/engineering/${request.id}`}
          className={buttonVariants({ variant: "outline" })}
        >
          Cancelar
        </Link>
      </div>
      <EngineeringForm
        mode="edit"
        requestId={request.id}
        quotes={[
          {
            id: request.quoteId,
            number: request.quoteNumber,
            customerName: request.customerName,
            engineeringType: request.projectType as QuoteEngineeringType,
          },
        ]}
        users={[]}
        defaultValues={{
          quoteId: request.quoteId,
          description: request.description,
          notes: request.notes ?? "",
          projectType: request.projectType as QuoteEngineeringType,
          priority: request.priority,
          dueDate: toEngineeringDateInput(request.dueDate),
        }}
      />
    </div>
  );
}
