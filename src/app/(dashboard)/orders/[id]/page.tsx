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
import { PageHeader } from "@/components/layout/page-header";
import { StatCard, StatRow } from "@/components/shared/ui-patterns";
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
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Cog,
  FileText,
  Package,
  PlayCircle,
  XCircle,
} from "lucide-react";

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

function statusSemaforo(status: OrderStatus) {
  if (status === "completado") return "bg-emerald-500";
  if (status === "cancelado") return "bg-red-500";
  return "bg-amber-500";
}

function partStatusSemaforo(status: ProductionStatus) {
  if (status === "terminada" || status === "entregada") return "bg-emerald-500";
  if (status === "cancelada" || status === "esperando_material") return "bg-red-500";
  return "bg-amber-500";
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

  // KPIs
  const totalParts = order.productionOrders.length;
  const completedParts = order.productionOrders.filter(
    (ot) => ot.status === "terminada" || ot.status === "entregada",
  ).length;
  const inProgressParts = order.productionOrders.filter(
    (ot) => ot.status === "en_produccion",
  ).length;
  const cancelledParts = order.productionOrders.filter((ot) => ot.status === "cancelada").length;

  return (
    <div className="space-y-4">
      <PageHeader
        title={titleNumber}
        description={`${ORDER_STATUS_LABELS[order.status as OrderStatus]}${order.isDemo ? " · DEMO" : ""}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href="/orders" className={buttonVariants({ variant: "outline", size: "sm" })}>
              Volver
            </Link>
            {editable ? (
              <Link
                href={`/orders/${order.id}/edit`}
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                Editar
              </Link>
            ) : null}
            {canSendToDelivery ? <SendToDeliveryButton orderId={order.id} /> : null}
            {delivery ? (
              <Link href={`/deliveries/${delivery.id}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
                Ver entrega {delivery.number}
              </Link>
            ) : null}
          </div>
        }
      />

      {/* Semáforo status bar */}
      <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2">
        <span className={`h-2.5 w-2.5 rounded-full ${statusSemaforo(order.status as OrderStatus)}`} />
        <span className="text-sm font-medium">
          {ORDER_STATUS_LABELS[order.status as OrderStatus]}
        </span>
        {order.isDemo && <Badge variant="outline">DEMO</Badge>}
      </div>

      {/* Breadcrumb / contexto */}
      <div className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
        <Link href={`/customers/${order.customerId}`} className="hover:underline">
          {order.customerName}
        </Link>
        {order.customerCode && <span>· {order.customerCode}</span>}
        <span>·</span>
        <span>{drawingCountLabel}</span>
      </div>

      {/* KPIs */}
      <StatRow>
        <StatCard
          label="Estado"
          value={ORDER_STATUS_LABELS[order.status as OrderStatus]}
          tone={order.status === "completado" ? "green" : order.status === "cancelado" ? "red" : "amber"}
          icon={<AlertCircle className="h-4 w-4" />}
        />
        <StatCard
          label="Planos"
          value={order.drawingCount}
          icon={<FileText className="h-4 w-4" />}
        />
        <StatCard
          label="Números de Parte"
          value={`${completedParts}/${totalParts}`}
          tone={completedParts === totalParts && totalParts > 0 ? "green" : "neutral"}
          icon={<Cog className="h-4 w-4" />}
        />
        <StatCard
          label="En producción"
          value={inProgressParts}
          tone={inProgressParts > 0 ? "amber" : "neutral"}
          icon={<PlayCircle className="h-4 w-4" />}
        />
      </StatRow>

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
        <div className="rounded-lg border bg-card px-3 py-2 text-sm">
          Agrupado en{" "}
          <Link href={`/projects/${order.projectId}`} className="font-medium hover:underline">
            {order.projectCode}
          </Link>
          .
        </div>
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

      {/* Números de Parte - Tabla con PN Plano como columna primaria y Progreso */}
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
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>PN Plano</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Proceso Actual</TableHead>
                    <TableHead>Progreso</TableHead>
                    <TableHead>Prometida</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.productionOrders.map((ot) => {
                    const progress =
                      ot.operationsTotal > 0
                        ? Math.round((ot.operationsDone / ot.operationsTotal) * 100)
                        : 0;
                    const isClosed = ot.status === "terminada" || ot.status === "entregada";
                    const isCancelled = ot.status === "cancelada";

                    return (
                      <TableRow key={ot.id} className={isCancelled ? "opacity-60" : ""}>
                        {/* PN Plano - columna primaria */}
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className={`h-2 w-2 shrink-0 rounded-full ${partStatusSemaforo(ot.status as ProductionStatus)}`} />
                            {canReadProduction ? (
                              <Link
                                href={`/production/${ot.id}`}
                                className="font-mono text-sm font-bold text-blue-600 hover:underline"
                              >
                                {ot.partNumber ?? ot.number}
                              </Link>
                            ) : (
                              <span className="font-mono text-sm font-bold">
                                {ot.partNumber ?? ot.number}
                              </span>
                            )}
                          </div>
                          <div className="ml-4 text-xs text-muted-foreground">
                            Cant: {Number(ot.quantity)} {ot.unit}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                          {ot.description}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={isCancelled ? "destructive" : isClosed ? "default" : "secondary"}
                            className="text-[10px]"
                          >
                            {PRODUCTION_STATUS_LABELS[ot.status as ProductionStatus]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {ot.currentOperationName ? (
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                                  ot.currentOperationStatus === "en_proceso"
                                    ? "bg-amber-500"
                                    : "bg-gray-400"
                                }`}
                              />
                              <div className="min-w-0">
                                <div className="truncate text-xs font-medium max-w-[140px]">
                                  {ot.currentOperationPosition}. {ot.currentOperationName}
                                </div>
                                <div className="text-[10px] text-muted-foreground">
                                  {ot.currentOperationStatus === "en_proceso"
                                    ? "en curso"
                                    : "pendiente"}
                                  {ot.currentOperationOperator
                                    ? ` · ${ot.currentOperationOperator}`
                                    : ""}
                                </div>
                              </div>
                            </div>
                          ) : ot.operationsTotal > 0 ? (
                            <span className="text-xs font-medium text-green-600">
                              Todos los procesos terminados
                            </span>
                          ) : (
                            <span className="text-xs italic text-muted-foreground">
                              Sin procesos definidos
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {ot.operationsTotal > 0 ? (
                            <div className="space-y-1 min-w-[100px]">
                              <div className="flex items-center gap-2">
                                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                                  <div
                                    className={`h-full transition-all ${
                                      progress === 100 ? "bg-green-500" : "bg-blue-500"
                                    }`}
                                    style={{ width: `${progress}%` }}
                                  />
                                </div>
                                <span className="text-xs font-medium w-8 text-right">{progress}%</span>
                              </div>
                              <div className="text-[10px] text-muted-foreground">
                                {ot.operationsDone}/{ot.operationsTotal} procesos
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            {new Date(ot.promisedDate).toLocaleDateString("es-MX")}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
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