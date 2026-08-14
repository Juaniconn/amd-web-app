import Link from "next/link";
import { notFound } from "next/navigation";
import { ArchiveCustomerButton } from "@/features/customers/archive-customer-button";
import {
  ContactRowActions,
  CreateContactDialog,
} from "@/features/customers/contact-dialogs";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
} from "@/lib/validation/customers";
import { listCustomerActivity } from "@/server/services/activity";
import { getCustomerById } from "@/server/services/customers";
import { listEngineeringByCustomer } from "@/server/services/engineering";
import { listProductionByCustomer } from "@/server/services/production";
import { listQuotesByCustomer } from "@/server/services/quotes";
import { ENGINEERING_STATUS_LABELS, type EngineeringStatus } from "@/lib/engineering/status";
import {
  PRODUCTION_STATUS_LABELS,
  type ProductionStatus,
} from "@/lib/production/status";
import { QUOTE_STATUS_LABELS } from "@/lib/quotes/status";

const UPCOMING = [
  { label: "Pedidos", phase: "Fase 6+ UI" },
  { label: "Facturación / ventas", phase: "Posterior" },
  { label: "Pagos", phase: "Posterior" },
  { label: "Documentos", phase: "Fase 3+" },
];

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-sm">{value || "—"}</p>
    </div>
  );
}

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { access } = await requirePermission(PERMISSION_IDS.customersRead);
  const { id } = await params;
  const customer = await getCustomerById(id);

  if (!customer) {
    notFound();
  }

  const activity = await listCustomerActivity(customer.id);
  const canWrite = access.permissions.includes(PERMISSION_IDS.customersWrite);
  const canWriteQuotes = access.permissions.includes(PERMISSION_IDS.quotesWrite);
  const canReadQuotes = access.permissions.includes(PERMISSION_IDS.quotesRead);
  const quotes = canReadQuotes ? await listQuotesByCustomer(customer.id) : [];
  const canReadEngineering = access.permissions.includes(
    PERMISSION_IDS.engineeringRead,
  );
  const engineering = canReadEngineering
    ? await listEngineeringByCustomer(customer.id)
    : [];
  const canReadProduction = access.permissions.includes(
    PERMISSION_IDS.productionView,
  );
  const productionOrders = canReadProduction
    ? await listProductionByCustomer(customer.id)
    : [];
  const archived = Boolean(customer.deletedAt);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-2xl font-semibold tracking-tight">
              {customer.legalName}
            </h2>
            <Badge variant={customer.status === "activo" ? "secondary" : "outline"}>
              {CUSTOMER_STATUS_LABELS[customer.status]}
            </Badge>
            {customer.isDemo ? <Badge variant="outline">DEMO</Badge> : null}
            {archived ? <Badge variant="destructive">Archivado</Badge> : null}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {customer.code}
            {customer.tradeName ? ` · ${customer.tradeName}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/customers" className={buttonVariants({ variant: "outline" })}>
            Volver
          </Link>
          {canWrite && !archived ? (
            <>
              <Link
                href={`/customers/${customer.id}/edit`}
                className={buttonVariants({ variant: "outline" })}
              >
                Editar
              </Link>
              <ArchiveCustomerButton
                customerId={customer.id}
                legalName={customer.legalName}
              />
            </>
          ) : null}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Información general</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Nombre de empresa" value={customer.legalName} />
          <Field label="Nombre comercial" value={customer.tradeName} />
          <Field label="RFC" value={customer.rfc} />
          <Field label="Teléfono" value={customer.phone} />
          <Field label="Email" value={customer.email} />
          <Field label="Tipo" value={CUSTOMER_TYPE_LABELS[customer.type]} />
          <Field label="Dirección" value={customer.address} />
          <Field label="Ciudad" value={customer.city} />
          <Field label="Estado" value={customer.state} />
          <Field label="País" value={customer.country} />
          <Field
            label="Contacto principal"
            value={
              customer.primaryContact
                ? `${customer.primaryContact.name}${
                    customer.primaryContact.phone
                      ? ` · ${customer.primaryContact.phone}`
                      : ""
                  }`
                : null
            }
          />
          <Field
            label="Creado"
            value={customer.createdAt.toLocaleString("es-MX")}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <CardTitle>Contactos</CardTitle>
          {canWrite && !archived ? (
            <CreateContactDialog customerId={customer.id} />
          ) : null}
        </CardHeader>
        <CardContent>
          {customer.contacts.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Este cliente aún no tiene contactos.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Teléfono</TableHead>
                  <TableHead>WhatsApp</TableHead>
                  {canWrite && !archived ? (
                    <TableHead className="text-right">Acciones</TableHead>
                  ) : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {customer.contacts.map((contact) => (
                  <TableRow key={contact.id}>
                    <TableCell className="font-medium">
                      {contact.name}
                      {contact.isPrimary ? (
                        <Badge variant="secondary" className="ml-2">
                          Principal
                        </Badge>
                      ) : null}
                    </TableCell>
                    <TableCell>{contact.title ?? "—"}</TableCell>
                    <TableCell>{contact.email ?? "—"}</TableCell>
                    <TableCell>{contact.phone ?? "—"}</TableCell>
                    <TableCell>{contact.whatsapp ?? "—"}</TableCell>
                    {canWrite && !archived ? (
                      <TableCell>
                        <ContactRowActions
                          customerId={customer.id}
                          contact={contact}
                        />
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {canReadQuotes ? (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <CardTitle>Cotizaciones</CardTitle>
            {canWriteQuotes && !archived ? (
              <Link
                href={`/quotes/new?customerId=${customer.id}`}
                className={buttonVariants({ size: "sm" })}
              >
                Nueva cotización
              </Link>
            ) : null}
          </CardHeader>
          <CardContent>
            {quotes.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Este cliente aún no tiene cotizaciones.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Número</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {quotes.map((quote) => (
                    <TableRow key={quote.id}>
                      <TableCell>
                        <Link href={`/quotes/${quote.id}`} className="font-medium hover:underline">
                          {quote.number}
                        </Link>
                      </TableCell>
                      <TableCell>{QUOTE_STATUS_LABELS[quote.status]}</TableCell>
                      <TableCell>{quote.issueDate.toLocaleDateString("es-MX")}</TableCell>
                      <TableCell className="text-right">
                        {new Intl.NumberFormat("es-MX", {
                          style: "currency",
                          currency: quote.currency.toUpperCase(),
                        }).format(Number(quote.total))}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      ) : null}

      {canReadEngineering ? (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <CardTitle>Ingeniería</CardTitle>
            {access.permissions.includes(PERMISSION_IDS.engineeringCreate) && !archived ? (
              <Link
                href="/engineering/new"
                className={buttonVariants({ size: "sm" })}
              >
                Nueva solicitud
              </Link>
            ) : null}
          </CardHeader>
          <CardContent>
            {engineering.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Este cliente aún no tiene solicitudes de ingeniería.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Número</TableHead>
                    <TableHead>RFQ</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Compromiso</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {engineering.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <Link
                          href={`/engineering/${item.id}`}
                          className="font-medium hover:underline"
                        >
                          {item.number}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Link href={`/quotes/${item.quoteId}`} className="hover:underline">
                          {item.quoteNumber}
                        </Link>
                      </TableCell>
                      <TableCell>
                        {ENGINEERING_STATUS_LABELS[item.status as EngineeringStatus]}
                      </TableCell>
                      <TableCell>
                        {item.dueDate ? item.dueDate.toLocaleDateString("es-MX") : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      ) : null}

      {canReadProduction ? (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <CardTitle>Órdenes de trabajo</CardTitle>
            {access.permissions.includes(PERMISSION_IDS.productionCreate) && !archived ? (
              <Link href="/production/new" className={buttonVariants({ size: "sm" })}>
                Nueva OT
              </Link>
            ) : null}
          </CardHeader>
          <CardContent>
            {productionOrders.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Este cliente aún no tiene órdenes de trabajo.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>OT</TableHead>
                    <TableHead>Pedido</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Prometida</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {productionOrders.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <Link
                          href={`/production/${item.id}`}
                          className="font-medium hover:underline"
                        >
                          {item.number}
                        </Link>
                      </TableCell>
                      <TableCell>{item.orderNumber}</TableCell>
                      <TableCell>
                        {PRODUCTION_STATUS_LABELS[item.status as ProductionStatus]}
                      </TableCell>
                      <TableCell>
                        {item.promisedDate.toLocaleDateString("es-MX")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Notas</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="whitespace-pre-wrap text-sm">
            {customer.notes || "Sin notas."}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Historial</CardTitle>
        </CardHeader>
        <CardContent>
          {activity.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aún no hay actividad registrada.
            </p>
          ) : (
            <ul className="space-y-3">
              {activity.map((item) => (
                <li key={item.id} className="border-b pb-3 last:border-0 last:pb-0">
                  <p className="text-sm">{item.summary}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {item.createdAt.toLocaleString("es-MX")}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Módulos relacionados</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-muted-foreground">
            Estas secciones se conectarán cuando existan las fases
            correspondientes. No se muestran datos inventados.
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {UPCOMING.map((item) => (
              <div
                key={item.label}
                className="rounded-lg border bg-muted/40 px-4 py-3"
              >
                <p className="text-sm font-medium">{item.label}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Pendiente · {item.phase}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
