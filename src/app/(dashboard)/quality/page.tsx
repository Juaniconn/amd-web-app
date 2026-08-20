import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TablePager } from "@/components/layout/data-table";
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
import { partIdentity } from "@/lib/production/ot-number";
import {
  INSPECTION_RESULT_LABELS,
  INSPECTION_TYPE_LABELS,
  NCR_STATUS_LABELS,
  type InspectionResult,
  type InspectionType,
  type NcrStatus,
} from "@/lib/quality/catalog";
import { firstSearchParam, parsePage, parsePageSize } from "@/lib/ui/pagination";
import { listInspections, listNcrs } from "@/server/services/quality";

export default async function QualityPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string | string[];
    page?: string | string[];
    ncrPage?: string | string[];
    perPage?: string | string[];
  }>;
}) {
  const { access } = await requirePermission(PERMISSION_IDS.qualityRead);
  const canInspect = access.permissions.includes(PERMISSION_IDS.qualityInspect);
  const canNcr = access.permissions.includes(PERMISSION_IDS.qualityNcr);
  const params = await searchParams;
  const q = firstSearchParam(params.q)?.trim() || undefined;
  const page = parsePage(firstSearchParam(params.page));
  const ncrPage = parsePage(firstSearchParam(params.ncrPage));
  const pageSize = parsePageSize(firstSearchParam(params.perPage));
  const [inspections, ncrs] = await Promise.all([
    listInspections({ q, page, pageSize }),
    listNcrs({ q, page: ncrPage, pageSize }),
  ]);
  const query = new URLSearchParams();
  if (q) query.set("q", q);
  query.set("perPage", String(pageSize));
  if (page > 1) query.set("page", String(page));
  if (ncrPage > 1) query.set("ncrPage", String(ncrPage));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Calidad</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Solicitudes en borrador de números de parte que ya terminaron proceso. Entra al
            folio, revisa los datos y aprueba o rechaza para retrabajo.
          </p>
        </div>
        <div className="flex gap-2">
          {canInspect ? (
            <Link href="/quality/inspections/new" className={buttonVariants()}>
              Nueva inspección
            </Link>
          ) : null}
          {canNcr ? (
            <Link href="/quality/ncrs/new" className={buttonVariants({ variant: "outline" })}>
              Nuevo NCR
            </Link>
          ) : null}
        </div>
      </div>

      <ListSearchForm
        action="/quality"
        q={q}
        perPage={pageSize}
        placeholder="Folio, OT o cliente"
      />

      <Card>
        <CardHeader>
          <CardTitle>Solicitudes de inspección</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Folio</TableHead>
                <TableHead>Número de parte</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Resultado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {inspections.rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-10 text-center text-sm text-muted-foreground">
                    No hay solicitudes. Cuando Producción envía un número de parte a Calidad llega un borrador aquí.
                  </TableCell>
                </TableRow>
              ) : (
                inspections.rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <Link
                        href={`/quality/inspections/${row.id}`}
                        className="font-medium hover:underline"
                      >
                        {row.number}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link href={`/production/${row.productionOrderId}`} className="hover:underline">
                        {partIdentity(row.partNumber, row.otNumber)}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {INSPECTION_TYPE_LABELS[row.type as InspectionType]}
                    </TableCell>
                    <TableCell>
                      <Badge variant={row.result === "rechazado" ? "outline" : "secondary"}>
                        {INSPECTION_RESULT_LABELS[row.result as InspectionResult]}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          <TablePager
            total={inspections.total}
            page={inspections.page}
            pageCount={inspections.pageCount}
            label={inspections.total === 1 ? "inspección" : "inspecciones"}
            path="/quality"
            query={query}
            pageSize={pageSize}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>NCR</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Folio</TableHead>
                <TableHead>Número de parte</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Causa</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ncrs.rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-10 text-center text-sm text-muted-foreground">
                    No hay no conformidades abiertas.
                  </TableCell>
                </TableRow>
              ) : (
                ncrs.rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <Link href={`/quality/ncrs/${row.id}`} className="font-medium hover:underline">
                        {row.number}
                      </Link>
                    </TableCell>
                    <TableCell>{partIdentity(row.partNumber, row.otNumber)}</TableCell>
                    <TableCell>{NCR_STATUS_LABELS[row.status as NcrStatus]}</TableCell>
                    <TableCell className="max-w-xs truncate">{row.cause ?? "—"}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          <TablePager
            total={ncrs.total}
            page={ncrs.page}
            pageCount={ncrs.pageCount}
            label={ncrs.total === 1 ? "NCR" : "NCR"}
            path="/quality"
            query={query}
            pageSize={pageSize}
            pageParam="ncrPage"
          />
        </CardContent>
      </Card>
    </div>
  );
}
