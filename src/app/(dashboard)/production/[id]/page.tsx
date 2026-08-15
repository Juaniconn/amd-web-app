import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductionMaterialsPanel } from "@/features/inventory/production-materials-panel";
import { ProductionAssignPanel } from "@/features/production/production-assign-panel";
import { ProductionReworkPanel } from "@/features/production/production-rework-panel";
import { ProductionStatusActions } from "@/features/production/production-status-actions";
import { ProductionTimePanel } from "@/features/production/production-time-panel";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePermission } from "@/lib/auth/session";
import {
  PRODUCTION_MONITORING_LABELS,
  PRODUCTION_PRIORITY_LABELS,
  PRODUCTION_ROUTE_STEP_KIND_LABELS,
  productionPriorityVariant,
} from "@/lib/production/catalog";
import {
  canAssignProduction,
  canEditProduction,
  canLogProductionTime,
  PRODUCTION_STATUS_LABELS,
} from "@/lib/production/status";
import { PERMISSION_IDS } from "@/lib/permissions/catalog";
import { listProductionActivity } from "@/server/services/activity";
import { listEngineeringDocuments, listQuoteDocuments } from "@/server/services/documents";
import {
  getProductionOrderById,
  listDowntimeReasons,
  listUsersForProduction,
} from "@/server/services/production";
import {
  listActiveMaterialsForSelect,
  listOrderMaterials,
} from "@/server/services/inventory";
import { listMachines, listWorkCenters } from "@/server/services/production-catalogs";
import { listProductionOrderDocuments } from "@/server/services/documents";
import { listMachineHours, listRework } from "@/server/services/production-time";

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

export default async function ProductionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { access } = await requirePermission(PERMISSION_IDS.productionView);
  const { id } = await params;
  const order = await getProductionOrderById(id);
  if (!order) notFound();

  const activity = await listProductionActivity(order.id);
  const reasons = await listDowntimeReasons();
  const users = await listUsersForProduction();
  const workCenters = await listWorkCenters({ activeOnly: true });
  const machines = await listMachines({ activeOnly: true });
  const machineEntries = await listMachineHours(order.id);
  const rework = await listRework(order.id);
  const orderMaterials = await listOrderMaterials(order.id);
  const catalogMaterials = await listActiveMaterialsForSelect();
  const attachedDocs = await listProductionOrderDocuments(order.id);
  const packageDocs =
    attachedDocs.length > 0
      ? attachedDocs
      : order.origin === "rfq_ingenieria" && order.engineeringRequestId
        ? await listEngineeringDocuments(order.engineeringRequestId)
        : await listQuoteDocuments(order.quoteId);
  const drawingsTitle =
    attachedDocs.length > 0
      ? "Plano de la OT"
      : order.origin === "rfq_ingenieria"
        ? "Paquete liberado"
        : "Adjuntos de RFQ";

  const status = order.status;
  const canUpdate = access.permissions.includes(PERMISSION_IDS.productionUpdate);
  const editable = canUpdate && canEditProduction(status);
  const assignable = canAssignProduction(status);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Orden de trabajo
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <h2 className="text-2xl font-semibold tracking-tight">{order.number}</h2>
            <Badge variant="secondary">{PRODUCTION_STATUS_LABELS[status]}</Badge>
            <Badge variant="outline">{PRODUCTION_MONITORING_LABELS[order.monitoring]}</Badge>
            {order.isDemo ? <Badge variant="outline">DEMO</Badge> : null}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            <Link href={`/customers/${order.customerId}`} className="hover:underline">
              {order.customerName}
            </Link>
            {" · Pedido "}
            <Link href={`/orders/${order.orderId}`} className="hover:underline">
              {order.orderNumber}
            </Link>
            {" · "}
            <Link href={`/quotes/${order.quoteId}`} className="hover:underline">
              {order.quoteNumber}
            </Link>
            {order.engineeringNumber ? (
              <>
                {" · "}
                <Link
                  href={`/engineering/${order.engineeringRequestId}`}
                  className="hover:underline"
                >
                  {order.engineeringNumber}
                </Link>
              </>
            ) : null}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/production" className={buttonVariants({ variant: "outline" })}>
            Volver
          </Link>
          {editable ? (
            <Link
              href={`/production/${order.id}/edit`}
              className={buttonVariants({ variant: "outline" })}
            >
              Editar
            </Link>
          ) : null}
        </div>
      </div>

      <ProductionStatusActions
        productionOrderId={order.id}
        status={status}
        downtimeReasons={reasons}
        permissions={access.permissions}
      />

      {assignable ? (
        <ProductionAssignPanel
          productionOrderId={order.id}
          workCenterId={order.workCenterId}
          machineId={order.machineId}
          operatorUserId={order.operatorUserId}
          workCenters={workCenters}
          machines={machines}
          users={users}
          canAssignCenter={access.permissions.includes(PERMISSION_IDS.productionSchedule)}
          canAssignMachine={access.permissions.includes(
            PERMISSION_IDS.productionAssignMachine,
          )}
          canAssignOperator={access.permissions.includes(
            PERMISSION_IDS.productionAssignOperator,
          )}
        />
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Información general</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Pedido" value={order.orderNumber} />
          <Field label="Cliente" value={order.customerName} />
          <Field label="RFQ" value={order.quoteNumber} />
          <Field label="Ingeniería" value={order.engineeringNumber} />
          <Field
            label="Origen"
            value={order.origin === "rfq_ingenieria" ? "RFQ + Ingeniería" : "RFQ directa"}
          />
          <Field label="Descripción" value={order.description} />
          <Field label="Cantidad" value={`${order.quantity} ${order.unit}`} />
          <Field
            label="Fecha prometida"
            value={order.promisedDate.toLocaleDateString("es-MX")}
          />
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Prioridad
            </p>
            <div className="mt-1">
              <Badge variant={productionPriorityVariant(order.priority)}>
                {PRODUCTION_PRIORITY_LABELS[order.priority]}
              </Badge>
            </div>
          </div>
          <Field label="Estado" value={PRODUCTION_STATUS_LABELS[status]} />
          <Field label="Centro" value={order.workCenterName} />
          <Field label="Máquina" value={order.machineName} />
          <Field label="Operador" value={order.operatorName} />
          <Field label="Observaciones" value={order.notes} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Material / reservas</CardTitle>
        </CardHeader>
        <CardContent>
          <ProductionMaterialsPanel
            productionOrderId={order.id}
            lines={orderMaterials}
            materials={catalogMaterials}
            canReserve={access.permissions.includes(PERMISSION_IDS.inventoryReserve)}
            canConsume={
              access.permissions.includes(PERMISSION_IDS.inventoryConsume) &&
              canLogProductionTime(status)
            }
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ruta / operaciones</CardTitle>
        </CardHeader>
        <CardContent>
          {order.operations.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Sin ruta asignada. Las rutas A/B/C y futuras se configuran en el
              catálogo.
            </p>
          ) : (
            <ol className="space-y-2 text-sm">
              {order.operations.map((step) => (
                <li key={step.id} className="rounded-lg border px-3 py-2">
                  {step.position}. {step.name} ·{" "}
                  {PRODUCTION_ROUTE_STEP_KIND_LABELS[step.kind]} · {step.status}
                  {step.workCenterName ? ` · ${step.workCenterName}` : ""}
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{drawingsTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          {packageDocs.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Esta OT no tiene plano asignado. Al crearla desde el pedido se
              eligen los archivos de cotización o ingeniería.
            </p>
          ) : (
            <ul className="space-y-2 text-sm">
              {packageDocs.map((doc) => (
                <li key={doc.id}>
                  <a
                    href={`/api/documents/${doc.id}`}
                    className="font-medium hover:underline"
                  >
                    {doc.originalName}
                  </a>
                  <span className="ml-2 text-xs text-muted-foreground">
                    Descargar
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Horas máquina</CardTitle>
        </CardHeader>
        <CardContent>
          <ProductionTimePanel
            productionOrderId={order.id}
            machineEntries={machineEntries}
            canWrite={canUpdate && canLogProductionTime(status)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Scrap y retrabajo</CardTitle>
        </CardHeader>
        <CardContent>
          <ProductionReworkPanel
            productionOrderId={order.id}
            rows={rework}
            canWrite={canUpdate}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Historial</CardTitle>
        </CardHeader>
        <CardContent>
          {activity.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin actividad.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {activity.map((item) => (
                <li key={item.id}>
                  {item.summary}
                  <span className="ml-2 text-xs text-muted-foreground">
                    {item.createdAt.toLocaleString("es-MX")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
