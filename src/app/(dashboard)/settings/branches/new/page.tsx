import Link from "next/link";
import { BranchForm } from "@/features/branches/branch-form";
import { buttonVariants } from "@/components/ui/button";
import { PERMISSION_IDS } from "@/lib/permissions/catalog";
import { requirePermission } from "@/lib/auth/session";

export default async function NewBranchPage() {
  await requirePermission(PERMISSION_IDS.branchesWrite);
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Nueva sucursal</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Captura los datos fiscales reales. No inventes RFC ni teléfonos.
          </p>
        </div>
        <Link href="/settings/branches" className={buttonVariants({ variant: "outline" })}>
          Volver
        </Link>
      </div>
      <BranchForm mode="create" />
    </div>
  );
}
