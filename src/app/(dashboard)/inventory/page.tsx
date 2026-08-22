import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Package, AlertTriangle, Box } from "lucide-react";
import { requirePermission } from "@/lib/auth/session";
import { PERMISSION_IDS } from "@/lib/permissions/catalog";
import {
  displayQty,
  MATERIAL_CATEGORY_LABELS,
} from "@/lib/inventory/catalog";
import { listMaterials } from "@/server/services/inventory";

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string | string[];
    category?: string | string[];
    critical?: string | string[];
    page?: string | string[];
    perPage?: string | string[];
  }>;
}) {
  const { access } = await requirePermission(PERMISSION_IDS.inventoryRead);
  const params = await searchParams;
  const q = Array.isArray(params.q) ? params.q[0] : params.q;
  const category = Array.isArray(params.category) ? params.category[0] : params.category;
  const criticalOnly = (Array.isArray(params.critical) ? params.critical[0] : params.critical) === "1";
  const page = Number(Array.isArray(params.page) ? params.page[0] : params.page) || 1;
  const pageSize = Number(Array.isArray(params.perPage) ? params.perPage[0] : params.perPage) || 20;

  const canWrite = access.permissions.includes(PERMISSION_IDS.inventoryWrite);

  const result = await listMaterials({
    q: q?.trim() || undefined,
    category: category as any,
    critical: criticalOnly,
    page,
    pageSize,
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Inventario</h1>
          <p className="text-xs text-muted-foreground">
            {result.total} materiales · {result.rows.filter((m) => m.isCritical).length} críticos
          </p>
        </div>
        {canWrite && (
          <Link href="/inventory/materials/new" className="inline-flex items-center justify-center gap-1 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            <Plus className="h-3 w-3" />
            Nuevo Material
          </Link>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 rounded-md border bg-card p-2">
        <button className={`rounded px-2 py-1 text-xs ${!category && !criticalOnly ? "bg-muted" : "hover:bg-muted"}`}>
          Todos
        </button>
        <button className={`rounded px-2 py-1 text-xs ${criticalOnly ? "bg-muted" : "hover:bg-muted"}`}>
          Críticos
        </button>
        <button className={`rounded px-2 py-1 text-xs ${category === "materia_prima" ? "bg-muted" : "hover:bg-muted"}`}>
          Materia Prima
        </button>
        <button className={`rounded px-2 py-1 text-xs ${category === "consumibles" ? "bg-muted" : "hover:bg-muted"}`}>
          Consumibles
        </button>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Material</TableHead>
              <TableHead>Código</TableHead>
              <TableHead>Disponible</TableHead>
              <TableHead>Reservado</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Categoría</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {result.rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-12 text-center">
                  <Package className="mx-auto h-8 w-8 text-muted-foreground" />
                  <p className="mt-2 text-sm text-muted-foreground">
                    {q ? "No se encontraron resultados" : "Aún no hay materiales"}
                  </p>
                  {!q && canWrite && (
                    <Link href="/inventory/materials/new" className="mt-2 inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground hover:bg-primary/90">
                      <Plus className="h-3 w-3" />
                      Crear primer material
                    </Link>
                  )}
                </TableCell>
              </TableRow>
            ) : (
              result.rows.map((material) => (
                <TableRow key={material.id}>
                  <TableCell>
                    <Link href={`/inventory/materials/${material.id}`} className="font-medium hover:underline">
                      {material.description}
                    </Link>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{material.code}</TableCell>
                  <TableCell>
                    <span className="font-medium">{displayQty(material.onHand)}</span>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {displayQty(material.reserved)}
                  </TableCell>
                  <TableCell>
                    {material.isCritical ? (
                      <Badge variant="destructive" className="gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        Crítico
                      </Badge>
                    ) : (
                      <Badge variant="outline">Normal</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px]">
                      {MATERIAL_CATEGORY_LABELS[material.category as keyof typeof MATERIAL_CATEGORY_LABELS]}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {result.pageCount > 1 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{result.total} resultados · Página {page} de {result.pageCount}</span>
        </div>
      )}
    </div>
  );
}
