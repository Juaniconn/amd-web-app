import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { EmptyTable, TableCard, TablePager } from "@/components/layout/data-table";
import { ListSearchForm } from "@/components/layout/list-search-form";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requirePermission } from "@/lib/auth/session";
import { PERMISSION_IDS } from "@/lib/permissions/catalog";
import {
  SUPPLIER_STATUS_LABELS,
  type SupplierStatus,
} from "@/lib/purchasing/catalog";
import { firstSearchParam, parsePage, parsePageSize } from "@/lib/ui/pagination";
import { listSuppliers } from "@/server/services/purchasing";

export default async function SuppliersPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string | string[];
    calculator?: string | string[];
    page?: string | string[];
    perPage?: string | string[];
  }>;
}) {
  const { access } = await requirePermission(PERMISSION_IDS.purchasingRead);
  const canWrite = access.permissions.includes(PERMISSION_IDS.purchasingWrite);
  const params = await searchParams;
  const q = firstSearchParam(params.q)?.trim() || undefined;
  const calculator = firstSearchParam(params.calculator) === "1";
  const page = parsePage(firstSearchParam(params.page));
  const pageSize = parsePageSize(firstSearchParam(params.perPage));
  const result = await listSuppliers({
    q,
    calculator: calculator || undefined,
    page,
    pageSize,
  });
  const query = new URLSearchParams();
  if (q) query.set("q", q);
  if (calculator) query.set("calculator", "1");
  query.set("perPage", String(pageSize));
  const filtered = Boolean(q || calculator);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Proveedores</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Maestro de proveedores de AMD México. Las partidas de material alimentan la calculadora.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/purchasing" className={buttonVariants({ variant: "outline" })}>
            Órdenes de compra
          </Link>
          {canWrite ? (
            <Link href="/suppliers/new" className={buttonVariants()}>
              Nuevo proveedor
            </Link>
          ) : null}
        </div>
      </div>
      <ListSearchForm
        action="/suppliers"
        q={q}
        perPage={pageSize}
        placeholder="Código, proveedor o RFC"
      />
      <TableCard>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Proveedor</TableHead>
              <TableHead>RFC</TableHead>
              <TableHead>Contacto</TableHead>
              <TableHead>Estatus</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {result.rows.length === 0 ? (
              <EmptyTable
                colSpan={5}
                title={filtered ? "No hay proveedores con esos filtros." : "Aún no hay proveedores."}
                description={
                  filtered
                    ? "Prueba otra búsqueda o limpia los filtros."
                    : "Alta el primero para comenzar a emitir órdenes de compra."
                }
                href={!filtered && canWrite ? "/suppliers/new" : undefined}
                actionLabel="Capturar proveedor"
              />
            ) : (
              result.rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-mono text-xs">{row.code}</TableCell>
                  <TableCell>
                    <Link href={`/suppliers/${row.id}`} className="font-medium hover:underline">
                      {row.legalName}
                    </Link>
                    {row.isDemo ? (
                      <Badge variant="outline" className="ml-2">
                        DEMO
                      </Badge>
                    ) : null}
                    {row.usedInCalculator ? (
                      <Badge variant="outline" className="ml-2">
                        Calculadora
                      </Badge>
                    ) : null}
                  </TableCell>
                  <TableCell>{row.rfc ?? "—"}</TableCell>
                  <TableCell>{row.contactName ?? row.phone ?? "—"}</TableCell>
                  <TableCell>
                    {SUPPLIER_STATUS_LABELS[row.status as SupplierStatus]}
                  </TableCell>
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
        label={result.total === 1 ? "proveedor" : "proveedores"}
        path="/suppliers"
        query={query}
        pageSize={pageSize}
      />
    </div>
  );
}
