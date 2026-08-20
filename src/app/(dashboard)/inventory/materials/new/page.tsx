import Link from "next/link";
import { MaterialForm } from "@/features/inventory/material-form";
import { buttonVariants } from "@/components/ui/button";
import { requirePermission } from "@/lib/auth/session";
import { PERMISSION_IDS } from "@/lib/permissions/catalog";
import { listUnitsOfMeasure, listWarehouses } from "@/server/services/inventory";
import { listActiveSuppliers, listAllSupplierMaterials } from "@/server/services/purchasing";
import { listBranches } from "@/server/services/branches";

export default async function NewMaterialPage() {
  await requirePermission(PERMISSION_IDS.inventoryWrite);
  const [units, warehouses, branches, suppliers, supplierMaterials] = await Promise.all([
    listUnitsOfMeasure(),
    listWarehouses(),
    listBranches({ activeOnly: true }),
    listActiveSuppliers(),
    listAllSupplierMaterials(),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Nuevo material</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            El código MAT-YYYY-NNNNN se asigna al guardar. Elige sucursal, almacén y, si aplica,
            la partida del proveedor.
          </p>
        </div>
        <Link href="/inventory" className={buttonVariants({ variant: "outline" })}>
          Volver
        </Link>
      </div>
      <MaterialForm
        mode="create"
        units={units}
        warehouses={warehouses}
        branches={branches}
        suppliers={suppliers}
        supplierMaterials={supplierMaterials}
      />
    </div>
  );
}
