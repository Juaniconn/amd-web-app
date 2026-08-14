import Link from "next/link";
import { CustomerFilters } from "@/features/customers/customer-filters";
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
  }>;
}) {
  const { access } = await requirePermission(PERMISSION_IDS.customersRead);
  const params = await searchParams;
  const q = first(params.q)?.trim() || undefined;
  const statusParsed = customerStatusSchema.safeParse(first(params.status));
  const typeParsed = customerTypeSchema.safeParse(first(params.type));
  const page = Number(first(params.page) ?? "1") || 1;
  const canWrite = access.permissions.includes(PERMISSION_IDS.customersWrite);

  const result = await listCustomers({
    q,
    status: statusParsed.success ? statusParsed.data : undefined,
    type: typeParsed.success ? typeParsed.data : undefined,
    page,
  });

  const query = new URLSearchParams();
  if (q) query.set("q", q);
  if (statusParsed.success) query.set("status", statusParsed.data);
  if (typeParsed.success) query.set("type", typeParsed.data);

  function pageHref(nextPage: number) {
    const next = new URLSearchParams(query);
    next.set("page", String(nextPage));
    return `/customers?${next.toString()}`;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Clientes</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            CRM de AMD Operations. Los registros DEMO no son clientes reales.
          </p>
        </div>
        {canWrite ? (
          <Link href="/customers/new" className={buttonVariants()}>
            Nuevo cliente
          </Link>
        ) : null}
      </div>

      <CustomerFilters
        q={q}
        status={statusParsed.success ? statusParsed.data : undefined}
        type={typeParsed.success ? typeParsed.data : undefined}
      />

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Empresa</TableHead>
              <TableHead>RFC</TableHead>
              <TableHead>Contacto principal</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {result.rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  No hay clientes con esos filtros.
                </TableCell>
              </TableRow>
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
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <p>
          {result.total} cliente{result.total === 1 ? "" : "s"} · página{" "}
          {result.page} de {result.pageCount}
        </p>
        <div className="flex gap-2">
          {result.page > 1 ? (
            <Link
              href={pageHref(result.page - 1)}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              Anterior
            </Link>
          ) : null}
          {result.page < result.pageCount ? (
            <Link
              href={pageHref(result.page + 1)}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              Siguiente
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
