import Link from "next/link";
import { ListSearchForm } from "@/components/layout/list-search-form";
import { PageHeader } from "@/components/layout/page-header";
import { TablePager } from "@/components/layout/data-table";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePermission } from "@/lib/auth/session";
import { PRODUCTION_ROUTE_STEP_KIND_LABELS } from "@/lib/production/catalog";
import { PERMISSION_IDS } from "@/lib/permissions/catalog";
import {
  firstSearchParam,
  paginateRows,
  parsePage,
  parsePageSize,
} from "@/lib/ui/pagination";
import { listProductionRoutes } from "@/server/services/production-catalogs";

export default async function ProductionRoutesPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string | string[];
    page?: string | string[];
    perPage?: string | string[];
  }>;
}) {
  await requirePermission(PERMISSION_IDS.productionView);
  const params = await searchParams;
  const q = firstSearchParam(params.q)?.trim() || undefined;
  const page = parsePage(firstSearchParam(params.page));
  const pageSize = parsePageSize(firstSearchParam(params.perPage));
  const routes = await listProductionRoutes();
  const needle = q?.toLowerCase();
  const filtered = needle
    ? routes.filter((route) =>
        [route.name, route.description, ...route.steps.map((step) => step.name)]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(needle),
      )
    : routes;
  const result = paginateRows(filtered, page, pageSize);
  const query = new URLSearchParams();
  if (q) query.set("q", q);
  query.set("perPage", String(pageSize));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Rutas de fabricación"
        description="Rutas A, B y C de planta. El administrador puede agregar más."
        actions={
          <Link href="/production" className={buttonVariants({ variant: "outline" })}>
            Producción
          </Link>
        }
      />
      <ListSearchForm
        action="/production/routes"
        q={q}
        perPage={pageSize}
        placeholder="Ruta, descripción o paso"
      />
      {result.rows.length === 0 ? (
        <div className="rounded-lg border bg-card px-6 py-12 text-center">
          <p className="font-medium">{q ? "No hay rutas con esos filtros." : "Aún no hay rutas."}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {q
              ? "Prueba otra búsqueda o limpia los filtros."
              : "El seed de planta carga las rutas oficiales de AMD México."}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          {result.rows.map((route) => (
            <Card key={route.id}>
              <CardHeader>
                <CardTitle>{route.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p className="text-muted-foreground">{route.description}</p>
                <ol className="space-y-1">
                  {route.steps.map((step) => (
                    <li key={step.id}>
                      {step.position}. {step.name} ·{" "}
                      {PRODUCTION_ROUTE_STEP_KIND_LABELS[step.kind]}
                      {step.workCenterName ? ` (${step.workCenterName})` : ""}
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <TablePager
        total={result.total}
        page={result.page}
        pageCount={result.pageCount}
        label={result.total === 1 ? "ruta" : "rutas"}
        path="/production/routes"
        query={query}
        pageSize={pageSize}
      />
    </div>
  );
}
