import Link from "next/link";
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
import { MACHINE_STATUS_LABELS, type MachineStatus } from "@/lib/production/catalog";
import { displayQty } from "@/lib/inventory/catalog";
import { PERMISSION_IDS } from "@/lib/permissions/catalog";
import { displayMoney } from "@/lib/quotes/money";
import {
  firstSearchParam,
  paginateRows,
  parsePage,
  parsePageSize,
} from "@/lib/ui/pagination";
import { listMachines } from "@/server/services/production-catalogs";
import { Cog, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { StatCard, StatRow } from "@/components/shared/ui-patterns";

export default async function MachinesPage({
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
  const allRows = await listMachines();
  const needle = q?.toLowerCase();
  const filteredRows = needle
    ? allRows.filter((row) =>
        [row.name, row.workCenterName, row.status].join(" ").toLowerCase().includes(needle),
      )
    : allRows;
  const result = paginateRows(filteredRows, page, pageSize);
  const query = new URLSearchParams();
  if (q) query.set("q", q);
  query.set("perPage", String(pageSize));

  // KPIs sobre la página actual (datos reales visibles)
  const operational = result.rows.filter(
    (m) => m.status === "disponible" || m.status === "en_produccion" || m.status === "ocupada",
  ).length;
  const maintenance = result.rows.filter((m) => m.status === "mantenimiento").length;
  const outOfService = result.rows.filter((m) => m.status === "fuera_de_servicio").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Máquinas"
        description="Equipo de piso por centro de trabajo. La tarifa hora alimenta la calculadora."
        actions={
          <>
            <Link href="/production" className={buttonVariants({ variant: "outline" })}>
              Producción
            </Link>
            {canUpdate ? (
              <Link href="/machines/new" className={buttonVariants()}>
                Nueva máquina
              </Link>
            ) : null}
          </>
        }
      />

      <StatRow>
        <StatCard label="En esta vista" value={result.rows.length} icon={<Cog className="h-4 w-4" />} />
        <StatCard label="Operativas" value={operational} tone="green" icon={<CheckCircle2 className="h-4 w-4" />} />
        <StatCard label="Mantenimiento" value={maintenance} tone="amber" icon={<AlertTriangle className="h-4 w-4" />} />
        <StatCard label="Fuera de servicio" value={outOfService} tone="red" icon={<XCircle className="h-4 w-4" />} />
      </StatRow>

      <ListSearchForm
        action="/machines"
        q={q}
        perPage={pageSize}
        placeholder="Nombre, centro o estado"
      />
      <TableCard>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Centro</TableHead>
              <TableHead>Tarifa</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Horas/turno</TableHead>
              <TableHead>Activo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {result.rows.length === 0 ? (
              <EmptyTable
                colSpan={6}
                title={q ? "No hay máquinas con esos filtros." : "Aún no hay máquinas."}
                description={
                  q
                    ? "Prueba otra búsqueda o limpia los filtros."
                    : "Da de alta el equipo de cada centro de trabajo."
                }
                href={!q && canUpdate ? "/machines/new" : undefined}
                actionLabel="Nueva máquina"
              />
            ) : (
              result.rows.map((row) => (
                <TableRow key={row.id} className="hover:bg-muted/40">
                  <TableCell>
                    <Link href={`/machines/${row.id}`} className="font-medium hover:underline">
                      {row.name}
                    </Link>
                  </TableCell>
                  <TableCell>{row.workCenterName}</TableCell>
                  <TableCell>
                    {row.hourlyCost ? displayMoney(row.hourlyCost, "mxn") : "—"}
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1.5 text-xs">
                      <span
                        className={`h-2 w-2 rounded-full ${
                          row.status === "disponible" || row.status === "en_produccion" || row.status === "ocupada"
                            ? "bg-emerald-500"
                            : row.status === "mantenimiento"
                            ? "bg-amber-500"
                            : "bg-red-500"
                        }`}
                      />
                      {MACHINE_STATUS_LABELS[row.status as MachineStatus]}
                    </span>
                  </TableCell>
                  <TableCell>{displayQty(row.hoursPerShift)}</TableCell>
                  <TableCell>{row.active ? "Sí" : "No"}</TableCell>
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
        label={result.total === 1 ? "máquina" : "máquinas"}
        path="/machines"
        query={query}
        pageSize={pageSize}
      />
    </div>
  );
}