import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard, StatRow } from "@/components/shared/ui-patterns";
import { DeliveryStatusActions } from "@/features/deliveries/delivery-status-actions";
import { requirePermission } from "@/lib/auth/session";
import {
  DELIVERY_STATUS_LABELS,
  type DeliveryStatus,
} from "@/lib/deliveries/catalog";
import { PERMISSION_IDS } from "@/lib/permissions/catalog";
import { workOrderNumber, partIdentity } from "@/lib/production/ot-number";
import { displayQty } from "@/lib/inventory/catalog";
import { getDeliveryById } from "@/server/services/deliveries";
import {
  PRODUCTION_STATUS_LABELS,
  type ProductionStatus,
} from "@/lib/production/status";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm">{value || "—"}</p>
    </div>
  );
}

export default async function DeliveryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { access } = await requirePermission(PERMISSION_IDS.deliveriesRead);
  const { id } = await params;
  const delivery = await getDeliveryById(id);
  if (!delivery) notFound();
  const status = delivery.status as DeliveryStatus;
  const canWrite = access.permissions.includes(PERMISSION_IDS.deliveriesWrite);
  const canConfirm = access.permissions.includes(PERMISSION_IDS.deliveriesConfirm);

  return (
    <div className="space-y-4">
      <PageHeader
        title={delivery.number}
        description={`${DELIVERY_STATUS_LABELS[status]}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href="/deliveries" className={buttonVariants({ variant: "outline", size: "sm" })}>
              Volver
            </Link>
            {canWrite ? (
              <Link href={`/deliveries/${delivery.id}/edit`} className={buttonVariants({ size: "sm" })}>
                Programar fecha
              </Link>
            ) : null}
          </div>
        }
      />

      <StatRow>
        <StatCard
          label="Estado"
          value={DELIVERY_STATUS_LABELS[status]}
          tone={status === "entregado" ? "green" : status === "incidencia" ? "red" : "amber"}
        />
        <StatCard label="OT" value={workOrderNumber(delivery.orderNumber)} />
        <StatCard label="Partes" value={delivery.parts?.length ?? 0} />
      </StatRow>

      <Card>
        <CardHeader>
          <CardTitle>Datos de envío</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Orden de trabajo" value={workOrderNumber(delivery.orderNumber)} />
          <Field label="Cliente" value={delivery.customerName} />
          <Field
            label="Sucursal"
            value={delivery.branchCode ? `${delivery.branchCode} · ${delivery.branchName}` : null}
          />
          <Field
            label="Programada"
            value={delivery.scheduledDate?.toLocaleDateString("es-MX") ?? null}
          />
          <Field label="Transportista" value={delivery.carrier} />
          <Field label="Guía" value={delivery.trackingNumber} />
          <Field
            label="Dirección"
            value={[
              delivery.shippingAddress,
              delivery.shippingCity,
              delivery.shippingState,
              delivery.shippingCountry,
            ]
              .filter(Boolean)
              .join(" · ")}
          />
          <Field label="Notas" value={delivery.notes} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Números de parte a entregar</CardTitle>
        </CardHeader>
        <CardContent>
          {delivery.parts.filter((part) => part.status !== "cancelada").length === 0 ? (
            <p className="text-sm text-muted-foreground">Esta OT no tiene números de parte.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número de parte</TableHead>
                  <TableHead>Cantidad</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {delivery.parts
                  .filter((part) => part.status !== "cancelada")
                  .map((part) => (
                    <TableRow key={part.id}>
                      <TableCell>
                        <Link href={`/production/${part.id}`} className="hover:underline">
                          {partIdentity(part.partNumber, part.number)}
                        </Link>
                      </TableCell>
                      <TableCell>{displayQty(part.quantity)}</TableCell>
                      <TableCell>
                        {PRODUCTION_STATUS_LABELS[part.status as ProductionStatus]}
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Flujo</CardTitle>
        </CardHeader>
        <CardContent>
          <DeliveryStatusActions
            id={delivery.id}
            status={status}
            canWrite={canWrite}
            canConfirm={canConfirm}
          />
        </CardContent>
      </Card>
      <Link href={`/orders/${delivery.orderId}`} className="text-sm underline">
        Ver orden de trabajo
      </Link>
    </div>
  );
}
