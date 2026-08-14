import Link from "next/link";
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

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function InventoryMovementsPage({
  searchParams,
}: {
  searchParams: Promise<{
    materialId?: string | string[];
    page?: string | string[];
  }>;
}) {
  await requirePermission(PERMISSION_IDS.inventoryRead);
  const params = await searchParams;
  const materialId = first(params.materialId);
  const page = Number(first(params.page) ?? "1") || 1;
  const result = await listMovements({ materialId, page });

  function pageHref(nextPage: number) {
    const next = new URLSearchParams();
    if (materialId) next.set("materialId", materialId);
    next.set("page", String(nextPage));
    return `/inventory/movements?${next.toString()}`;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Movimientos</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Auditoría de existencias. No se borran; un error se corrige con el
            movimiento inverso.
          </p>
        </div>
        <Link href="/inventory" className={buttonVariants({ variant: "outline" })}>
          Volver
        </Link>
      </div>

      <div className="overflow-x-auto rounded-lg border">
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
              <TableRow>
                <TableCell colSpan={6} className="text-muted-foreground">
                  Sin movimientos.
                </TableCell>
              </TableRow>
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
