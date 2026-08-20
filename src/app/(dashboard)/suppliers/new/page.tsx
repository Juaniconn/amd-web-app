import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { SupplierForm } from "@/features/purchasing/supplier-form";
import { requirePermission } from "@/lib/auth/session";
import { PERMISSION_IDS } from "@/lib/permissions/catalog";

export default async function NewSupplierPage() {
  await requirePermission(PERMISSION_IDS.purchasingWrite);
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link href="/suppliers" className={buttonVariants({ variant: "ghost" })}>
          ← Proveedores
        </Link>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight">Nuevo proveedor</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          El código PROV-AAAA-##### se asigna al guardar.
        </p>
      </div>
      <SupplierForm mode="create" />
    </div>
  );
}
