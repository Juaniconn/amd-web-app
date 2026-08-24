import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState, StatCard, StatRow } from "@/components/shared/ui-patterns";
import { PageHeader } from "@/components/layout/page-header";
import { Plus, CheckCircle, AlertCircle, Clock, ShieldCheck, XCircle } from "lucide-react";
import { requirePermission } from "@/lib/auth/session";
import { PERMISSION_IDS } from "@/lib/permissions/catalog";
import {
  INSPECTION_RESULT_LABELS,
  INSPECTION_TYPE_LABELS,
} from "@/lib/quality/catalog";
import { listInspections } from "@/server/services/quality";

export default async function QualityPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string | string[];
    page?: string | string[];
    perPage?: string | string[];
  }>;
}) {
  const { access } = await requirePermission(PERMISSION_IDS.qualityRead);
  const canInspect = access.permissions.includes(PERMISSION_IDS.qualityInspect);
  const params = await searchParams;
  const q = Array.isArray(params.q) ? params.q[0] : params.q;
  const page = Number(Array.isArray(params.page) ? params.page[0] : params.page) || 1;
  const pageSize = Number(Array.isArray(params.perPage) ? params.perPage[0] : params.perPage) || 20;

  const inspections = await listInspections({ q: q?.trim() || undefined, page, pageSize });

  // KPIs sobre la página actual (datos reales visibles)
  const approvedCount = inspections.rows.filter((i) => i.result === "aprobado").length;
  const rejectedCount = inspections.rows.filter((i) => i.result === "rechazado").length;
  const pendingCount = inspections.rows.filter((i) => i.result === "pendiente").length;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Calidad"
        description="Inspecciones de calidad registradas en el sistema."
        actions={
          canInspect ? (
            <Link href="/quality/inspections/new" className={buttonVariants({ size: "sm" })}>
              <Plus className="mr-1 h-3.5 w-3.5" />
              Nueva Inspección
            </Link>
          ) : null
        }
      />

      <StatRow>
        <StatCard label="En esta vista" value={inspections.rows.length} icon={<ShieldCheck className="h-4 w-4" />} />
        <StatCard label="Aprobadas" value={approvedCount} tone="green" icon={<CheckCircle className="h-4 w-4" />} />
        <StatCard label="Rechazadas" value={rejectedCount} tone="red" icon={<XCircle className="h-4 w-4" />} />
        <StatCard label="Pendientes" value={pendingCount} tone="amber" icon={<Clock className="h-4 w-4" />} />
      </StatRow>

      {/* Table */}
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Parte</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Resultado</TableHead>
              <TableHead>Fecha</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {inspections.rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="py-8">
                  <EmptyState
                    icon={<ShieldCheck className="h-8 w-8" />}
                    title="Sin inspecciones"
                    description="No hay inspecciones registradas. Crea una nueva inspección para empezar."
                    action={
                      canInspect ? (
                        <Link href="/quality/inspections/new" className={buttonVariants({ size: "sm" })}>
                          <Plus className="mr-1 h-3.5 w-3.5" />
                          Nueva inspección
                        </Link>
                      ) : null
                    }
                  />
                </TableCell>
              </TableRow>
            ) : (
              inspections.rows.map((insp) => (
                <TableRow key={insp.id} className="hover:bg-muted/40">
                  <TableCell>
                    <span className="font-medium">{insp.partNumber}</span>
                    <div className="font-mono text-[11px] text-muted-foreground">{insp.otNumber}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px]">
                      {INSPECTION_TYPE_LABELS[insp.type as keyof typeof INSPECTION_TYPE_LABELS]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1.5 text-xs">
                      <span
                        className={`h-2 w-2 rounded-full ${
                          insp.result === "aprobado"
                            ? "bg-emerald-500"
                            : insp.result === "rechazado"
                              ? "bg-red-500"
                              : "bg-amber-500"
                        }`}
                      />
                      {INSPECTION_RESULT_LABELS[insp.result as keyof typeof INSPECTION_RESULT_LABELS]}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs">
                    {new Date(insp.inspectedAt).toLocaleDateString("es-MX")}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {inspections.pageCount > 1 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{inspections.total} resultados · Página {page} de {inspections.pageCount}</span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={`/quality?page=${page - 1}${q ? `&q=${q}` : ""}`}
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                Anterior
              </Link>
            )}
            {page < inspections.pageCount && (
              <Link
                href={`/quality?page=${page + 1}${q ? `&q=${q}` : ""}`}
                className={buttonVariants({ variant: "outline", size: "sm" })}
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