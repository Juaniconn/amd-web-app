import Link from "next/link";
import { InventoryFilters } from "@/features/inventory/inventory-filters";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { KpiCard } from "@/components/dashboard/kpi-card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requirePermission } from "@/lib/auth/session";
import {
  displayQty,
  MATERIAL_CATEGORY_LABELS,
  type MaterialCategory,
} from "@/lib/inventory/catalog";
import { PERMISSION_IDS } from "@/lib/permissions/catalog";
import { materialCategorySchema } from "@/lib/validation/inventory";
import { getInventoryDashboardStats } from "@/server/services/inventory-kpis";
import { listMaterials, listWarehouses } from "@/server/services/inventory";

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string | string[];
    category?: string | string[];
    critical?: string | string[];
    page?: string | string[];
  }>;
}) {
  const { access } = await requirePermission(PERMISSION_IDS.inventoryRead);
  const params = await searchParams;
  const q = first(params.q)?.trim() || undefined;
  const categoryParsed = materialCategorySchema.safeParse(first(params.category));
  const critical = first(params.critical) === "1";
  const page = Number(first(params.page) ?? "1") || 1;
  const canWrite = access.permissions.includes(PERMISSION_IDS.inventoryWrite);
  const stats = await getInventoryDashboardStats();
  const warehouses = await listWarehouses();
  const result = await listMaterials({
    q,
    category: categoryParsed.success ? categoryParsed.data : undefined,
    critical: critical || undefined,
    page,
  });

  const query = new URLSearchParams();
  if (q) query.set("q", q);
  if (categoryParsed.success) query.set("category", categoryParsed.data);
  if (critical) query.set("critical", "1");

  function pageHref(nextPage: number) {
    const next = new URLSearchParams(query);
    next.set("page", String(nextPage));
    return `/inventory?${next.toString()}`;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Inventario</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Inventario Simple v1. Sin lotes, series ni certificados. Los registros
            DEMO no son stock real de AMD.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/inventory/movements" className={buttonVariants({ variant: "outline" })}>
            Movimientos
          </Link>
          {canWrite ? (
            <Link href="/inventory/materials/new" className={buttonVariants()}>
              Nuevo material
            </Link>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <KpiCard
          label="Ítems con existencia"
          value={String(stats.itemsWithStock)}
          hint="Saldos con cantidad mayor a 0 (no se suman unidades distintas)"
        />
        <KpiCard
          label="Crítico bajo stock"
          value={String(stats.criticalLowStock)}
          hint="Disponible ≤ stock mínimo"
        />
        <KpiCard
          label="Material reservado"
          value={String(stats.reservedLines)}
          hint="Saldos con reserva activa"
        />
        <KpiCard
          label="Consumos del día"
          value={String(stats.consumedToday)}
          hint="Movimientos tipo consumo"
        />
        <KpiCard
          label="Movimientos del día"
          value={String(stats.movementsToday)}
          hint="Todos los tipos"
        />
        <KpiCard
          label="Ajustes del día"
          value={String(stats.adjustmentsToday)}
          hint="Señal de control, no de éxito"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {warehouses.map((warehouse) => (
          <div key={warehouse.id} className="rounded-lg border px-4 py-3">
            <p className="text-sm font-medium">{warehouse.name}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {warehouse.description}
            </p>
          </div>
        ))}
      </div>

      <InventoryFilters
        q={q}
        category={categoryParsed.success ? categoryParsed.data : undefined}
        critical={critical}
      />

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead>Almacén</TableHead>
              <TableHead>Existencia</TableHead>
              <TableHead>Reservado</TableHead>
              <TableHead>Disponible</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {result.rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-muted-foreground">
                  No hay materiales con esos filtros.
                </TableCell>
              </TableRow>
            ) : (
              result.rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <Link
                      href={`/inventory/materials/${row.id}`}
                      className="font-medium hover:underline"
                    >
                      {row.code}
                    </Link>
                    {row.isDemo ? (
                      <Badge variant="outline" className="ml-2">
                        DEMO
                      </Badge>
                    ) : null}
                    {row.isCritical ? (
                      <Badge variant="secondary" className="ml-2">
                        Crítico
                      </Badge>
                    ) : null}
                    {row.lowStock ? (
                      <Badge variant="destructive" className="ml-2">
                        Bajo stock
                      </Badge>
                    ) : null}
                  </TableCell>
                  <TableCell>{row.description}</TableCell>
                  <TableCell>
                    {MATERIAL_CATEGORY_LABELS[row.category as MaterialCategory]}
                  </TableCell>
                  <TableCell>{row.warehouseName}</TableCell>
                  <TableCell>
                    {displayQty(row.onHand)} {row.unitCode}
                  </TableCell>
                  <TableCell>{displayQty(row.reserved)}</TableCell>
                  <TableCell>{displayQty(row.available)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <p>
          {result.total} registro{result.total === 1 ? "" : "s"} · página {result.page}{" "}
          de {result.pageCount}
        </p>
        <div className="flex gap-2">
          {result.page > 1 ? (
            <Link href={pageHref(result.page - 1)} className={buttonVariants({ variant: "outline" })}>
              Anterior
            </Link>
          ) : null}
          {result.page < result.pageCount ? (
            <Link href={pageHref(result.page + 1)} className={buttonVariants({ variant: "outline" })}>
              Siguiente
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
