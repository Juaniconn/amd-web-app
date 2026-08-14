import Link from "next/link";
import { notFound } from "next/navigation";
import { ArchiveQuoteButton } from "@/features/quotes/archive-quote-button";
import { QuoteDocuments } from "@/features/quotes/quote-documents";
import { QuoteItemsPanel } from "@/features/quotes/quote-items-panel";
import { QuoteStatusActions } from "@/features/quotes/quote-status-actions";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePermission } from "@/lib/auth/session";
import { PERMISSION_IDS } from "@/lib/permissions/catalog";
import { ENGINEERING_STATUS_LABELS, type EngineeringStatus } from "@/lib/engineering/status";
import {
  QUOTE_ENGINEERING_STATUS_LABELS,
  QUOTE_ENGINEERING_TYPE_LABELS,
  RFQ_TYPE_LABELS,
} from "@/lib/quotes/rfq";
import { QUOTE_STATUS_LABELS, canEditQuote } from "@/lib/quotes/status";
import { listQuoteActivity } from "@/server/services/activity";
import { getQuoteById } from "@/server/services/quotes";

function money(value: string, currency: string) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(Number(value));
}

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

export default async function QuoteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { access } = await requirePermission(PERMISSION_IDS.quotesRead);
  const { id } = await params;
  const quote = await getQuoteById(id);
  if (!quote) notFound();

  const activity = await listQuoteActivity(quote.id);
  const canWrite = access.permissions.includes(PERMISSION_IDS.quotesWrite);
  const canReadEngineering = access.permissions.includes(
    PERMISSION_IDS.engineeringRead,
  );
  const editable = canWrite && canEditQuote(quote.status) && !quote.deletedAt;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-2xl font-semibold tracking-tight">{quote.number}</h2>
            <Badge variant="secondary">{QUOTE_STATUS_LABELS[quote.status]}</Badge>
            {quote.isDemo ? <Badge variant="outline">DEMO</Badge> : null}
            {quote.deletedAt ? <Badge variant="destructive">Archivada</Badge> : null}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            <Link href={`/customers/${quote.customerId}`} className="hover:underline">
              {quote.customerName}
            </Link>
            {quote.customerCode ? ` · ${quote.customerCode}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/quotes" className={buttonVariants({ variant: "outline" })}>
            Volver
          </Link>
          {editable ? (
            <Link
              href={`/quotes/${quote.id}/edit`}
              className={buttonVariants({ variant: "outline" })}
            >
              Editar
            </Link>
          ) : null}
          {canWrite && !quote.deletedAt && quote.status !== "convertida" ? (
            <ArchiveQuoteButton quoteId={quote.id} number={quote.number} />
          ) : null}
        </div>
      </div>

      {canWrite && !quote.deletedAt ? (
        <QuoteStatusActions
          quoteId={quote.id}
          status={quote.status}
          requiresEngineering={quote.requiresEngineering}
          engineeringStatus={quote.engineeringStatus}
        />
      ) : null}

      {quote.orderNumber ? (
        <p className="rounded-lg border bg-muted/40 px-4 py-3 text-sm">
          Pedido creado: <span className="font-medium">{quote.orderNumber}</span>
          . La vista completa del pedido se construye después de Ingeniería. El origen
          queda registrado para Producción (Fase 5).
        </p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Información general</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Cliente" value={quote.customerName} />
          <Field label="Contacto" value={quote.contactName} />
          <Field label="Moneda" value={quote.currency.toUpperCase()} />
          <Field label="Fecha" value={quote.issueDate.toLocaleDateString("es-MX")} />
          <Field
            label="Vigencia"
            value={quote.validUntil?.toLocaleDateString("es-MX") ?? null}
          />
          <Field label="Condiciones de pago" value={quote.paymentTerms} />
          <Field label="Tiempo de entrega" value={quote.leadTime} />
          <Field label="Tipo de RFQ" value={RFQ_TYPE_LABELS[quote.rfqType]} />
          <Field
            label="Requiere ingeniería"
            value={quote.requiresEngineering ? "Sí" : "No"}
          />
          <Field
            label="Tipo ingeniería"
            value={
              quote.engineeringType
                ? QUOTE_ENGINEERING_TYPE_LABELS[quote.engineeringType]
                : null
            }
          />
          <Field
            label="Estado ingeniería"
            value={QUOTE_ENGINEERING_STATUS_LABELS[quote.engineeringStatus]}
          />
          <Field label="Subtotal" value={money(quote.subtotal, quote.currency)} />
          <Field label="IVA" value={money(quote.taxTotal, quote.currency)} />
          <Field label="Total" value={money(quote.total, quote.currency)} />
          <Field label="Costo estimado" value={money(quote.estimatedCost, quote.currency)} />
          <Field
            label="Utilidad estimada"
            value={money(quote.estimatedProfit, quote.currency)}
          />
          <Field
            label="Margen"
            value={quote.marginPercent ? `${quote.marginPercent}%` : null}
          />
        </CardContent>
      </Card>

      {quote.notes ? (
        <Card>
          <CardHeader>
            <CardTitle>Notas / RFQ</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm">{quote.notes}</p>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Ingeniería</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {quote.engineering ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p>
                Solicitud{" "}
                {canReadEngineering ? (
                  <Link
                    href={`/engineering/${quote.engineering.id}`}
                    className="font-medium hover:underline"
                  >
                    {quote.engineering.number}
                  </Link>
                ) : (
                  <span className="font-medium">{quote.engineering.number}</span>
                )}{" "}
                · {ENGINEERING_STATUS_LABELS[quote.engineering.status as EngineeringStatus]}
              </p>
              {canReadEngineering ? (
                <Link
                  href={`/engineering/${quote.engineering.id}`}
                  className={buttonVariants({ variant: "outline", size: "sm" })}
                >
                  Abrir ingeniería
                </Link>
              ) : null}
            </div>
          ) : quote.requiresEngineering ? (
            <p className="text-muted-foreground">
              Esta RFQ requiere ingeniería. La solicitud se crea al guardar la
              cotización o desde el módulo Ingeniería.
            </p>
          ) : (
            <p className="text-muted-foreground">
              Escenario B: el cliente entrega plano. Ingeniería es opcional.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Partidas</CardTitle>
        </CardHeader>
        <CardContent>
          <QuoteItemsPanel
            quoteId={quote.id}
            currency={quote.currency}
            items={quote.items}
            canWrite={editable}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Archivos</CardTitle>
        </CardHeader>
        <CardContent>
          <QuoteDocuments
            quoteId={quote.id}
            documents={quote.documents}
            canWrite={editable}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Historial</CardTitle>
        </CardHeader>
        <CardContent>
          {activity.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aún no hay actividad registrada.</p>
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
    </div>
  );
}
