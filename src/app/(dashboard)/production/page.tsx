import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  LayoutGrid,
  List,
  Calendar,
  Plus,
  Clock,
} from "lucide-react";
import { requirePermission } from "@/lib/auth/session";
import { PERMISSION_IDS } from "@/lib/permissions/catalog";
import {
  PRODUCTION_STATUS_LABELS,
  type ProductionStatus,
} from "@/lib/production/status";
import {
  PRODUCTION_PRIORITY_LABELS,
  productionPriorityVariant,
  type ProductionPriority,
} from "@/lib/production/catalog";
import { listProductionOrders } from "@/server/services/production";

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
    view?: string | string[];
  }>;
}) {
  const { access, session } = await requirePermission(PERMISSION_IDS.productionView);
  const params = await searchParams;
  const q = Array.isArray(params.q) ? params.q[0] : params.q;
  const status = Array.isArray(params.status) ? params.status[0] : params.status;
  const delayed = (Array.isArray(params.delayed) ? params.delayed[0] : params.delayed) === "1";
  const mine = (Array.isArray(params.mine) ? params.mine[0] : params.mine) === "1";
  const view = Array.isArray(params.view) ? params.view[0] : params.view;
  const page = Number(Array.isArray(params.page) ? params.page[0] : params.page) || 1;
  const pageSize = Number(Array.isArray(params.perPage) ? params.perPage[0] : params.perPage) || 20;

  const canCreate = access.permissions.includes(PERMISSION_IDS.productionCreate);
  const filtered = Boolean(q || status || delayed || mine);

  const result = await listProductionOrders({
    q: q?.trim() || undefined,
    status: status as any,
    delayed,
    operatorUserId: mine ? session.user.id : undefined,
    page,
    pageSize,
  });

  const query = new URLSearchParams();
  if (q) query.set("q", q);
  if (status) query.set("status", status);
  if (delayed) query.set("delayed", "1");
  if (mine) query.set("mine", "1");

  if (view === "kanban") {
    redirect("/production/kanban");
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Producción</h1>
          <p className="text-xs text-muted-foreground">
            {result.total} números de parte · {result.rows.filter((r) => r.status === "en_produccion").length} en producción
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-md border p-0.5">
            <Link href="/production" className="rounded-sm bg-muted p-1" aria-label="Vista tabla">
              <List className="h-3.5 w-3.5" />
            </Link>
            <Link href="/production/kanban" className="rounded-sm p-1 text-muted-foreground hover:bg-muted" aria-label="Vista Kanban">
              <LayoutGrid className="h-3.5 w-3.5" />
            </Link>
            <Link href="/production/calendar" className="rounded-sm p-1 text-muted-foreground hover:bg-muted" aria-label="Vista Calendario">
              <Calendar className="h-3.5 w-3.5" />
            </Link>
            <Link href="/production/gantt" className="rounded-sm p-1 text-muted-foreground hover:bg-muted" aria-label="Vista Gantt">
              <Clock className="h-3.5 w-3.5" />
            </Link>
          </div>
          {canCreate && (
            <a href="/production/new" className="inline-flex items-center justify-center gap-1 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90">
              <Plus className="h-3 w-3" />
              Nuevo
            </a>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 rounded-md border bg-card p-2">
        {[
          { label: "Todos", status: undefined, delayed: false, mine: false },
          { label: "En Producción", status: "en_produccion", delayed: false, mine: false },
          { label: "Pendientes", status: "pendiente", delayed: false, mine: false },
          { label: "En Calidad", status: "calidad", delayed: false, mine: false },
          { label: "Terminadas", status: "terminada", delayed: false, mine: false },
        ].map((f) => {
          const sp = new URLSearchParams();
          if (q) sp.set("q", q);
          if (f.status) sp.set("status", f.status);
          const s = sp.toString();
          const active = status === f.status && !delayed && !mine;
          return (
            <Link
              key={f.label}
              href={s ? `/production?${s}` : "/production"}
              className={`rounded px-2 py-1 text-xs ${active ? "bg-muted font-medium" : "hover:bg-muted"}`}
            >
              {f.label}
            </Link>
          );
        })}
        <span className="mx-1 h-4 w-px bg-border" />
        <Link
          href={(() => {
            const sp = new URLSearchParams();
            if (q) sp.set("q", q);
            if (status) sp.set("status", status);
            if (!delayed) sp.set("delayed", "1");
            const s = sp.toString();
            return s ? `/production?${s}` : "/production";
          })()}
          className={`rounded px-2 py-1 text-xs ${delayed ? "bg-red-100 font-medium text-red-700" : "hover:bg-muted"}`}
        >
          Atrasados
        </Link>
        <Link
          href={(() => {
            const sp = new URLSearchParams();
            if (q) sp.set("q", q);
            if (status) sp.set("status", status);
            if (!mine) sp.set("mine", "1");
            const s = sp.toString();
            return s ? `/production?${s}` : "/production";
          })()}
          className={`rounded px-2 py-1 text-xs ${mine ? "bg-blue-100 font-medium text-blue-700" : "hover:bg-muted"}`}
        >
          Mis Partes
        </Link>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Número de Parte</TableHead>
              <TableHead>OT / Cliente</TableHead>
              <TableHead>Cantidad</TableHead>
              <TableHead>Prioridad</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Proceso Actual</TableHead>
              <TableHead>Progreso</TableHead>
              <TableHead>Prometida</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
          {result.rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="py-12 text-center">
                <p className="text-sm text-muted-foreground">
                  {filtered ? "No se encontraron resultados" : "Aún no hay números de parte"}
                </p>
                {!filtered && canCreate && (
                  <a href="/production/new" className="mt-2 inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground hover:bg-primary/90">
                    <Plus className="h-3 w-3" />
                    Crear primer OT
                  </a>
                )}
              </TableCell>
            </TableRow>
            ) : (
              result.rows.map((row) => {
                const progress =
                  row.operationsTotal > 0
                    ? Math.round((row.operationsDone / row.operationsTotal) * 100)
                    : 0;

                return (
                <TableRow key={row.id}>
                  <TableCell>
                    <Link
                      href={`/production/${row.id}`}
                      className="font-mono text-sm font-medium text-blue-600 hover:underline"
                    >
                      {row.partNumber || row.number}
                    </Link>
                    <div className="truncate text-xs text-muted-foreground max-w-[220px]">
                      {row.description}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/orders/${row.orderId}`}
                      className="font-mono text-xs hover:underline"
                    >
                      {row.number}
                    </Link>
                    <div className="text-xs text-muted-foreground">
                      {row.customerName}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs">
                    <span className="font-medium">{Number(row.quantity)}</span>{" "}
                    <span className="text-muted-foreground">{row.unit}</span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={productionPriorityVariant(row.priority as ProductionPriority)} className="text-[10px]">
                      {PRODUCTION_PRIORITY_LABELS[row.priority as ProductionPriority]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(row.status as ProductionStatus)} className="text-[10px]">
                      {PRODUCTION_STATUS_LABELS[row.status as ProductionStatus]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {row.currentOperationName ? (
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                            row.currentOperationStatus === "en_proceso"
                              ? "bg-amber-500"
                              : "bg-gray-400"
                          }`}
                        />
                        <div className="min-w-0">
                          <div className="truncate text-xs font-medium max-w-[150px]">
                            {row.currentOperationPosition}. {row.currentOperationName}
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            {row.currentOperationStatus === "en_proceso" ? "en curso" : "pendiente"}
                            {row.operatorName ? ` · ${row.operatorName}` : ""}
                          </div>
                        </div>
                      </div>
                    ) : row.operationsTotal > 0 ? (
                      <span className="text-xs font-medium text-green-600">Completado</span>
                    ) : (
                      <span className="text-xs italic text-muted-foreground">Sin procesos</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {row.operationsTotal === 0 ? (
                      <span className="text-xs text-muted-foreground">—</span>
                    ) : (
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-14 overflow-hidden rounded-full bg-muted">
                            <div
                              className={`h-full transition-all ${progress === 100 ? "bg-green-500" : "bg-blue-500"}`}
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <span className="text-xs font-medium">{progress}%</span>
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          {row.operationsDone}/{row.operationsTotal} procesos
                        </div>
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-xs">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      {new Date(row.promisedDate).toLocaleDateString("es-MX")}
                    </div>
                  </TableCell>
                </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {result.pageCount > 1 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {result.total} resultados · Página {page} de {result.pageCount}
          </span>
          <div className="flex gap-1">
            {page > 1 && (
              <Link
                href={`/production?${query.toString()}&page=${page - 1}`}
                className="rounded-md border px-2 py-1 hover:bg-muted"
              >
                Anterior
              </Link>
            )}
            {page < result.pageCount && (
              <Link
                href={`/production?${query.toString()}&page=${page + 1}`}
                className="rounded-md border px-2 py-1 hover:bg-muted"
              >
                Siguiente
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
