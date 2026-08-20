import Link from "next/link";
import { notFound } from "next/navigation";
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
  productionPriorityVariant,
} from "@/lib/production/catalog";
import { displayQty } from "@/lib/inventory/catalog";
import {
  canAssignProduction,
  canEditProduction,
  canLogProductionTime,
  PRODUCTION_STATUS_LABELS,
} from "@/lib/production/status";
import { PERMISSION_IDS } from "@/lib/permissions/catalog";
import { partIdentity, workOrderNumber } from "@/lib/production/ot-number";
import { listProductionActivity } from "@/server/services/activity";
import { listEngineeringDocuments, listQuoteDocuments } from "@/server/services/documents";
import {
  getProductionOrderById,
  listDowntimeReasons,
  listUsersForProduction,
} from "@/server/services/production";
import { listMachines, listWorkCenters } from "@/server/services/production-catalogs";
import { listProductionOrderDocuments } from "@/server/services/documents";
import { listMachineHours, listRework } from "@/server/services/production-time";
import {
  getQualityCloseState,
  listInspectionsForOrder,
} from "@/server/services/quality";
import {
  INSPECTION_RESULT_LABELS,
  INSPECTION_TYPE_LABELS,
  type InspectionResult,
  type InspectionType,
} from "@/lib/quality/catalog";

function Field({
  label,
  value,
  href,
}: {
  label: string;
  value?: string | null;
  href?: string | null;
}) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      {href && value ? (
        <Link href={href} className="mt-1 block text-sm hover:underline">
          {value}
        </Link>
      ) : (
        <p className="mt-1 text-sm">{value || "—"}</p>
      )}
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
  const attachedDocs = await listProductionOrderDocuments(order.id);
  const qualityState = await getQualityCloseState(order.id);
  const inspections = await listInspectionsForOrder(order.id);
  const packageDocs =
    attachedDocs.length > 0
      ? attachedDocs
      : order.origin === "rfq_ingenieria" && order.engineeringRequestId
        ? await listEngineeringDocuments(order.engineeringRequestId)
        : await listQuoteDocuments(order.quoteId);
  const drawingsTitle =
    attachedDocs.length > 0
      ? "Plano del número de parte"
      : order.origin === "rfq_ingenieria"
        ? "Paquete liberado"
        : "Adjuntos de RFQ";
  const partId = partIdentity(order.partNumber, order.number);
  const parentOt = workOrderNumber(order.orderNumber);

  const status = order.status;
  const canUpdate = access.permissions.includes(PERMISSION_IDS.productionUpdate);
  const editable = canUpdate && canEditProduction(status);
  const assignable = canAssignProduction(status);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Número de parte
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <h2 className="text-2xl font-semibold tracking-tight">{partId}</h2>
            <Badge variant="secondary">{PRODUCTION_STATUS_LABELS[status]}</Badge>
            <Badge variant="outline">{PRODUCTION_MONITORING_LABELS[order.monitoring]}</Badge>
            {order.isDemo ? <Badge variant="outline">DEMO</Badge> : null}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            <Link href={`/customers/${order.customerId}`} className="hover:underline">
              {order.customerName}
            </Link>
            {" · "}
            <Link href={`/orders/${order.orderId}`} className="hover:underline">
              {parentOt}
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
          <Link href={`/orders/${order.orderId}`} className={buttonVariants({ variant: "outline" })}>
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
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Quien programa elige centro, máquina disponible y operador. Al guardar,
            el número de parte pasa a Programada si el material de la OT ya está
            reservado. El operador lo inicia desde aquí o desde Mis números de parte.
          </p>
        <ProductionAssignPanel
          productionOrderId={order.id}
          workCenterId={order.workCenterId}
          machineId={order.machineId}
          operatorUserId={order.operatorUserId}
          workCenters={workCenters}
          machines={machines.map((machine) => ({
            id: machine.id,
            name: machine.name,
            workCenterId: machine.workCenterId,
            status: machine.status,
          }))}
          users={users}
          canAssignCenter={access.permissions.includes(PERMISSION_IDS.productionSchedule)}
          canAssignMachine={access.permissions.includes(
            PERMISSION_IDS.productionAssignMachine,
          )}
          canAssignOperator={access.permissions.includes(
            PERMISSION_IDS.productionAssignOperator,
          )}
        />
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Información general</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="ID" value={partId} />
          <Field label="Orden de trabajo" value={parentOt} href={`/orders/${order.orderId}`} />
          <Field label="Cliente" value={order.customerName} />
          <Field label="RFQ" value={order.quoteNumber} />
          <Field label="Ingeniería" value={order.engineeringNumber} />
          <Field
            label="Origen"
            value={order.origin === "rfq_ingenieria" ? "RFQ + Ingeniería" : "RFQ directa"}
          />
          <Field label="Descripción" value={order.description} />
          <Field label="Cantidad" value={`${displayQty(order.quantity)} ${order.unit}`} />
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
          <CardTitle>Calidad</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {qualityState.warning ? (
            <p className="rounded-lg border bg-muted/40 px-3 py-2 text-sm">{qualityState.warning}</p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Al enviar a Calidad se abre un borrador de inspección. Si se aprueba, el
              número de parte pasa a Terminada. Si se rechaza, vuelve a producción para
              retrabajo.
            </p>
          )}
          {inspections.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin inspecciones capturadas.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {inspections.map((item) => (
                <li key={item.id} className="rounded-lg border px-3 py-2">
                  <Link href={`/quality/inspections/${item.id}`} className="font-medium hover:underline">
                    {item.number}
                  </Link>
                  {" · "}
                  {INSPECTION_TYPE_LABELS[item.type as InspectionType]}
                  {" · "}
                  {INSPECTION_RESULT_LABELS[item.result as InspectionResult]}
                </li>
              ))}
            </ul>
          )}
          {access.permissions.includes(PERMISSION_IDS.qualityInspect) ? (
            <Link
              href={`/quality/inspections/new?ot=${order.id}`}
              className={buttonVariants({ variant: "outline" })}
            >
              Registrar inspección
            </Link>
          ) : null}
        </CardContent>
      </Card>

      <p className="text-sm text-muted-foreground">
        El material de este número de parte se gestiona en la{" "}
        <Link
          href={`/orders/${order.orderId}#materiales`}
          className="font-medium hover:underline"
        >
          orden de trabajo {parentOt}
        </Link>
        .
      </p>

      <Card>
        <CardHeader>
          <CardTitle>Procesos</CardTitle>
        </CardHeader>
        <CardContent>
          {order.operations.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aún no hay procesos. Se copian de la cotización al convertir a OT.
            </p>
          ) : (
            <ol className="space-y-2 text-sm">
              {order.operations.map((step) => (
                <li key={step.id} className="rounded-lg border px-3 py-2">
                  {step.position}. {step.name}
                  {step.workCenterName ? ` · ${step.workCenterName}` : ""}
                  {" · "}
                  {step.status}
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
              Este número de parte no tiene plano asignado. Al crearlo desde la orden de
              trabajo se eligen los archivos de cotización o ingeniería.
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
          <CardTitle>Tiempo de maquinado, scrap y retrabajo</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-2">
            <p className="text-sm font-medium">Horas máquina</p>
            <ProductionTimePanel
              productionOrderId={order.id}
              machineEntries={machineEntries}
              canWrite={canUpdate && canLogProductionTime(status)}
            />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Scrap y retrabajo</p>
            <ProductionReworkPanel
              productionOrderId={order.id}
              rows={rework}
              canWrite={canUpdate}
            />
          </div>
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
