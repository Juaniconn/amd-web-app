import Link from "next/link";
import { notFound } from "next/navigation";
import { StockMovementForms } from "@/features/inventory/stock-movement-forms";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard, StatRow } from "@/components/shared/ui-patterns";
import { requirePermission } from "@/lib/auth/session";
import {
  displayQty,
  MATERIAL_CATEGORY_LABELS,
} from "@/lib/inventory/catalog";
import { PERMISSION_IDS } from "@/lib/permissions/catalog";
import { getMaterialById, listMovements } from "@/server/services/inventory";
import { Package, AlertTriangle } from "lucide-react";

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-sm">{value || "—"}</p>
    </div>
  );
}

export default async function MaterialDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { access } = await requirePermission(PERMISSION_IDS.inventoryRead);
  const { id } = await params;
  const material = await getMaterialById(id);
  if (!material) notFound();
  const movements = await listMovements({ materialId: material.id, page: 1 });
  const canWrite = access.permissions.includes(PERMISSION_IDS.inventoryWrite);
  const canAdjust = access.permissions.includes(PERMISSION_IDS.inventoryAdjust);

  return (
    <div className="space-y-4">
      <PageHeader
        title={material.code}
        description={material.description || MATERIAL_CATEGORY_LABELS[material.category]}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href="/inventory" className={buttonVariants({ variant: "outline", size: "sm" })}>
              Volver
            </Link>
            {canAdjust ? (
              <Link
                href={`/inventory/materials/${material.id}/edit`}
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                Editar
              </Link>
            ) : null}
          </div>
        }
      />

      <StatRow>
        <StatCard label="Categoría" value={MATERIAL_CATEGORY_LABELS[material.category]} icon={<Package className="h-4 w-4" />} />
        <StatCard label="Stock" value={`${material.onHand} ${material.unitCode ?? ""}`} tone={Number(material.onHand) <= Number(material.minStock ?? 0) ? "amber" : "green"} />
        <StatCard label="Movimientos" value={movements.total} />
        {material.isCritical ? <StatCard label="Crítico" value="Sí" tone="red" icon={<AlertTriangle className="h-4 w-4" />} /> : null}
      </StatRow>

      <Card>
        <CardHeader>
          <CardTitle>Información del material</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Código" value={material.code} />
          <Field label="Descripción" value={material.description} />
          <Field label="Unidad" value={material.unitCode} />
          <Field label="Stock" value={`${material.onHand} ${material.unitCode ?? ""}`} />
          <Field label="Punto de reorden" value={material.minStock ? `${material.minStock} ${material.unitCode ?? ""}` : null} />
          <Field label="Costo por kg" value={material.costPerKg ? `$${material.costPerKg}` : null} />
          <Field label="Categoría" value={MATERIAL_CATEGORY_LABELS[material.category]} />
          <Field label="Estado" value={material.active ? "Activo" : "Inactivo"} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Movimientos</CardTitle>
        </CardHeader>
        <CardContent>
          <StockMovementForms materialId={material.id} canWrite={canWrite} canAdjust={canAdjust} />
        </CardContent>
      </Card>
    </div>
  );
}
