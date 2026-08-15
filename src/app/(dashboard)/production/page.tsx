import Link from "next/link";
import { ProductionFilters } from "@/features/production/production-filters";
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
  PRODUCTION_MONITORING_LABELS,
  PRODUCTION_PRIORITY_LABELS,
  productionPriorityVariant,
  type ProductionPriority,
} from "@/lib/production/catalog";
import {
  PRODUCTION_STATUS_LABELS,
  type ProductionStatus,
} from "@/lib/production/status";
import { PERMISSION_IDS } from "@/lib/permissions/catalog";
import { productionStatusSchema } from "@/lib/validation/production";
import { getProductionDashboardStats } from "@/server/services/production-kpis";
import { listProductionOrders } from "@/server/services/production";

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function statusVariant(status: ProductionStatus) {
  if (status === "cancelada") return "destructive" as const;
  if (status === "entregada" || status === "terminada") return "default" as const;
  if (status === "pendiente") return "outline" as const;
  return "secondary" as const;
}

export default async function ProductionPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string | string[];
    status?: string | string[];
    delayed?: string | string[];
    page?: string | string[];
  }>;
}) {
  const { access } = await requirePermission(PERMISSION_IDS.productionView);
  const params = await searchParams;
  const q = first(params.q)?.trim() || undefined;
  const statusParsed = productionStatusSchema.safeParse(first(params.status));
  const delayed = first(params.delayed) === "1";
  const page = Number(first(params.page) ?? "1") || 1;
  const canCreate = access.permissions.includes(PERMISSION_IDS.productionCreate);
  const stats = await getProductionDashboardStats();
  const result = await listProductionOrders({
    q,
    status: statusParsed.success ? statusParsed.data : undefined,
    delayed,
    page,
  });

  const query = new URLSearchParams();
  if (q) query.set("q", q);
  if (statusParsed.success) query.set("status", statusParsed.data);
  if (delayed) query.set("delayed", "1");

  function pageHref(nextPage: number) {
    const next = new URLSearchParams(query);
    next.set("page", String(nextPage));
    return `/production?${next.toString()}`;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Producción</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Órdenes de trabajo (OT) ancladas al pedido. Los registros DEMO no son
            piso real de AMD.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/production/work-centers" className={buttonVariants({ variant: "outline" })}>
            Centros
          </Link>
          <Link href="/production/routes" className={buttonVariants({ variant: "outline" })}>
            Rutas
          </Link>
          <Link href="/machines" className={buttonVariants({ variant: "outline" })}>
            Máquinas
          </Link>
          {canCreate ? (
            <Link href="/production/new" className={buttonVariants()}>
              Nueva OT
            </Link>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="OT activas" value={String(stats.active)} hint="No terminadas, entregadas ni canceladas" />
        <KpiCard label="OT retrasadas" value={String(stats.delayed)} hint="Activas con fecha prometida vencida" />
        <KpiCard label="OT terminadas" value={String(stats.finished)} hint="Terminadas o entregadas" />
        <KpiCard label="Horas máquina" value={String(stats.machineHours)} hint="Suma de registros cerrados" />
        <KpiCard label="Horas hombre" value={String(stats.laborHours)} hint="Suma de registros cerrados" />
        <KpiCard
          label="Cumplimiento entrega"
          value={stats.deliveryCompliance === null ? "—" : `${stats.deliveryCompliance}%`}
          hint="Cierre físico ≤ fecha prometida"
        />
        <KpiCard
          label="Carga CNC"
          value={`${stats.cncLoadHours} h`}
          hint={`Utilización semanal ${stats.cncUtilization}%`}
        />
        <KpiCard
          label="Carga Láser"
          value={`${stats.laserLoadHours} h`}
          hint={`Utilización semanal ${stats.laserUtilization}%`}
        />
        <KpiCard
          label="Carga Tornos"
          value={`${stats.tornosLoadHours} h`}
          hint={`Utilización semanal ${stats.tornosUtilization}%`}
        />
        <KpiCard label="Producción semanal" value={String(stats.weeklyFinished)} hint="Cierres físicos de la semana" />
        <KpiCard label="Producción mensual" value={String(stats.monthlyFinished)} hint="Cierres físicos del mes" />
      </div>

      <ProductionFilters
        q={q}
        status={statusParsed.success ? statusParsed.data : undefined}
        delayed={delayed}
      />

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>OT</TableHead>
              <TableHead>Pedido</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Prioridad</TableHead>
              <TableHead>Prometida</TableHead>
              <TableHead>Monitoreo</TableHead>
              <TableHead>Centro / Máquina</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {result.rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-muted-foreground">
                  No hay OT con esos filtros.
                </TableCell>
              </TableRow>
            ) : (
              result.rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <Link href={`/production/${row.id}`} className="font-medium hover:underline">
                      {row.number}
                    </Link>
                    {row.isDemo ? (
                      <Badge variant="outline" className="ml-2">
                        DEMO
                      </Badge>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    <Link href={`/orders/${row.orderId}`} className="hover:underline">
                      {row.orderNumber}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Link href={`/customers/${row.customerId}`} className="hover:underline">
                      {row.customerName}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(row.status as ProductionStatus)}>
                      {PRODUCTION_STATUS_LABELS[row.status as ProductionStatus]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={productionPriorityVariant(
                        row.priority as ProductionPriority,
                      )}
                    >
                      {PRODUCTION_PRIORITY_LABELS[row.priority as ProductionPriority]}
                    </Badge>
                  </TableCell>
                  <TableCell>{row.promisedDate.toLocaleDateString("es-MX")}</TableCell>
                  <TableCell>{PRODUCTION_MONITORING_LABELS[row.monitoring]}</TableCell>
                  <TableCell>
                    {row.workCenterName ?? "—"}
                    {row.machineName ? ` · ${row.machineName}` : ""}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <p>
          {result.total} registro{result.total === 1 ? "" : "s"} · página {result.page} de{" "}
          {result.pageCount}
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
