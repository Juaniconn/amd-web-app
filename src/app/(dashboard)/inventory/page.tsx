import Link from "next/link";
import { InventoryFilters } from "@/features/inventory/inventory-filters";
import { EmptyTable, TableCard, TablePager } from "@/components/layout/data-table";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
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
import { listMaterials, listWarehouses } from "@/server/services/inventory";
import { listPurchaseOrdersPendingReceive } from "@/server/services/purchasing";
import { parsePage, parsePageSize } from "@/lib/ui/pagination";
import {
  PURCHASE_ORDER_STATUS_LABELS,
  type PurchaseOrderStatus,
} from "@/lib/purchasing/catalog";

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
    calculator?: string | string[];
    page?: string | string[];
    perPage?: string | string[];
  }>;
}) {
  const { access } = await requirePermission(PERMISSION_IDS.inventoryRead);
  const params = await searchParams;
  const q = first(params.q)?.trim() || undefined;
  const categoryParsed = materialCategorySchema.safeParse(first(params.category));
  const critical = first(params.critical) === "1";
  const calculator = first(params.calculator) === "1";
  const page = parsePage(first(params.page));
  const pageSize = parsePageSize(first(params.perPage));
  const canWrite = access.permissions.includes(PERMISSION_IDS.inventoryWrite);
  const filtered = Boolean(q || categoryParsed.success || critical || calculator);
  const warehouses = await listWarehouses();
  const pendingReceipts = await listPurchaseOrdersPendingReceive();
  const result = await listMaterials({
    q,
    category: categoryParsed.success ? categoryParsed.data : undefined,
    critical: critical || undefined,
    calculator: calculator || undefined,
    page,
    pageSize,
  });

  const query = new URLSearchParams();
  if (q) query.set("q", q);
  if (categoryParsed.success) query.set("category", categoryParsed.data);
  if (critical) query.set("critical", "1");
  if (calculator) query.set("calculator", "1");
  query.set("perPage", String(pageSize));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventario"
        description="Existencias por almacén. Sin lotes ni series. La recepción de compras entra aquí."
        actions={
          <>
            <Link href="/inventory/movements" className={buttonVariants({ variant: "outline" })}>
              Movimientos
            </Link>
            {canWrite ? (
              <Link href="/inventory/materials/new" className={buttonVariants()}>
                Nuevo material
              </Link>
            ) : null}
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {warehouses.map((warehouse) => (
          <div key={warehouse.id} className="rounded-lg border bg-card px-4 py-3">
            <p className="text-sm font-medium">{warehouse.name}</p>
            <p className="mt-1 text-xs text-muted-foreground">{warehouse.description}</p>
          </div>
        ))}
      </div>

      {pendingReceipts.length > 0 ? (
        <div className="space-y-3 rounded-xl border bg-card p-4 shadow-sm">
          <div>
            <p className="text-sm font-medium">Recepciones pendientes</p>
            <p className="text-xs text-muted-foreground">
              Órdenes de compra enviadas. Confirma la entrada del material aquí.
            </p>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>OC</TableHead>
                <TableHead>Proveedor</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendingReceipts.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <Link
                      href={`/inventory/receipts/${row.id}`}
                      className="font-medium hover:underline"
                    >
                      {row.number}
                    </Link>
                  </TableCell>
                  <TableCell>
                    {row.supplierCode} · {row.supplierName}
                  </TableCell>
                  <TableCell>
                    {PURCHASE_ORDER_STATUS_LABELS[row.status as PurchaseOrderStatus]}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : null}

      <InventoryFilters
        q={q}
        category={categoryParsed.success ? categoryParsed.data : undefined}
        critical={critical}
        perPage={pageSize}
      />

      <TableCard>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead>Sucursal</TableHead>
              <TableHead>Almacén</TableHead>
              <TableHead>Existencia</TableHead>
              <TableHead>Reservado</TableHead>
              <TableHead>Disponible</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {result.rows.length === 0 ? (
              <EmptyTable
                colSpan={8}
                title={
                  filtered ? "No hay materiales con esos filtros." : "Aún no hay materiales."
                }
                description={
                  filtered
                    ? "Prueba otra categoría o limpia los filtros."
                    : "Da de alta materia prima, consumibles o producto terminado."
                }
                href={!filtered && canWrite ? "/inventory/materials/new" : undefined}
                actionLabel="Nuevo material"
              />
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
                    {row.usedInCalculator ? (
                      <Badge variant="outline" className="ml-2">
                        Calculadora
                      </Badge>
                    ) : null}
                  </TableCell>
                  <TableCell>{row.description}</TableCell>
                  <TableCell>
                    {MATERIAL_CATEGORY_LABELS[row.category as MaterialCategory]}
                  </TableCell>
                  <TableCell>{row.branchName ?? "—"}</TableCell>
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
      </TableCard>

      <TablePager
        total={result.total}
        page={result.page}
        pageCount={result.pageCount}
        label={result.total === 1 ? "material" : "materiales"}
        path="/inventory"
        query={query}
        pageSize={pageSize}
      />
    </div>
  );
}
