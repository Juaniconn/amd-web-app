import Link from "next/link";
import { MaterialForm } from "@/features/inventory/material-form";
import { buttonVariants } from "@/components/ui/button";
import { requirePermission } from "@/lib/auth/session";
import { PERMISSION_IDS } from "@/lib/permissions/catalog";
import { listUnitsOfMeasure } from "@/server/services/inventory";

export default async function NewMaterialPage() {
  await requirePermission(PERMISSION_IDS.inventoryWrite);
  const units = await listUnitsOfMeasure();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Nuevo material</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            El código MAT-YYYY-NNNNN se asigna al guardar. Sin lotes ni certificados.
          </p>
        </div>
        <Link href="/inventory" className={buttonVariants({ variant: "outline" })}>
          Volver
        </Link>
      </div>
      <MaterialForm mode="create" units={units} />
    </div>
  );
}
