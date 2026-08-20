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
import { BRANCH_STATUS_LABELS } from "@/lib/branches/catalog";
import { PERMISSION_IDS } from "@/lib/permissions/catalog";
import { requirePermission } from "@/lib/auth/session";
import {
  firstSearchParam,
  paginateRows,
  parsePage,
  parsePageSize,
} from "@/lib/ui/pagination";
import { listBranches } from "@/server/services/branches";

export default async function BranchesPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string | string[];
    page?: string | string[];
    perPage?: string | string[];
  }>;
}) {
  const { access } = await requirePermission(PERMISSION_IDS.branchesRead);
  const canWrite = access.permissions.includes(PERMISSION_IDS.branchesWrite);
  const params = await searchParams;
  const q = firstSearchParam(params.q)?.trim() || undefined;
  const page = parsePage(firstSearchParam(params.page));
  const pageSize = parsePageSize(firstSearchParam(params.perPage));
  const rows = await listBranches();
  const needle = q?.toLowerCase();
  const filtered = needle
    ? rows.filter((row) =>
        [row.code, row.name, row.city, row.country, row.phone]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(needle),
      )
    : rows;
  const result = paginateRows(filtered, page, pageSize);
  const query = new URLSearchParams();
  if (q) query.set("q", q);
  query.set("perPage", String(pageSize));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Sucursales</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Plazas oficiales de AMD México. Dirección y teléfono se capturan aquí y
            salen en la cotización.
          </p>
        </div>
        {canWrite ? (
          <Link href="/settings/branches/new" className={buttonVariants()}>
            Nueva sucursal
          </Link>
        ) : null}
      </div>
      <ListSearchForm
        action="/settings/branches"
        q={q}
        perPage={pageSize}
        placeholder="Código, nombre o ciudad"
      />
      <TableCard>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Ciudad</TableHead>
              <TableHead>País</TableHead>
              <TableHead>Teléfono</TableHead>
              <TableHead>Estatus</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {result.rows.length === 0 ? (
              <EmptyTable
                colSpan={6}
                title={q ? "No hay sucursales con esos filtros." : "Aún no hay sucursales."}
                description={
                  q
                    ? "Prueba otra búsqueda o limpia los filtros."
                    : "Crea Ciudad Juárez, Guadalajara y El Paso."
                }
                href={!q && canWrite ? "/settings/branches/new" : undefined}
                actionLabel="Nueva sucursal"
              />
            ) : (
              result.rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">
                    <Link href={`/settings/branches/${row.id}`} className="hover:underline">
                      {row.code}
                    </Link>
                  </TableCell>
                  <TableCell>
                    {row.name}
                    {row.isOfficialSeed ? (
                      <Badge variant="outline" className="ml-2">
                        Oficial
                      </Badge>
                    ) : null}
                  </TableCell>
                  <TableCell>{row.city || "—"}</TableCell>
                  <TableCell>{row.country}</TableCell>
                  <TableCell>{row.phone || "—"}</TableCell>
                  <TableCell>
                    <Badge variant={row.status === "activo" ? "secondary" : "outline"}>
                      {BRANCH_STATUS_LABELS[row.status]}
                    </Badge>
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
        label={result.total === 1 ? "sucursal" : "sucursales"}
        path="/settings/branches"
        query={query}
        pageSize={pageSize}
      />
    </div>
  );
}
