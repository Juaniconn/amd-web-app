import Link from "next/link";
import { notFound } from "next/navigation";
import { OrderDocuments } from "@/features/orders/order-documents";
import { OrderStatusActions } from "@/features/orders/order-status-actions";
import { OrderTraceability } from "@/features/orders/order-traceability";
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
import { ENGINEERING_STATUS_LABELS, type EngineeringStatus } from "@/lib/engineering/status";
import {
  canEditOrder,
  ORDER_ORIGIN_LABELS,
  ORDER_STATUS_LABELS,
  type OrderStatus,
} from "@/lib/orders/status";
import { PERMISSION_IDS } from "@/lib/permissions/catalog";
import {
  PRODUCTION_STATUS_LABELS,
  type ProductionStatus,
} from "@/lib/production/status";
import { isManufacturingItem, QUOTE_ITEM_KIND_LABELS } from "@/lib/quotes/items";
import {
  QUOTE_ENGINEERING_TYPE_LABELS,
  RFQ_TYPE_LABELS,
  type QuoteEngineeringType,
  type RfqType,
} from "@/lib/quotes/rfq";
import { listOrderActivity } from "@/server/services/activity";
import { getOrderById } from "@/server/services/orders";

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

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { access } = await requirePermission(PERMISSION_IDS.ordersView);
  const { id } = await params;
  const order = await getOrderById(id);
  if (!order) notFound();

  const activity = await listOrderActivity(order.id);
  const canUpdate = access.permissions.includes(PERMISSION_IDS.ordersUpdate);
  const editable = canUpdate && canEditOrder(order.status as OrderStatus);
  const canReadQuotes = access.permissions.includes(PERMISSION_IDS.quotesRead);
  const canReadEngineering = access.permissions.includes(PERMISSION_IDS.engineeringRead);
  const canReadProduction = access.permissions.includes(PERMISSION_IDS.productionView);
  const canReadProjects = access.permissions.includes(PERMISSION_IDS.projectsView);
  const canCreateOt =
    access.permissions.includes(PERMISSION_IDS.productionCreate) &&
    (order.status === "aprobado" || order.status === "en_produccion");
  const otByItem = new Map<string, (typeof order.productionOrders)[number]>();
  for (const ot of order.productionOrders) {
    if (!ot.orderItemId) continue;
    const current = otByItem.get(ot.orderItemId);
    if (!current) {
      otByItem.set(ot.orderItemId, ot);
      continue;
    }
    if (current.status === "cancelada" && ot.status !== "cancelada") {
      otByItem.set(ot.orderItemId, ot);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-2xl font-semibold tracking-tight">{order.number}</h2>
            <Badge variant="secondary">
              {ORDER_STATUS_LABELS[order.status as OrderStatus]}
            </Badge>
            {order.isDemo ? <Badge variant="outline">DEMO</Badge> : null}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            <Link href={`/customers/${order.customerId}`} className="hover:underline">
              {order.customerName}
            </Link>
            {order.customerCode ? ` · ${order.customerCode}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/orders" className={buttonVariants({ variant: "outline" })}>
            Volver
          </Link>
          {editable ? (
            <Link
              href={`/orders/${order.id}/edit`}
              className={buttonVariants({ variant: "outline" })}
            >
              Editar
            </Link>
          ) : null}
          {canCreateOt ? (
            <Link href={`/production/new?orderId=${order.id}`} className={buttonVariants()}>
              Nueva OT
            </Link>
          ) : null}
        </div>
      </div>

      <OrderStatusActions
        orderId={order.id}
        status={order.status as OrderStatus}
        permissions={access.permissions}
        openOtCount={order.openOtCount}
      />

      <Card>
        <CardHeader>
          <CardTitle>Trazabilidad</CardTitle>
        </CardHeader>
        <CardContent>
          <OrderTraceability
            steps={[
              {
                label: "Cliente",
                href: `/customers/${order.customerId}`,
                value: order.customerName,
              },
              {
                label: "RFQ",
                href: canReadQuotes ? `/quotes/${order.quoteId}` : null,
                value: order.quoteNumber,
              },
              {
                label: "Ingeniería",
                href:
                  canReadEngineering && order.engineeringRequestId
                    ? `/engineering/${order.engineeringRequestId}`
                    : null,
                value: order.engineeringNumber
                  ? `${order.engineeringNumber} · ${ENGINEERING_STATUS_LABELS[order.engineeringStatus as EngineeringStatus]}`
                  : order.requiresEngineering
                    ? "Requerida"
                    : "No requerida",
                muted: !order.engineeringNumber,
              },
              {
                label: "Pedido",
                value: `${order.number} · ${ORDER_STATUS_LABELS[order.status as OrderStatus]}`,
              },
              {
                label: "OT",
                value:
                  order.productionOrders.length > 0
                    ? `${order.productionOrders.length} orden${order.productionOrders.length === 1 ? "" : "es"}`
                    : "Sin OT",
                muted: order.productionOrders.length === 0,
              },
              {
                label: "Inventario",
                href: canReadProduction ? "/inventory" : null,
                value: "Reservas / consumo en OT",
              },
              { label: "Compras", value: "Módulo pendiente", muted: true },
              { label: "Calidad", value: "Cierre físico en OT", muted: true },
              { label: "Entrega", value: "Handoff OT entregada", muted: true },
            ]}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Información general</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Número pedido" value={order.number} />
          <Field label="Cliente" value={order.customerName} />
          <Field label="RFQ origen" value={order.quoteNumber} />
          <Field label="Tipo RFQ" value={RFQ_TYPE_LABELS[order.rfqType as RfqType]} />
          <Field
            label="Ingeniería requerida"
            value={
              order.requiresEngineering
                ? order.quoteEngineeringType
                  ? QUOTE_ENGINEERING_TYPE_LABELS[
                      order.quoteEngineeringType as QuoteEngineeringType
                    ]
                  : "Sí"
                : "No"
            }
          />
          <Field
            label="Origen"
            value={ORDER_ORIGIN_LABELS[order.origin as keyof typeof ORDER_ORIGIN_LABELS]}
          />
          <Field
            label="Estado comercial"
            value={ORDER_STATUS_LABELS[order.status as OrderStatus]}
          />
          <Field
            label="Fecha creación"
            value={order.createdAt.toLocaleDateString("es-MX")}
          />
          <Field
            label="Fecha prometida"
            value={order.promisedDate?.toLocaleDateString("es-MX") ?? null}
          />
          <Field label="Responsable" value={order.ownerName} />
          <Field
            label="Proyecto"
            value={
              order.projectId && order.projectCode
                ? `${order.projectCode} · ${order.projectName}`
                : null
            }
          />
          <Field label="Total" value={money(order.total, order.currency)} />
        </CardContent>
      </Card>

      {order.projectId && canReadProjects ? (
        <p className="text-sm">
          Agrupado en{" "}
          <Link href={`/projects/${order.projectId}`} className="font-medium hover:underline">
            {order.projectCode}
          </Link>
          .
        </p>
      ) : null}

      {order.notes ? (
        <Card>
          <CardHeader>
            <CardTitle>Observaciones</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm">{order.notes}</p>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Partidas</CardTitle>
        </CardHeader>
        <CardContent>
          {order.items.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin partidas.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Parte</TableHead>
                  <TableHead className="text-right">Cantidad</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>OT</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {order.items.map((item) => {
                  const linked = otByItem.get(item.id);
                  const manufacturing = isManufacturingItem(item.kind);
                  const canIssue =
                    canCreateOt &&
                    manufacturing &&
                    (!linked || linked.status === "cancelada");
                  return (
                    <TableRow key={item.id}>
                      <TableCell>{item.position}</TableCell>
                      <TableCell>
                        {QUOTE_ITEM_KIND_LABELS[
                          item.kind as keyof typeof QUOTE_ITEM_KIND_LABELS
                        ] ?? "Pieza"}
                      </TableCell>
                      <TableCell>{item.description}</TableCell>
                      <TableCell>{item.partNumber ?? "—"}</TableCell>
                      <TableCell className="text-right">
                        {item.quantity} {item.unit}
                      </TableCell>
                      <TableCell className="text-right">
                        {money(item.lineTotal, order.currency)}
                      </TableCell>
                      <TableCell>
                        {!manufacturing ? (
                          <span className="text-muted-foreground">No genera OT</span>
                        ) : linked && linked.status !== "cancelada" ? (
                          canReadProduction ? (
                            <Link
                              href={`/production/${linked.id}`}
                              className="font-medium hover:underline"
                            >
                              {linked.number}
                            </Link>
                          ) : (
                            linked.number
                          )
                        ) : canIssue ? (
                          <Link
                            href={`/production/new?orderId=${order.id}&orderItemId=${item.id}`}
                            className="font-medium hover:underline"
                          >
                            Crear OT
                          </Link>
                        ) : (
                          "Sin OT"
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Órdenes de trabajo</CardTitle>
        </CardHeader>
        <CardContent>
          {order.productionOrders.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Este pedido aún no tiene OT. La conversión no crea piso.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>OT</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Parte</TableHead>
                  <TableHead>Prometida</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {order.productionOrders.map((ot) => (
                  <TableRow key={ot.id}>
                    <TableCell>
                      {canReadProduction ? (
                        <Link href={`/production/${ot.id}`} className="font-medium hover:underline">
                          {ot.number}
                        </Link>
                      ) : (
                        ot.number
                      )}
                    </TableCell>
                    <TableCell>
                      {PRODUCTION_STATUS_LABELS[ot.status as ProductionStatus]}
                    </TableCell>
                    <TableCell>{ot.partNumber ?? "—"}</TableCell>
                    <TableCell>{ot.promisedDate.toLocaleDateString("es-MX")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Documentos</CardTitle>
        </CardHeader>
        <CardContent>
          <OrderDocuments
            orderId={order.id}
            documents={order.documents}
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
