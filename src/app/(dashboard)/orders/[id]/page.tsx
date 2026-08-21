import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { OrderDocuments } from "@/features/orders/order-documents";
import { OrderStatusActions } from "@/features/orders/order-status-actions";
import { OrderTraceability } from "@/features/orders/order-traceability";
import { ProductionMaterialsPanel } from "@/features/inventory/production-materials-panel";
import { SendToDeliveryButton } from "@/features/orders/send-to-delivery-button";
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
import { partIdentity, workOrderNumber } from "@/lib/production/ot-number";
import {
  PRODUCTION_STATUS_LABELS,
  type ProductionStatus,
} from "@/lib/production/status";
import { isManufacturingItem } from "@/lib/quotes/items";
import {
  QUOTE_ENGINEERING_TYPE_LABELS,
  RFQ_TYPE_LABELS,
  type QuoteEngineeringType,
  type RfqType,
} from "@/lib/quotes/rfq";
import { listOrderActivity } from "@/server/services/activity";
import { getOrderById, resolveOrdersModuleId } from "@/server/services/orders";
import {
  listActiveMaterialsForSelect,
  listWorkOrderMaterials,
} from "@/server/services/inventory";
import { listPurchaseRequestsForOrder } from "@/server/services/purchasing";
import { getDeliveryByOrderId } from "@/server/services/deliveries";
import { displayQty } from "@/lib/inventory/catalog";
import { displayMoney } from "@/lib/quotes/money";

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
  const resolved = await resolveOrdersModuleId(id);
  if (!resolved) notFound();
  if (resolved.workOrderId) {
    redirect(`/production/${resolved.workOrderId}`);
  }

  const order = await getOrderById(resolved.orderId);
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
  const canReadPurchasing = access.permissions.includes(PERMISSION_IDS.purchasingRead);
  const canReserve =
    access.permissions.includes(PERMISSION_IDS.inventoryReserve) ||
    access.permissions.includes(PERMISSION_IDS.ordersUpdate);
  const canConsume = access.permissions.includes(PERMISSION_IDS.inventoryConsume);
  let orderMaterials: Awaited<ReturnType<typeof listWorkOrderMaterials>> = [];
  let catalogMaterials: Awaited<ReturnType<typeof listActiveMaterialsForSelect>> =
    [];
  let materialRequests: Awaited<ReturnType<typeof listPurchaseRequestsForOrder>> =
    [];
  let materialsLoadError: string | null = null;
  try {
    const loaded = await Promise.all([
      listWorkOrderMaterials(order.id),
      canReserve ? listActiveMaterialsForSelect() : Promise.resolve([]),
      listPurchaseRequestsForOrder(order.id),
    ]);
    orderMaterials = loaded[0];
    catalogMaterials = loaded[1];
    materialRequests = loaded[2];
  } catch {
    materialsLoadError =
      "No se pudo cargar el material de esta orden. Reintenta o avisa a sistemas si el error continúa.";
  }
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

  const titleNumber = workOrderNumber(order.number);
  const drawings = order.items.filter((item) => isManufacturingItem(item.kind));
  const drawingCountLabel =
    order.drawingCount === 1 ? "1 plano" : `${order.drawingCount} planos`;
  const activeParts = order.productionOrders.filter((ot) => ot.status !== "cancelada");
  const delivery = await getDeliveryByOrderId(order.id);
  const canSendToDelivery =
    !delivery &&
    access.permissions.includes(PERMISSION_IDS.ordersUpdate) &&
    activeParts.length > 0 &&
    activeParts.every((ot) => ot.status === "terminada" || ot.status === "entregada");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Orden de trabajo
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <h2 className="text-2xl font-semibold tracking-tight">{titleNumber}</h2>
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
            {` · ${drawingCountLabel}`}
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
          {canSendToDelivery ? <SendToDeliveryButton orderId={order.id} /> : null}
          {delivery ? (
            <Link href={`/deliveries/${delivery.id}`} className={buttonVariants({ variant: "outline" })}>
              Ver entrega {delivery.number}
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
                label: "Orden de trabajo",
                value: `${titleNumber} · ${ORDER_STATUS_LABELS[order.status as OrderStatus]}`,
              },
              {
                label: "Cantidad de planos",
                value: drawingCountLabel,
              },
              {
                label: "Materiales",
                href: "#materiales",
                value: "Reserva y consumo de la orden de trabajo",
              },
              { label: "Compras", value: "Módulo pendiente", muted: true },
              { label: "Calidad", value: "Cierre físico por número de parte", muted: true },
              { label: "Entrega", value: "Handoff de la OT", muted: true },
            ]}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Información general</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="ID" value={titleNumber} />
          <Field label="Cantidad de Planos" value={String(order.drawingCount)} />
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
            label="Estado"
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
          <Field label="Total" value={displayMoney(order.total, order.currency)} />
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

      <Card id="materiales" className="scroll-mt-24 overflow-visible">
        <CardHeader>
          <CardTitle>Materiales</CardTitle>
        </CardHeader>
        <CardContent>
          <ProductionMaterialsPanel
            orderId={order.id}
            lines={orderMaterials}
            materials={catalogMaterials}
            canReserve={canReserve && order.status !== "cancelado"}
            canConsume={canConsume && order.status !== "cancelado"}
            loadError={materialsLoadError}
            requests={materialRequests}
            canReadPurchasing={canReadPurchasing}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Números de Parte ({order.productionOrders.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {order.productionOrders.length === 0 ? (
            <div className="text-center py-6 space-y-3">
              <p className="text-sm text-muted-foreground">
                Aún no hay números de parte creados para esta orden.
              </p>
              {canCreateOt && (
                <Link
                  href={`/production/new?orderId=${order.id}`}
                  className={buttonVariants({ variant: "default", size: "sm" })}
                >
                  Crear número de parte
                </Link>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>PN Plano</TableHead>
                  <TableHead>Número de Parte</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Cantidad</TableHead>
                  <TableHead>Prioridad</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Centro</TableHead>
                  <TableHead>Máquina</TableHead>
                  <TableHead>Operador</TableHead>
                  <TableHead>Progreso</TableHead>
                  <TableHead>Fecha prometida</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {order.productionOrders.map((ot) => (
                  <TableRow key={ot.id}>
                    <TableCell className="font-mono font-bold">
                      {canReadProduction && ot.partNumber ? (
                        <Link
                          href={`/production/${ot.id}`}
                          className="text-blue-600 hover:underline"
                        >
                          {ot.partNumber}
                        </Link>
                      ) : (
                        <span>{ot.partNumber ?? "—"}</span>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {ot.number}
                    </TableCell>
                    <TableCell>{ot.quantity} {ot.unit}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {ot.priority === "urgente" ? "Urgente" :
                         ot.priority === "compromiso_inmediato" ? "Compromiso" :
                         ot.priority === "programada" ? "Programada" : "Normal"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={ot.status === "cancelada" ? "destructive" : "secondary"}>
                        {PRODUCTION_STATUS_LABELS[ot.status as ProductionStatus]}
                      </Badge>
                    </TableCell>
                    <TableCell>{ot.workCenterName ?? "—"}</TableCell>
                    <TableCell>{ot.machineName ?? "—"}</TableCell>
                    <TableCell>{ot.operatorName ?? "—"}</TableCell>
                    <TableCell>
                      {ot.operationsTotal > 0 ? (
                        <div className="flex items-center gap-2">
                          <div className="w-12 h-1.5 rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full bg-green-500"
                              style={{ width: `${Math.round((ot.operationsDone / ot.operationsTotal) * 100)}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {ot.operationsDone}/{ot.operationsTotal}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {new Date(ot.promisedDate).toLocaleDateString("es-MX")}
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
