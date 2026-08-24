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
import { buttonVariants } from "@/components/ui/button";
import { EmptyState, StatCard, StatRow } from "@/components/shared/ui-patterns";
import { PageHeader } from "@/components/layout/page-header";
import { Plus, Package, AlertTriangle, TrendingDown, Layers } from "lucide-react";
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
  const filtered = Boolean(q || category || criticalOnly);

  const result = await listMaterials({
    q: q?.trim() || undefined,
    category: category as any,
    critical: criticalOnly,
    page,
    pageSize,
  });

  // KPIs sobre la página actual (datos reales visibles)
  const totalCritical = result.rows.filter((m) => m.isCritical).length;
  const totalLowStock = result.rows.filter((m) => m.lowStock).length;
  const totalAvailable = result.rows.length - totalCritical;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Inventario"
        description="Materiales por almacén. Los críticos están bajo mínimo."
        actions={
          canWrite ? (
            <Link href="/inventory/materials/new" className={buttonVariants({ size: "sm" })}>
              <Plus className="mr-1 h-3.5 w-3.5" />
              Nuevo Material
            </Link>
          ) : null
        }
      />

      <StatRow>
        <StatCard label="En esta vista" value={result.rows.length} icon={<Layers className="h-4 w-4" />} />
        <StatCard label="Críticos" value={totalCritical} tone="red" icon={<AlertTriangle className="h-4 w-4" />} />
        <StatCard label="Bajo mínimo" value={totalLowStock} tone="amber" icon={<TrendingDown className="h-4 w-4" />} />
        <StatCard label="Total materiales" value={result.total} hint={`${result.pageCount} página(s)`} icon={<Package className="h-4 w-4" />} />
      </StatRow>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-card p-2">
        {[
          { label: "Todos", category: undefined, critical: false },
          { label: "Bajo mínimo / Críticos", category: undefined, critical: true },
          { label: "Materia Prima", category: "materia_prima", critical: false },
          { label: "Consumibles", category: "consumibles", critical: false },
          { label: "Herramientas", category: "herramientas", critical: false },
        ].map((f) => {
          const sp = new URLSearchParams();
          if (q) sp.set("q", q);
          if (f.category) sp.set("category", f.category);
          if (f.critical) sp.set("critical", "1");
          const s = sp.toString();
          const active = category === f.category && criticalOnly === f.critical;
          return (
            <Link
              key={f.label}
              href={s ? `/inventory?${s}` : "/inventory"}
              className={`rounded-md px-2.5 py-1 text-xs transition-colors ${
                active
                  ? f.critical
                    ? "bg-amber-100 font-medium text-amber-700"
                    : "bg-primary/10 font-medium text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {f.label}
            </Link>
          );
        })}
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
                <TableCell colSpan={6} className="py-8">
                  <EmptyState
                    icon={<Package className="h-8 w-8" />}
                    title={filtered ? "Sin resultados" : "Aún no hay materiales"}
                    description={
                      filtered
                        ? "Ajusta los filtros o la búsqueda para encontrar el material."
                        : "Registra tu primer material para empezar a controlar inventario."
                    }
                    action={
                      !filtered && canWrite ? (
                        <Link href="/inventory/materials/new" className={buttonVariants({ size: "sm" })}>
                          <Plus className="mr-1 h-3.5 w-3.5" />
                          Crear primer material
                        </Link>
                      ) : null
                    }
                  />
                </TableCell>
              </TableRow>
            ) : (
              result.rows.map((material) => (
                <TableRow key={material.id} className="hover:bg-muted/40">
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
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={`/inventory?page=${page - 1}${q ? `&q=${q}` : ""}${category ? `&category=${category}` : ""}${criticalOnly ? "&critical=1" : ""}`}
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                Anterior
              </Link>
            )}
            {page < result.pageCount && (
              <Link
                href={`/inventory?page=${page + 1}${q ? `&q=${q}` : ""}${category ? `&category=${category}` : ""}${criticalOnly ? "&critical=1" : ""}`}
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                Siguiente
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}