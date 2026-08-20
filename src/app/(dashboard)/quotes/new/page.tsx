import Link from "next/link";
import { QuoteForm } from "@/features/quotes/quote-form";
import { buttonVariants } from "@/components/ui/button";
import { requirePermission } from "@/lib/auth/session";
import { PERMISSION_IDS } from "@/lib/permissions/catalog";
import {
  listActiveCustomersForSelect,
  listContactsForCustomer,
} from "@/server/services/customers";
import { listBranches } from "@/server/services/branches";

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function NewQuotePage({
  searchParams,
}: {
  searchParams: Promise<{ customerId?: string | string[] }>;
}) {
  await requirePermission(PERMISSION_IDS.quotesWrite);
  const params = await searchParams;
  const customerId = first(params.customerId);
  const customers = await listActiveCustomersForSelect();
  const branches = await listBranches({ activeOnly: true });
  const contactsByCustomer: Record<
    string,
    { id: string; name: string; isPrimary: boolean; title: string | null; department: string | null; phone: string | null }[]
  > = {};
  for (const customer of customers) {
    contactsByCustomer[customer.id] = await listContactsForCustomer(customer.id);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Nueva cotización</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Captura la RFQ. El número se asigna automáticamente.
          </p>
        </div>
        <Link href="/quotes" className={buttonVariants({ variant: "outline" })}>
          Volver
        </Link>
      </div>
      <QuoteForm
        mode="create"
        customers={customers}
        contactsByCustomer={contactsByCustomer}
        branches={branches}
        defaultValues={customerId ? { customerId } : undefined}
      />
    </div>
  );
}
