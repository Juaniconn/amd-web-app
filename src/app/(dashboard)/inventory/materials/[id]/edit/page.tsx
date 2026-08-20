import Link from "next/link";
import { notFound } from "next/navigation";
import { MaterialForm } from "@/features/inventory/material-form";
import { buttonVariants } from "@/components/ui/button";
import { requirePermission } from "@/lib/auth/session";
import { inputQty } from "@/lib/inventory/catalog";
import { PERMISSION_IDS } from "@/lib/permissions/catalog";
import { getMaterialById, listUnitsOfMeasure, listWarehouses } from "@/server/services/inventory";
import { listActiveSuppliers, listAllSupplierMaterials } from "@/server/services/purchasing";
import { listBranches } from "@/server/services/branches";

export default async function EditMaterialPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermission(PERMISSION_IDS.inventoryWrite);
  const { id } = await params;
  const material = await getMaterialById(id);
  if (!material) notFound();
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
          <h2 className="text-2xl font-semibold tracking-tight">
            Editar {material.code}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Categoría, unidad y almacén no se cambian después del alta.
          </p>
        </div>
        <Link
          href={`/inventory/materials/${material.id}`}
          className={buttonVariants({ variant: "outline" })}
        >
          Volver
        </Link>
      </div>
      <MaterialForm
        mode="edit"
        materialId={material.id}
        units={units}
        warehouses={warehouses}
        branches={branches}
        suppliers={suppliers}
        supplierMaterials={supplierMaterials}
        defaultValues={{
          description: material.description,
          category: material.category,
          unitId: material.unitId,
          warehouseId: material.warehouseId,
          branchId: material.branchId ?? "",
          isCritical: material.isCritical,
          active: material.active,
          minStock: material.minStock ? inputQty(material.minStock) : undefined,
          notes: material.notes ?? "",
          grade: material.grade ?? "",
          thicknessIn: material.thicknessIn ?? undefined,
          costPerKg: material.costPerKg ?? undefined,
          sheetWidthIn: material.sheetWidthIn ?? undefined,
          sheetLengthIn: material.sheetLengthIn ?? undefined,
          densityGCm3: material.densityGCm3 ?? undefined,
          supplierId: material.supplierId ?? "",
          supplierMaterialId: material.supplierMaterialId ?? "",
          usedInCalculator: material.usedInCalculator,
        }}
      />
    </div>
  );
}
