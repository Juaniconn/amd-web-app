import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { auth } from "@/lib/auth/auth";
import { PERMISSION_IDS, ROLES, type RoleId } from "@/lib/permissions/catalog";
import { getDashboardSnapshot } from "@/server/services/dashboard";
import { getQuoteDashboardStats } from "@/server/services/quotes";

const UPCOMING = [
  { label: "Ventas hoy", phase: "Fase 4" },
  { label: "Pedidos activos", phase: "Fase 4" },
  { label: "Órdenes de producción", phase: "Fase 5" },
  { label: "Material por comprar", phase: "Fase 6" },
  { label: "Máquinas ocupadas", phase: "Fase 5" },
  { label: "Entregas próximas", phase: "Fase 8" },
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
  const quoteStats = canReadQuotes ? await getQuoteDashboardStats() : null;
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
