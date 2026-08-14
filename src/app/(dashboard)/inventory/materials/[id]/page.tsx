import Link from "next/link";
import { notFound } from "next/navigation";
import { StockMovementForms } from "@/features/inventory/stock-movement-forms";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePermission } from "@/lib/auth/session";
import {
  displayQty,
  MATERIAL_CATEGORY_LABELS,
} from "@/lib/inventory/catalog";
import { PERMISSION_IDS } from "@/lib/permissions/catalog";
import { getMaterialById, listMovements } from "@/server/services/inventory";

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
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Material
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <h2 className="text-2xl font-semibold tracking-tight">{material.code}</h2>
            <Badge variant="secondary">
              {MATERIAL_CATEGORY_LABELS[material.category]}
            </Badge>
            {material.isCritical ? <Badge>Crítico</Badge> : null}
            {material.isDemo ? <Badge variant="outline">DEMO</Badge> : null}
            {!material.active ? <Badge variant="outline">Inactivo</Badge> : null}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{material.description}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/inventory" className={buttonVariants({ variant: "outline" })}>
            Volver
          </Link>
          {canWrite ? (
            <Link
              href={`/inventory/materials/${material.id}/edit`}
              className={buttonVariants({ variant: "outline" })}
            >
              Editar
            </Link>
          ) : null}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Existencias</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Almacén" value={material.warehouseName} />
          <Field
            label="Existencia"
            value={`${displayQty(material.onHand)} ${material.unitCode}`}
          />
          <Field
            label="Reservado"
            value={`${displayQty(material.reserved)} ${material.unitCode}`}
          />
          <Field
            label="Disponible"
            value={`${displayQty(material.available)} ${material.unitCode}`}
          />
          <Field
            label="Stock mínimo"
            value={material.minStock ? displayQty(material.minStock) : "—"}
          />
          <Field label="Observaciones" value={material.notes} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Movimientos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <StockMovementForms
            materialId={material.id}
            canWrite={canWrite}
            canAdjust={canAdjust}
          />
          {movements.rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin movimientos.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {movements.rows.map((row) => (
                <li key={row.id} className="rounded-lg border px-3 py-2">
                  {row.createdAt.toLocaleString("es-MX")} · {row.typeLabel} ·{" "}
                  {displayQty(row.quantity)} {row.unitCode}
                  {row.productionOrderNumber ? ` · ${row.productionOrderNumber}` : ""}
                  {row.reason ? ` · ${row.reason}` : ""}
                </li>
              ))}
            </ul>
          )}
          {movements.total > movements.rows.length ? (
            <Link
              href={`/inventory/movements?materialId=${material.id}`}
              className="text-sm hover:underline"
            >
              Ver todos
            </Link>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
