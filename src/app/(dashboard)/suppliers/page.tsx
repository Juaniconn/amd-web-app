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
import { Plus, Factory, MapPin, UserCheck, UserX } from "lucide-react";
import { requirePermission } from "@/lib/auth/session";
import { PERMISSION_IDS } from "@/lib/permissions/catalog";
import { SUPPLIER_STATUS_LABELS } from "@/lib/purchasing/catalog";
import { listSuppliers } from "@/server/services/purchasing";

export default async function SuppliersPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string | string[];
    page?: string | string[];
    perPage?: string | string[];
  }>;
}) {
  const { access } = await requirePermission(PERMISSION_IDS.purchasingRead);
  const canWrite = access.permissions.includes(PERMISSION_IDS.purchasingWrite);
  const params = await searchParams;
  const q = Array.isArray(params.q) ? params.q[0] : params.q;
  const page = Number(Array.isArray(params.page) ? params.page[0] : params.page) || 1;
  const pageSize = Number(Array.isArray(params.perPage) ? params.perPage[0] : params.perPage) || 20;
  const filtered = Boolean(q);

  const result = await listSuppliers({
    q: q?.trim() || undefined,
    page,
    pageSize,
  });

  // KPIs sobre la página actual (datos reales visibles)
  const activeCount = result.rows.filter((s) => s.status === "activo").length;
  const inactiveCount = result.rows.length - activeCount;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Proveedores"
        description="Catálogo de proveedores activos e inactivos."
        actions={
          canWrite ? (
            <Link href="/suppliers/new" className={buttonVariants({ size: "sm" })}>
              <Plus className="mr-1 h-3.5 w-3.5" />
              Nuevo Proveedor
            </Link>
          ) : null
        }
      />

      <StatRow>
        <StatCard label="En esta vista" value={result.rows.length} icon={<Factory className="h-4 w-4" />} />
        <StatCard label="Activos" value={activeCount} tone="green" icon={<UserCheck className="h-4 w-4" />} />
        <StatCard label="Inactivos" value={inactiveCount} tone="neutral" icon={<UserX className="h-4 w-4" />} />
        <StatCard label="Total proveedores" value={result.total} hint={`${result.pageCount} página(s)`} />
      </StatRow>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Proveedor</TableHead>
              <TableHead>Contacto</TableHead>
              <TableHead>Ubicación</TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {result.rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="py-8">
                  <EmptyState
                    icon={<Factory className="h-8 w-8" />}
                    title={filtered ? "Sin resultados" : "Aún no hay proveedores"}
                    description={
                      filtered
                        ? "Ajusta la búsqueda para encontrar el proveedor."
                        : "Registra tu primer proveedor para empezar a comprar."
                    }
                    action={
                      !filtered && canWrite ? (
                        <Link href="/suppliers/new" className={buttonVariants({ size: "sm" })}>
                          <Plus className="mr-1 h-3.5 w-3.5" />
                          Crear primer proveedor
                        </Link>
                      ) : null
                    }
                  />
                </TableCell>
              </TableRow>
            ) : (
              result.rows.map((supplier) => (
                <TableRow key={supplier.id} className="hover:bg-muted/40">
                  <TableCell>
                    <Link href={`/suppliers/${supplier.id}`} className="font-medium hover:underline">
                      {supplier.legalName}
                    </Link>
                    <div className="font-mono text-[11px] text-muted-foreground">{supplier.code}</div>
                  </TableCell>
                  <TableCell className="text-xs">
                    {supplier.contactName}
                    <div className="text-xs text-muted-foreground">{supplier.email}</div>
                  </TableCell>
                  <TableCell className="text-xs">
                    {supplier.city && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-muted-foreground" />
                        {supplier.city}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1.5 text-xs">
                      <span
                        className={`h-2 w-2 rounded-full ${
                          supplier.status === "activo" ? "bg-emerald-500" : "bg-gray-400"
                        }`}
                      />
                      {SUPPLIER_STATUS_LABELS[supplier.status as keyof typeof SUPPLIER_STATUS_LABELS]}
                    </span>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}