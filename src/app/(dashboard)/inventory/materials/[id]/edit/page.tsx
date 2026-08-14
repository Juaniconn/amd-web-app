import Link from "next/link";
import { notFound } from "next/navigation";
import { MaterialForm } from "@/features/inventory/material-form";
import { buttonVariants } from "@/components/ui/button";
import { requirePermission } from "@/lib/auth/session";
import { PERMISSION_IDS } from "@/lib/permissions/catalog";
import { getMaterialById, listUnitsOfMeasure } from "@/server/services/inventory";

export default async function EditMaterialPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermission(PERMISSION_IDS.inventoryWrite);
  const { id } = await params;
  const material = await getMaterialById(id);
  if (!material) notFound();
  const units = await listUnitsOfMeasure();

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
        defaultValues={{
          description: material.description,
          category: material.category,
          unitId: material.unitId,
          isCritical: material.isCritical,
          active: material.active,
          minStock: material.minStock ?? undefined,
          notes: material.notes ?? "",
        }}
      />
    </div>
  );
}
