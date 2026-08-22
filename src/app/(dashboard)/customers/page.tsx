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
import { Button } from "@/components/ui/button";
import { Plus, Building2, Mail, Phone, MapPin } from "lucide-react";
import { requirePermission } from "@/lib/auth/session";
import { PERMISSION_IDS } from "@/lib/permissions/catalog";
import {
  CUSTOMER_STATUS_LABELS,
  CUSTOMER_TYPE_LABELS,
  customerStatusSchema,
  customerTypeSchema,
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

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Clientes</h1>
          <p className="text-xs text-muted-foreground">
            {result.total} clientes · {result.rows.filter((c) => c.status === "activo").length} activos
          </p>
        </div>
        {canWrite && (
          <Link href="/customers/new" className="inline-flex items-center justify-center gap-1 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            <Plus className="h-3 w-3" />
            Nuevo Cliente
          </Link>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 rounded-md border bg-card p-2">
        <Button variant="outline" size="xs" className={!status && !filtered ? "bg-muted" : ""}>
          Todos
        </Button>
        <Button variant="outline" size="xs" className={status === "activo" ? "bg-muted" : ""}>
          Activos
        </Button>
        <Button variant="outline" size="xs" className={status === "inactivo" ? "bg-muted" : ""}>
          Inactivos
        </Button>
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
                <TableCell colSpan={5} className="py-12 text-center">
                  <p className="text-sm text-muted-foreground">
                    {filtered ? "No se encontraron resultados" : "Aún no hay clientes"}
                  </p>
                  {!filtered && canWrite && (
                    <Link href="/customers/new" className="mt-2 inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground hover:bg-primary/90">
                      <Plus className="h-3 w-3" />
                      Crear primer cliente
                    </Link>
                  )}
                </TableCell>
              </TableRow>
            ) : (
              result.rows.map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell>
                    <Link href={`/customers/${customer.id}`} className="font-medium hover:underline">
                      {customer.legalName}
                    </Link>
                    {customer.code && (
                      <div className="text-xs text-muted-foreground">{customer.code}</div>
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
                    <Badge variant={customer.status === "activo" ? "default" : "secondary"}>
                      {CUSTOMER_STATUS_LABELS[customer.status as keyof typeof CUSTOMER_STATUS_LABELS]}
                    </Badge>
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
        </div>
      )}
    </div>
  );
}
