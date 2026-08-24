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
import { Plus, Users, Mail, Phone, MapPin, UserCheck, UserX } from "lucide-react";
import { requirePermission } from "@/lib/auth/session";
import { PERMISSION_IDS } from "@/lib/permissions/catalog";
import {
  CUSTOMER_STATUS_LABELS,
  CUSTOMER_TYPE_LABELS,
} from "@/lib/validation/customers";
import { listCustomers } from "@/server/services/customers";

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string | string[];
    status?: string | string[];
    type?: string | string[];
    page?: string | string[];
    perPage?: string | string[];
  }>;
}) {
  const { access } = await requirePermission(PERMISSION_IDS.customersRead);
  const params = await searchParams;
  const q = Array.isArray(params.q) ? params.q[0] : params.q;
  const status = Array.isArray(params.status) ? params.status[0] : params.status;
  const type = Array.isArray(params.type) ? params.type[0] : params.type;
  const page = Number(Array.isArray(params.page) ? params.page[0] : params.page) || 1;
  const pageSize = Number(Array.isArray(params.perPage) ? params.perPage[0] : params.perPage) || 20;

  const canWrite = access.permissions.includes(PERMISSION_IDS.customersWrite);
  const filtered = Boolean(q || status || type);

  const result = await listCustomers({
    q: q?.trim() || undefined,
    status: status as any,
    type: type as any,
    page,
    pageSize,
  });

  // KPIs sobre la página actual (datos reales visibles)
  const activeCount = result.rows.filter((c) => c.status === "activo").length;
  const inactiveCount = result.rows.length - activeCount;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Clientes"
        description="Cartera de clientes de las tres sucursales."
        actions={
          canWrite ? (
            <Link href="/customers/new" className={buttonVariants({ size: "sm" })}>
              <Plus className="mr-1 h-3.5 w-3.5" />
              Nuevo Cliente
            </Link>
          ) : null
        }
      />

      <StatRow>
        <StatCard label="En esta vista" value={result.rows.length} icon={<Users className="h-4 w-4" />} />
        <StatCard label="Activos" value={activeCount} tone="green" icon={<UserCheck className="h-4 w-4" />} />
        <StatCard label="Inactivos" value={inactiveCount} tone="neutral" icon={<UserX className="h-4 w-4" />} />
        <StatCard label="Total en cartera" value={result.total} hint={`${result.pageCount} página(s)`} />
      </StatRow>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-card p-2">
        {[
          { label: "Todos", status: undefined },
          { label: "Activos", status: "activo" },
          { label: "Inactivos", status: "inactivo" },
        ].map((f) => {
          const sp = new URLSearchParams();
          if (q) sp.set("q", q);
          if (type) sp.set("type", type);
          if (f.status) sp.set("status", f.status);
          const s = sp.toString();
          const active = status === f.status;
          return (
            <Link
              key={f.label}
              href={s ? `/customers?${s}` : "/customers"}
              className={`rounded-md px-2.5 py-1 text-xs transition-colors ${
                active
                  ? "bg-primary/10 font-medium text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {f.label}
            </Link>
          );
        })}
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead>Contacto</TableHead>
              <TableHead>Ubicación</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {result.rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-8">
                  <EmptyState
                    icon={<Users className="h-8 w-8" />}
                    title={filtered ? "Sin resultados" : "Aún no hay clientes"}
                    description={
                      filtered
                        ? "Ajusta los filtros o la búsqueda para encontrar el cliente."
                        : "Registra tu primer cliente para empezar a cotizar."
                    }
                    action={
                      !filtered && canWrite ? (
                        <Link href="/customers/new" className={buttonVariants({ size: "sm" })}>
                          <Plus className="mr-1 h-3.5 w-3.5" />
                          Crear primer cliente
                        </Link>
                      ) : null
                    }
                  />
                </TableCell>
              </TableRow>
            ) : (
              result.rows.map((customer) => (
                <TableRow key={customer.id} className="hover:bg-muted/40">
                  <TableCell>
                    <Link href={`/customers/${customer.id}`} className="font-medium hover:underline">
                      {customer.legalName}
                    </Link>
                    {customer.code && (
                      <div className="font-mono text-[11px] text-muted-foreground">{customer.code}</div>
                    )}
                  </TableCell>
                  <TableCell className="text-xs">
                    {customer.primaryContactEmail && (
                      <div className="flex items-center gap-1">
                        <Mail className="h-3 w-3 text-muted-foreground" />
                        {customer.primaryContactEmail}
                      </div>
                    )}
                    {customer.phone && (
                      <div className="flex items-center gap-1">
                        <Phone className="h-3 w-3 text-muted-foreground" />
                        {customer.phone}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-xs">
                    {customer.city && (
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-muted-foreground" />
                        {customer.city}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px]">
                      {CUSTOMER_TYPE_LABELS[customer.type as keyof typeof CUSTOMER_TYPE_LABELS] || customer.type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1.5 text-xs">
                      <span
                        className={`h-2 w-2 rounded-full ${
                          customer.status === "activo" ? "bg-emerald-500" : "bg-gray-400"
                        }`}
                      />
                      {CUSTOMER_STATUS_LABELS[customer.status as keyof typeof CUSTOMER_STATUS_LABELS]}
                    </span>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {result.pageCount > 1 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{result.total} resultados · Página {page} de {result.pageCount}</span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={`/customers?page=${page - 1}${q ? `&q=${q}` : ""}${status ? `&status=${status}` : ""}`}
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                Anterior
              </Link>
            )}
            {page < result.pageCount && (
              <Link
                href={`/customers?page=${page + 1}${q ? `&q=${q}` : ""}${status ? `&status=${status}` : ""}`}
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
