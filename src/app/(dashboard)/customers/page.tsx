import Link from "next/link";
import { CustomerFilters } from "@/features/customers/customer-filters";
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
import { PERMISSION_IDS } from "@/lib/permissions/catalog";
import {
  CUSTOMER_STATUS_LABELS,
  CUSTOMER_TYPE_LABELS,
  customerStatusSchema,
  customerTypeSchema,
} from "@/lib/validation/customers";
import { listCustomers } from "@/server/services/customers";
import { parsePage, parsePageSize } from "@/lib/ui/pagination";

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

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
  const q = first(params.q)?.trim() || undefined;
  const statusParsed = customerStatusSchema.safeParse(first(params.status));
  const typeParsed = customerTypeSchema.safeParse(first(params.type));
  const page = parsePage(first(params.page));
  const pageSize = parsePageSize(first(params.perPage));
  const canWrite = access.permissions.includes(PERMISSION_IDS.customersWrite);
  const filtered = Boolean(q || statusParsed.success || typeParsed.success);

  const result = await listCustomers({
    q,
    status: statusParsed.success ? statusParsed.data : undefined,
    type: typeParsed.success ? typeParsed.data : undefined,
    page,
    pageSize,
  });

  const query = new URLSearchParams();
  if (q) query.set("q", q);
  if (statusParsed.success) query.set("status", statusParsed.data);
  if (typeParsed.success) query.set("type", typeParsed.data);
  query.set("perPage", String(pageSize));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clientes"
        description="Empresas, contactos y datos de envío para cotizar y entregar."
        actions={
          canWrite ? (
            <Link href="/customers/new" className={buttonVariants()}>
              Nuevo cliente
            </Link>
          ) : null
        }
      />

      <CustomerFilters
        q={q}
        status={statusParsed.success ? statusParsed.data : undefined}
        type={typeParsed.success ? typeParsed.data : undefined}
        perPage={pageSize}
      />

      <TableCard>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Empresa</TableHead>
              <TableHead>RFC</TableHead>
              <TableHead>Teléfono</TableHead>
              <TableHead>Contacto principal</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {result.rows.length === 0 ? (
              <EmptyTable
                colSpan={7}
                title={filtered ? "No hay clientes con esos filtros." : "Aún no hay clientes."}
                description={
                  filtered
                    ? "Prueba otra búsqueda o limpia los filtros."
                    : "Captura la empresa y el contacto de compras para cotizar."
                }
                href={!filtered && canWrite ? "/customers/new" : undefined}
                actionLabel="Nuevo cliente"
              />
            ) : (
              result.rows.map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell className="font-mono text-xs">{customer.code}</TableCell>
                  <TableCell>
                    <Link
                      href={`/customers/${customer.id}`}
                      className="font-medium hover:underline"
                    >
                      {customer.legalName}
                    </Link>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {customer.tradeName ? (
                        <span className="text-xs text-muted-foreground">
                          {customer.tradeName}
                        </span>
                      ) : null}
                      {customer.isDemo ? (
                        <Badge variant="outline">DEMO</Badge>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell>{customer.rfc ?? "—"}</TableCell>
                  <TableCell>{customer.phone ?? "—"}</TableCell>
                  <TableCell>
                    {customer.primaryContactName ? (
                      <div>
                        <p>{customer.primaryContactName}</p>
                        <p className="text-xs text-muted-foreground">
                          {customer.primaryContactPhone ||
                            customer.primaryContactEmail ||
                            ""}
                        </p>
                      </div>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>{CUSTOMER_TYPE_LABELS[customer.type]}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        customer.status === "activo" ? "secondary" : "outline"
                      }
                    >
                      {CUSTOMER_STATUS_LABELS[customer.status]}
                    </Badge>
                  </TableCell>
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
        label={result.total === 1 ? "cliente" : "clientes"}
        path="/customers"
        query={query}
        pageSize={pageSize}
      />
    </div>
  );
}
