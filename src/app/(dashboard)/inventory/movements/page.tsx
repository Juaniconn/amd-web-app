import Link from "next/link";
import { EmptyTable, TableCard, TablePager } from "@/components/layout/data-table";
import { PageHeader } from "@/components/layout/page-header";
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
import { displayQty } from "@/lib/inventory/catalog";
import { PERMISSION_IDS } from "@/lib/permissions/catalog";
import { listMovements } from "@/server/services/inventory";
import { parsePage, parsePageSize } from "@/lib/ui/pagination";

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function InventoryMovementsPage({
  searchParams,
}: {
  searchParams: Promise<{
    materialId?: string | string[];
    page?: string | string[];
    perPage?: string | string[];
  }>;
}) {
  await requirePermission(PERMISSION_IDS.inventoryRead);
  const params = await searchParams;
  const materialId = first(params.materialId);
  const page = parsePage(first(params.page));
  const pageSize = parsePageSize(first(params.perPage));
  const result = await listMovements({ materialId, page, pageSize });

  const query = new URLSearchParams();
  if (materialId) query.set("materialId", materialId);
  query.set("perPage", String(pageSize));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Movimientos"
        description="Auditoría de existencias. Un error se corrige con el movimiento inverso."
        actions={
          <Link href="/inventory" className={buttonVariants({ variant: "outline" })}>
            Inventario
          </Link>
        }
      />

      <TableCard>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Material</TableHead>
              <TableHead>Cantidad</TableHead>
              <TableHead>OT</TableHead>
              <TableHead>Motivo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {result.rows.length === 0 ? (
              <EmptyTable
                colSpan={6}
                title="Aún no hay movimientos."
                description="Las recepciones, reservas y consumos quedan registrados aquí."
                href="/inventory"
                actionLabel="Ver inventario"
              />
            ) : (
              result.rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{row.createdAt.toLocaleString("es-MX")}</TableCell>
                  <TableCell>{row.typeLabel}</TableCell>
                  <TableCell>
                    <Link
                      href={`/inventory/materials/${row.materialId}`}
                      className="hover:underline"
                    >
                      {row.materialCode}
                    </Link>
                  </TableCell>
                  <TableCell>
                    {displayQty(row.quantity)} {row.unitCode}
                  </TableCell>
                  <TableCell>
                    {row.productionOrderId && row.productionOrderNumber ? (
                      <Link
                        href={`/production/${row.productionOrderId}`}
                        className="hover:underline"
                      >
                        {row.productionOrderNumber}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>{row.reason ?? "—"}</TableCell>
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
        label={result.total === 1 ? "movimiento" : "movimientos"}
        path="/inventory/movements"
        query={query}
        pageSize={pageSize}
      />
    </div>
  );
}
