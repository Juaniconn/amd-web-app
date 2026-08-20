import Link from "next/link";
import { ProductionFilters } from "@/features/production/production-filters";
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
import { partIdentity, workOrderNumber } from "@/lib/production/ot-number";
import { productionStatusSchema } from "@/lib/validation/production";
import { listProductionOrders } from "@/server/services/production";
import { parsePage, parsePageSize } from "@/lib/ui/pagination";

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
    mine?: string | string[];
    page?: string | string[];
    perPage?: string | string[];
  }>;
}) {
  const { access, session } = await requirePermission(PERMISSION_IDS.productionView);
  const params = await searchParams;
  const q = first(params.q)?.trim() || undefined;
  const statusParsed = productionStatusSchema.safeParse(first(params.status));
  const delayed = first(params.delayed) === "1";
  const mine = first(params.mine) === "1";
  const page = parsePage(first(params.page));
  const pageSize = parsePageSize(first(params.perPage));
  const canCreate = access.permissions.includes(PERMISSION_IDS.productionCreate);
  const filtered = Boolean(q || statusParsed.success || delayed || mine);
  const result = await listProductionOrders({
    q,
    status: statusParsed.success ? statusParsed.data : undefined,
    delayed,
    operatorUserId: mine ? session.user.id : undefined,
    page,
    pageSize,
  });

  const query = new URLSearchParams();
  if (q) query.set("q", q);
  if (statusParsed.success) query.set("status", statusParsed.data);
  if (delayed) query.set("delayed", "1");
  if (mine) query.set("mine", "1");
  query.set("perPage", String(pageSize));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Producción"
        description="El piso opera por número de parte. Cada fila pertenece a una orden de trabajo."
        actions={
          <>
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
                Nuevo número de parte
              </Link>
            ) : null}
          </>
        }
      />

      <ProductionFilters
        q={q}
        status={statusParsed.success ? statusParsed.data : undefined}
        delayed={delayed}
        mine={mine}
        perPage={pageSize}
      />

      <TableCard>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Número de Parte</TableHead>
              <TableHead>Orden de trabajo</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Prioridad</TableHead>
              <TableHead>Prometida</TableHead>
              <TableHead>Monitoreo</TableHead>
              <TableHead>Centro / Máquina</TableHead>
              <TableHead>Operador</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {result.rows.length === 0 ? (
              <EmptyTable
                colSpan={9}
                title={filtered ? "No hay números de parte con esos filtros." : "Aún no hay números de parte."}
                description={
                  filtered
                    ? "Prueba otro estado o limpia los filtros."
                    : "Emite un número de parte desde una orden de trabajo aprobada."
                }
                href={!filtered && canCreate ? "/production/new" : undefined}
                actionLabel="Nuevo número de parte"
              />
            ) : (
              result.rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <Link href={`/production/${row.id}`} className="font-medium hover:underline">
                      {partIdentity(row.partNumber, row.number)}
                    </Link>
                    {row.isDemo ? (
                      <Badge variant="outline" className="ml-2">
                        DEMO
                      </Badge>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    <Link href={`/orders/${row.orderId}`} className="hover:underline">
                      {workOrderNumber(row.orderNumber)}
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
                  <TableCell>{row.operatorName ?? "—"}</TableCell>
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
        label={result.total === 1 ? "número de parte" : "números de parte"}
        path="/production"
        query={query}
        pageSize={pageSize}
      />
    </div>
  );
}
