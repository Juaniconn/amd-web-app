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

const UPCOMING = [
  { label: "Ventas hoy", phase: "Fase 10+" },
  { label: "Material por comprar", phase: "Fase 7" },
  { label: "Entregas próximas", phase: "Fase 9" },
];

export default async function DashboardPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
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
          Sesión autenticada contra PostgreSQL. Los KPIs operativos aparecerán
          cuando existan los módulos correspondientes.
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
              hint="Cotizaciones convertidas a pedido"
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
              hint="Listos para cotización final / OT"
            />
          </>
        ) : null}
        {productionStats ? (
          <>
            <KpiCard
              label="OT activas"
              value={String(productionStats.active)}
              hint="OT no cerradas ni canceladas"
            />
            <KpiCard
              label="OT retrasadas"
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
              label="Pedidos activos"
              value={String(orderStats.active)}
              hint="No completados ni cancelados"
            />
            <KpiCard
              label="Pedidos retrasados"
              value={String(orderStats.delayed)}
              hint="Fecha prometida vencida"
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
          <CardTitle>KPIs operativos</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-muted-foreground">
            No se muestran cifras inventadas. Estas métricas se calcularán desde
            PostgreSQL cuando existan las tablas de cada fase.
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

      {!snapshot.user.permissions.includes(PERMISSION_IDS.dashboardRead) ? (
        <p className="text-sm text-destructive">
          Tu usuario no tiene permiso dashboard:read.
        </p>
      ) : null}
    </div>
  );
}
