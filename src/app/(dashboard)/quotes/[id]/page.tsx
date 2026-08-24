import Link from "next/link";
import { notFound } from "next/navigation";
import { ArchiveQuoteButton } from "@/features/quotes/archive-quote-button";
import { QuoteItemsPanel } from "@/features/quotes/quote-items-panel";
import { GenerateEngineeringPartidasButton } from "@/features/quotes/quote-drawing-intake";
import { QuoteStatusActions } from "@/features/quotes/quote-status-actions";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard, StatRow } from "@/components/shared/ui-patterns";
import { PageHeader } from "@/components/layout/page-header";
import { requirePermission } from "@/lib/auth/session";
import { PERMISSION_IDS } from "@/lib/permissions/catalog";
import { ENGINEERING_STATUS_LABELS, type EngineeringStatus } from "@/lib/engineering/status";
import {
  QUOTE_ENGINEERING_STATUS_LABELS,
  QUOTE_ENGINEERING_TYPE_LABELS,
  RFQ_TYPE_LABELS,
  isEngineeringReleasedForQuote,
  rfqBlocksEngineering,
  rfqLocksItemsUntilRelease,
} from "@/lib/quotes/rfq";
import { PAYMENT_TERM_LABELS, formatShippingAddress, type PaymentTerm } from "@/lib/quotes/commercial";
import { QUOTE_STATUS_LABELS, canEditQuote, canEditQuoteItems } from "@/lib/quotes/status";
import { displayMoney } from "@/lib/quotes/money";
import { workOrderNumber } from "@/lib/production/ot-number";
import { listQuoteActivity } from "@/server/services/activity";
import { getQuoteById } from "@/server/services/quotes";
import { Calendar, DollarSign, FileText, Clock, CheckCircle, AlertCircle } from "lucide-react";

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

function statusTone(status: string) {
  if (status === "aprobada" || status === "convertida") return "emerald";
  if (status === "enviada" || status === "en_revision") return "amber";
  if (status === "rechazada" || status === "expirada") return "red";
  return "gray";
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
  const engineeringReleased = isEngineeringReleasedForQuote({
    engineeringRequestStatus: quote.engineering?.status,
    quoteEngineeringStatus: quote.engineeringStatus,
  });
  const canWriteItems =
    editable &&
    canEditQuoteItems({
      status: quote.status,
      rfqType: quote.rfqType,
      engineeringReleased,
    });
  const itemsLockedReason =
    editable && rfqLocksItemsUntilRelease(quote.rfqType) && !engineeringReleased
      ? "Diseño + fabricación: las partidas se generan cuando Ingeniería libera el plano PDF."
      : undefined;

  const tone = statusTone(quote.status);

  // KPIs calculados de los datos ya traídos
  const itemCount = quote.items.length;
  const activityCount = activity.length;
  const hasEngineering = quote.requiresEngineering;

  return (
    <div className="space-y-6">
      <PageHeader
        title={quote.number}
        description={`Cotización para ${quote.customerName}${quote.customerCode ? ` · ${quote.customerCode}` : ""}`}
        actions={
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
            {!quote.deletedAt ? (
              <Link
                href={`/quotes/${quote.id}/vista`}
                className={buttonVariants({ variant: "outline" })}
              >
                Vista
              </Link>
            ) : null}
            {!quote.deletedAt ? (
              <a
                href={`/api/quotes/${quote.id}/pdf`}
                className={buttonVariants({ variant: "outline" })}
              >
                Descargar PDF
              </a>
            ) : null}
          </div>
        }
      />

      {/* Status badges */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 text-sm">
          <span
            className={`h-2.5 w-2.5 rounded-full ${
              tone === "emerald"
                ? "bg-emerald-500"
                : tone === "amber"
                  ? "bg-amber-500"
                  : tone === "red"
                    ? "bg-red-500"
                    : "bg-gray-400"
            }`}
          />
          <Badge variant="secondary">{QUOTE_STATUS_LABELS[quote.status]}</Badge>
        </span>
        {quote.isDemo ? <Badge variant="outline">DEMO</Badge> : null}
        {quote.deletedAt ? <Badge variant="destructive">Archivada</Badge> : null}
        <Badge variant="outline" className="text-[10px]">
          {RFQ_TYPE_LABELS[quote.rfqType]}
        </Badge>
      </div>

      {/* KPIs */}
      <StatRow>
        <StatCard
          label="Total"
          value={displayMoney(quote.total, quote.currency)}
          icon={<DollarSign className="h-4 w-4" />}
          tone="green"
        />
        <StatCard
          label="Partidas"
          value={itemCount}
          icon={<FileText className="h-4 w-4" />}
        />
        <StatCard
          label="Vigencia"
          value={quote.validUntil ? new Date(quote.validUntil).toLocaleDateString("es-MX") : "—"}
          icon={<Calendar className="h-4 w-4" />}
          tone={quote.validUntil && new Date(quote.validUntil) < new Date() ? "red" : "neutral"}
        />
        <StatCard
          label="Actividad"
          value={activityCount}
          icon={<Clock className="h-4 w-4" />}
          hint="registros"
        />
      </StatRow>

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
          Orden de trabajo:{" "}
          {quote.orderId ? (
            <Link href={`/orders/${quote.orderId}`} className="font-medium hover:underline">
              {workOrderNumber(quote.orderNumber)}
            </Link>
          ) : (
            <span className="font-medium">{workOrderNumber(quote.orderNumber)}</span>
          )}
          . Cada partida de fabricación ya tiene su número de parte.
        </p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Información general</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Cliente" value={quote.customerName} />
          <Field
            label="Sucursal"
            value={
              quote.branchName
                ? `${quote.branchCode ?? ""} · ${quote.branchName}`.trim()
                : null
            }
          />
          <Field
            label="Datos fiscales sucursal"
            value={[quote.branchPhone, quote.branchEmail, quote.branchRfc]
              .filter(Boolean)
              .join(" · ")}
          />
          <Field
            label="Contacto"
            value={
              quote.contactName
                ? `${quote.contactName}${quote.contactPhone ? ` · ${quote.contactPhone}` : ""}`
                : null
            }
          />
          <Field
            label="Destinatario"
            value={
              quote.addresseeMode === "departamento"
                ? quote.contactDepartment || quote.contactTitle || quote.contactName
                : quote.contactName
            }
          />
          <Field
            label="Dirección de envío"
            value={formatShippingAddress({
              shippingAddress: quote.shippingAddress,
              shippingCity: quote.shippingCity,
              shippingState: quote.shippingState,
              shippingPostalCode: quote.shippingPostalCode,
              shippingCountry: quote.shippingCountry,
            })}
          />
          <Field label="Moneda" value={quote.currency.toUpperCase()} />
          <Field label="Fecha" value={quote.issueDate.toLocaleDateString("es-MX")} />
          <Field
            label="Vigencia"
            value={quote.validUntil?.toLocaleDateString("es-MX") ?? null}
          />
          <Field
            label="Condiciones de pago"
            value={
              (quote.paymentTerm &&
                PAYMENT_TERM_LABELS[quote.paymentTerm as PaymentTerm]) ||
              quote.paymentTerms
            }
          />
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
          <Field label="Subtotal" value={displayMoney(quote.subtotal, quote.currency)} />
          <Field label="IVA" value={displayMoney(quote.taxTotal, quote.currency)} />
          <Field label="Total" value={displayMoney(quote.total, quote.currency)} />
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
          {rfqBlocksEngineering(quote.rfqType) ? (
            <p className="text-muted-foreground">
              Solo fabricación: el cliente manda el plano por correo. Sube el PDF
              abajo; el agente arma el preliminar de mercado.
            </p>
          ) : quote.engineering ? (
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
              <div className="flex flex-wrap items-center gap-2">
                {canReadEngineering ? (
                  <Link
                    href={`/engineering/${quote.engineering.id}`}
                    className={buttonVariants({ variant: "outline", size: "sm" })}
                  >
                    Abrir ingeniería
                  </Link>
                ) : null}
                {canWriteItems && engineeringReleased ? (
                  <GenerateEngineeringPartidasButton quoteId={quote.id} />
                ) : null}
              </div>
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
          <CardDescription>
            {rfqBlocksEngineering(quote.rfqType)
              ? "Sube PDF de planos (varios o un ZIP). El agente arma un preliminar de mercado; ajustas la cantidad y confirmas las partidas."
              : engineeringReleased
                ? "Al liberar ingeniería, los planos pasan a partidas y se puede armar el preliminar desde PDF."
                : "Las partidas se generan cuando Ingeniería libera el plano PDF."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <QuoteItemsPanel
            quoteId={quote.id}
            currency={quote.currency}
            items={quote.items}
            canWrite={canWriteItems}
            lockedReason={itemsLockedReason}
            engineeringDocuments={quote.engineeringDocuments}
            rfqType={quote.rfqType}
            engineeringReleased={engineeringReleased}
            preview={quote.agentPreview ?? null}
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