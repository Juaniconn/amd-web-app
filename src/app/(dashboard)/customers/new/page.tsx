import Link from "next/link";
import { CustomerForm } from "@/features/customers/customer-form";
import { buttonVariants } from "@/components/ui/button";
import { requirePermission } from "@/lib/auth/session";
import { PERMISSION_IDS } from "@/lib/permissions/catalog";

export default async function NewCustomerPage() {
  await requirePermission(PERMISSION_IDS.customersWrite);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Nuevo cliente</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            El código se asigna automáticamente. Los cambios quedan en el historial.
          </p>
        </div>
        <Link href="/customers" className={buttonVariants({ variant: "outline" })}>
          Volver
        </Link>
      </div>
      <CustomerForm mode="create" />
    </div>
  );
}
