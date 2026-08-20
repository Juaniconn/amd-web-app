import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { auth } from "@/lib/auth/auth";
import { PERMISSION_IDS, ROLES, type RoleId } from "@/lib/permissions/catalog";
import { getDashboardSnapshot } from "@/server/services/dashboard";
import { getEngineeringDashboardStats } from "@/server/services/engineering";
import { getInventoryDashboardStats } from "@/server/services/inventory-kpis";
import { getProductionDashboardStats } from "@/server/services/production-kpis";
import { getOrderDashboardStats } from "@/server/services/orders-kpis";
import { getProjectDashboardStats } from "@/server/services/projects-kpis";
import { getQuoteDashboardStats } from "@/server/services/quotes";
import {
  getBillingDashboardStats,
  getDeliveryDashboardStats,
  getPurchasingDashboardStats,
  getQualityDashboardStats,
} from "@/server/services/operations-kpis";

export default async function DashboardPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    // `reauth=1` evita el bucle con cookies caducas (ver src/proxy.ts).
    redirect("/login?reauth=1");
  }

  const snapshot = await getDashboardSnapshot(session.user.id);
  const canReadQuotes = snapshot.user.permissions.includes(PERMISSION_IDS.quotesRead);
  const canReadEngineering = snapshot.user.permissions.includes(
    PERMISSION_IDS.engineeringRead,
  );
  const canReadProduction = snapshot.user.permissions.includes(
    PERMISSION_IDS.productionView,
  );
  const canReadInventory = snapshot.user.permissions.includes(
    PERMISSION_IDS.inventoryRead,
  );
  const canReadOrders = snapshot.user.permissions.includes(PERMISSION_IDS.ordersView);
  const canReadProjects = snapshot.user.permissions.includes(
    PERMISSION_IDS.projectsView,
  );
  const quoteStats = canReadQuotes ? await getQuoteDashboardStats() : null;
  const engineeringStats = canReadEngineering
    ? await getEngineeringDashboardStats()
    : null;
  const productionStats = canReadProduction
    ? await getProductionDashboardStats()
    : null;
  const inventoryStats = canReadInventory
    ? await getInventoryDashboardStats()
    : null;
  const orderStats = canReadOrders ? await getOrderDashboardStats() : null;
  const projectStats = canReadProjects ? await getProjectDashboardStats() : null;
  const purchasingStats = snapshot.user.permissions.includes(PERMISSION_IDS.purchasingRead)
    ? await getPurchasingDashboardStats()
    : null;
  const qualityStats = snapshot.user.permissions.includes(PERMISSION_IDS.qualityRead)
    ? await getQualityDashboardStats()
    : null;
  const deliveryStats = snapshot.user.permissions.includes(PERMISSION_IDS.deliveriesRead)
    ? await getDeliveryDashboardStats()
    : null;
  const billingStats = snapshot.user.permissions.includes(PERMISSION_IDS.billingRead)
    ? await getBillingDashboardStats()
    : null;
  const roleNames = snapshot.user.roles.map(
    (roleId) => ROLES[roleId as RoleId]?.name ?? roleId,
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">
          Hola, {snapshot.user.name}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Centro de operaciones de AMD México. Los números salen de PostgreSQL.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Usuarios"
          value={String(snapshot.foundation.users)}
          hint="Registros en la tabla users"
        />
        <KpiCard
          label="Roles"
          value={String(snapshot.foundation.roles)}
          hint="Roles de negocio sembrados"
        />
        <KpiCard
          label="Sesiones activas"
          value={String(snapshot.foundation.activeSessions)}
          hint="Sesiones con expires_at vigente"
        />
        {snapshot.user.permissions.includes(PERMISSION_IDS.customersRead) ? (
          <KpiCard
            label="Clientes activos"
            value={String(snapshot.foundation.activeCustomers)}
            hint="Clientes con estado activo, no archivados"
          />
        ) : null}
        {quoteStats ? (
          <>
            <KpiCard
              label="Cotizaciones abiertas"
              value={String(quoteStats.open)}
              hint="Borrador, en revisión o enviadas"
            />
            <KpiCard
              label="Por vencer (7 días)"
              value={String(quoteStats.expiringSoon)}
              hint="Enviadas con vigencia próxima"
            />
            <KpiCard
              label="Convertidas del mes"
              value={String(quoteStats.convertedThisMonth)}
              hint="Cotizaciones convertidas a orden de trabajo"
            />
          </>
        ) : null}
        {engineeringStats ? (
          <>
            <KpiCard
              label="Ingeniería abierta"
              value={String(engineeringStats.open)}
              hint="Solicitudes no cerradas"
            />
            <KpiCard
              label="Ingeniería vencida"
              value={String(engineeringStats.overdue)}
              hint="Fecha compromiso superada"
            />
            <KpiCard
              label="Diseños liberados"
              value={String(engineeringStats.released)}
              hint="Listos para cotización final u orden de trabajo"
            />
          </>
        ) : null}
        {productionStats ? (
          <>
            <KpiCard
              label="Números de parte en producción"
              value={String(productionStats.active)}
              hint="Piezas en piso no cerradas ni canceladas"
            />
            <KpiCard
              label="Números de parte retrasados"
              value={String(productionStats.delayed)}
              hint="Fecha prometida vencida"
            />
            <KpiCard
              label="Horas máquina"
              value={String(productionStats.machineHours)}
              hint="Registros cerrados"
            />
            <KpiCard
              label="Horas hombre"
              value={String(productionStats.laborHours)}
              hint="Registros cerrados"
            />
          </>
        ) : null}
        {orderStats ? (
          <>
            <KpiCard
              label="Órdenes de trabajo activas"
              value={String(orderStats.active)}
              hint="OT no completadas ni canceladas"
            />
            <KpiCard
              label="Órdenes de trabajo retrasadas"
              value={String(orderStats.delayed)}
              hint="OT con fecha prometida vencida"
            />
          </>
        ) : null}
        {projectStats ? (
          <KpiCard
            label="Proyectos activos"
            value={String(projectStats.active)}
            hint="Agrupadores en ejecución"
          />
        ) : null}
        {inventoryStats ? (
          <>
            <KpiCard
              label="Crítico bajo stock"
              value={String(inventoryStats.criticalLowStock)}
              hint="Material crítico con disponible ≤ mínimo"
            />
            <KpiCard
              label="Movimientos del día"
              value={String(inventoryStats.movementsToday)}
              hint="Entradas, salidas, reservas, consumos y ajustes"
            />
          </>
        ) : null}
        {purchasingStats ? (
          <>
            <KpiCard
              label="OC abiertas"
              value={String(purchasingStats.open)}
              hint="Borrador, enviada, confirmada o parcial"
            />
            <KpiCard
              label="Compras urgentes"
              value={String(purchasingStats.urgent)}
              hint="OC marcadas como urgentes y aún abiertas"
            />
          </>
        ) : null}
        {qualityStats ? (
          <>
            <KpiCard
              label="Inspecciones rechazadas"
              value={String(qualityStats.rejectedInspections)}
              hint="Histórico de rechazos"
            />
            <KpiCard
              label="NCR abiertos"
              value={String(qualityStats.openNcrs)}
              hint="Abierta, en análisis o retrabajo"
            />
          </>
        ) : null}
        {deliveryStats ? (
          <>
            <KpiCard
              label="Entregas en curso"
              value={String(deliveryStats.inTransit)}
              hint="Pendiente, preparando o enviado"
            />
            <KpiCard
              label="Incidencias de entrega"
              value={String(deliveryStats.incidents)}
              hint="Entregas en incidencia"
            />
          </>
        ) : null}
        {billingStats ? (
          <>
            <KpiCard
              label="CxC abiertas"
              value={String(billingStats.open)}
              hint="Facturas emitidas o con pago parcial"
            />
            <KpiCard
              label="Facturas vencidas"
              value={String(billingStats.overdue)}
              hint="Emitidas/parciales con fecha vencida"
            />
          </>
        ) : null}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Identidad actual</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>
            <span className="text-muted-foreground">Correo:</span>{" "}
            {snapshot.user.email}
          </p>
          <div className="flex flex-wrap gap-2">
            {roleNames.map((name) => (
              <Badge key={name} variant="secondary">
                {name}
              </Badge>
            ))}
          </div>
          <p className="text-muted-foreground">
            Permisos: {snapshot.user.permissions.join(", ") || "ninguno"}
          </p>
          <p className="text-xs text-muted-foreground">
            Consulta generada {new Date(snapshot.generatedAt).toLocaleString("es-MX")}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Beta interna</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            Módulos listos para captura real: clientes, cotizaciones, ingeniería, órdenes de
            trabajo, proyectos, producción, inventario, sucursales, compras, calidad, entregas y
            facturación operativa.
          </p>
          <p>
            Si un KPI está en 0, el módulo funciona y todavía no hay movimientos. Los registros
            DEMO no son operación real de AMD México.
          </p>
        </CardContent>
      </Card>

      {!snapshot.user.permissions.includes(PERMISSION_IDS.dashboardRead) ? (
        <p className="text-sm text-destructive">
          Tu usuario no tiene permiso dashboard:read.
        </p>
      ) : null}
    </div>
  );
}
