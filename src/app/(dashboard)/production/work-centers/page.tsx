import Link from "next/link";
import { WorkCenterForm } from "@/features/production/work-center-form";
import { EmptyTable, TableCard, TablePager } from "@/components/layout/data-table";
import { ListSearchForm } from "@/components/layout/list-search-form";
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
import { PERMISSION_IDS } from "@/lib/permissions/catalog";
import {
  firstSearchParam,
  paginateRows,
  parsePage,
  parsePageSize,
} from "@/lib/ui/pagination";
import { listWorkCenters } from "@/server/services/production-catalogs";

export default async function WorkCentersPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string | string[];
    page?: string | string[];
    perPage?: string | string[];
  }>;
}) {
  const { access } = await requirePermission(PERMISSION_IDS.productionView);
  const canUpdate = access.permissions.includes(PERMISSION_IDS.productionUpdate);
  const params = await searchParams;
  const q = firstSearchParam(params.q)?.trim() || undefined;
  const page = parsePage(firstSearchParam(params.page));
  const pageSize = parsePageSize(firstSearchParam(params.perPage));
  const centers = await listWorkCenters();
  const needle = q?.toLowerCase();
  const filtered = needle
    ? centers.filter((center) =>
        [center.code, center.name].join(" ").toLowerCase().includes(needle),
      )
    : centers;
  const result = paginateRows(filtered, page, pageSize);
  const query = new URLSearchParams();
  if (q) query.set("q", q);
  query.set("perPage", String(pageSize));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Centros de trabajo"
        description="Catálogo de piso. CNC, láser, tornos y el resto se administran aquí."
        actions={
          <Link href="/production" className={buttonVariants({ variant: "outline" })}>
            Producción
          </Link>
        }
      />
      {canUpdate ? <WorkCenterForm /> : null}
      <ListSearchForm
        action="/production/work-centers"
        q={q}
        perPage={pageSize}
        placeholder="Código o nombre"
      />
      <TableCard>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Orden</TableHead>
              <TableHead>Activo</TableHead>
              {canUpdate ? <TableHead>Editar</TableHead> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {result.rows.length === 0 ? (
              <EmptyTable
                colSpan={canUpdate ? 5 : 4}
                title={q ? "No hay centros con esos filtros." : "Aún no hay centros de trabajo."}
                description={
                  q
                    ? "Prueba otra búsqueda o limpia los filtros."
                    : "El catálogo oficial se carga con el seed de planta."
                }
              />
            ) : (
              result.rows.map((center) => (
                <TableRow key={center.id}>
                  <TableCell>{center.code}</TableCell>
                  <TableCell>{center.name}</TableCell>
                  <TableCell>{center.sortOrder}</TableCell>
                  <TableCell>{center.active ? "Sí" : "No"}</TableCell>
                  {canUpdate ? (
                    <TableCell>
                      <WorkCenterForm workCenter={center} />
                    </TableCell>
                  ) : null}
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
        label={result.total === 1 ? "centro" : "centros"}
        path="/production/work-centers"
        query={query}
        pageSize={pageSize}
      />
    </div>
  );
}
