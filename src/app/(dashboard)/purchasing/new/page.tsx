import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { PurchaseOrderForm } from "@/features/purchasing/purchase-order-form";
import { requirePermission } from "@/lib/auth/session";
import { PERMISSION_IDS } from "@/lib/permissions/catalog";
import { listBranches } from "@/server/services/branches";
import { listActiveMaterialsForSelect } from "@/server/services/inventory";
import { listActiveSuppliers } from "@/server/services/purchasing";

export default async function NewPurchaseOrderPage() {
  await requirePermission(PERMISSION_IDS.purchasingWrite);
  const [suppliers, branches, materials] = await Promise.all([
    listActiveSuppliers(),
    listBranches({ activeOnly: true }),
    listActiveMaterialsForSelect(),
  ]);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <Link href="/purchasing" className={buttonVariants({ variant: "ghost" })}>
          ← Compras
        </Link>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight">Nueva orden de compra</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          El folio OC-AAAA-##### se asigna al guardar. La recepción posterior entra a inventario.
        </p>
      </div>
      {suppliers.length === 0 || materials.length === 0 ? (
        <p className="rounded-lg border bg-muted/40 px-4 py-3 text-sm">
          Necesitas al menos un proveedor activo y un material activo para crear una OC.
          {suppliers.length === 0 ? (
            <>
              {" "}
              <Link href="/suppliers/new" className="underline">
                Alta de proveedor
              </Link>
              .
            </>
          ) : null}
          {materials.length === 0 ? (
            <>
              {" "}
              <Link href="/inventory/materials/new" className="underline">
                Alta de material
              </Link>
              .
            </>
          ) : null}
        </p>
      ) : (
        <PurchaseOrderForm
          mode="create"
          suppliers={suppliers}
          branches={branches}
          materials={materials}
        />
      )}
    </div>
  );
}
