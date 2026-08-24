import Link from "next/link";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  CheckCircle,
  ClipboardList,
  CreditCard,
  Factory,
  FileText,
  Layers,
  Package,
  Settings,
  ShoppingCart,
  Truck,
  Users,
  Wrench,
} from "lucide-react";
import { requirePermission } from "@/lib/auth/session";
import { PERMISSION_IDS } from "@/lib/permissions/catalog";
import { getCommandCenterData } from "@/server/services/command-center";
import { StatCard } from "@/components/shared/ui-patterns";

export default async function DashboardPage() {
  const { access } = await requirePermission(PERMISSION_IDS.dashboardRead);
  const data = await getCommandCenterData();

  const can = (p: string) => access.permissions.includes(p as never);

  // Alertas: solo las que tienen valor > 0
  const alerts = [
    {
      count: data.produccion.partsDelayed,
      label: "Partes atrasadas",
      href: "/production?delayed=1",
      tone: "urgent" as const,
      icon: <AlertCircle className="h-4 w-4" />,
    },
    {
      count: data.produccion.machinesDown,
      label: "Máquinas detenidas",
      href: "/machines",
      tone: "urgent" as const,
      icon: <Factory className="h-4 w-4" />,
    },
    {
      count: data.inventario.materialsLowStock,
      label: "Material bajo mínimo",
      href: "/inventory?critical=1",
      tone: "warning" as const,
      icon: <Package className="h-4 w-4" />,
    },
    {
      count: data.compras.poUrgent,
      label: "OC urgentes",
      href: "/purchasing",
      tone: "warning" as const,
      icon: <ShoppingCart className="h-4 w-4" />,
    },
    {
      count: data.logistica.invoicesOverdue,
      label: "Facturas vencidas",
      href: "/billing",
      tone: "urgent" as const,
      icon: <CreditCard className="h-4 w-4" />,
    },
    {
      count: data.logistica.deliveriesIncidents,
      label: "Incidencias de entrega",
      href: "/deliveries",
      tone: "urgent" as const,
      icon: <Truck className="h-4 w-4" />,
    },
    {
      count: data.ventas.quotesExpiringSoon,
      label: "Cotizaciones por vencer",
      href: "/quotes?status=enviada",
      tone: "info" as const,
      icon: <FileText className="h-4 w-4" />,
    },
    {
      count: data.ventas.ordersDelayed,
      label: "OT atrasadas",
      href: "/orders?delayed=1",
      tone: "urgent" as const,
      icon: <ClipboardList className="h-4 w-4" />,
    },
  ].filter((a) => a.count > 0);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl">
          <h2 className="text-2xl font-semibold tracking-tight">Centro de Operaciones</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Resumen de operaciones AMD. Datos en tiempo real.
          </p>
        </div>
      </div>

      {/* ALERTAS */}
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Requiere Atención</h2>
          {alerts.length > 0 && (
            <span className="text-xs text-muted-foreground">
              {alerts.length} {alerts.length === 1 ? "alerta" : "alertas"}
            </span>
          )}
        </div>
        {alerts.length === 0 ? (
          <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50/60 p-3">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <p className="text-sm text-green-800">
              Todo en orden. Sin atrasos, sin material faltante, sin incidencias.
            </p>
          </div>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {alerts.map((alert) => (
              <AlertCard key={alert.label} {...alert} />
            ))}
          </div>
        )}
      </section>

      {/* VENTAS */}
      {can(PERMISSION_IDS.quotesRead) && (
        <Section title="Ventas" href="/quotes">
          <StatCard
            label="Cotizaciones"
            value={data.ventas.quotesTotal}
            hint={`${data.ventas.quotesOpen} abiertas`}
            icon={<FileText className="h-4 w-4" />}
          />
          <StatCard
            label="Órdenes de Trabajo"
            value={data.ventas.ordersActive}
            hint={
              data.ventas.ordersDelayed > 0
                ? `${data.ventas.ordersDelayed} atrasadas`
                : `${data.ventas.ordersTotal} en total`
            }
            tone={data.ventas.ordersDelayed > 0 ? "red" : undefined}
            icon={<ClipboardList className="h-4 w-4" />}
          />
          <StatCard
            label="Clientes"
            value={data.ventas.customersTotal}
            hint={`${data.ventas.customersNewThisMonth} nuevos este mes`}
            icon={<Users className="h-4 w-4" />}
          />
        </Section>
      )}

      {/* PRODUCCIÓN */}
      {can(PERMISSION_IDS.productionView) && (
        <Section title="Producción" href="/production">
          <StatCard
            label="Números de Parte activos"
            value={data.produccion.partsActive}
            hint={
              data.produccion.partsUrgent > 0
                ? `${data.produccion.partsUrgent} urgentes`
                : `${data.produccion.partsTotal} en total`
            }
            tone={data.produccion.partsUrgent > 0 ? "amber" : undefined}
            icon={<Layers className="h-4 w-4" />}
          />
          <StatCard
            label="En piso"
            value={data.produccion.partsInProduction}
            hint={`${data.produccion.opsInProgress} procesos en curso`}
            icon={<Settings className="h-4 w-4" />}
          />
          <StatCard
            label="Máquinas ocupadas"
            value={`${data.produccion.machinesBusy}/${data.produccion.machinesTotal}`}
            hint={
              data.produccion.machinesDown > 0
                ? `${data.produccion.machinesDown} detenidas`
                : "todas operativas"
            }
            tone={data.produccion.machinesDown > 0 ? "red" : undefined}
            icon={<Factory className="h-4 w-4" />}
          />
        </Section>
      )}

      {/* INGENIERÍA */}
      {can(PERMISSION_IDS.engineeringRead) && (
        <Section title="Ingeniería" href="/engineering">
          <StatCard
            label="Solicitudes abiertas"
            value={data.ingenieria.requestsOpen}
            hint="en diseño o revisión"
            icon={<Wrench className="h-4 w-4" />}
          />
          <StatCard
            label="Liberados"
            value={data.ingenieria.requestsReleased}
            hint="listos para producción"
            tone="green"
            icon={<CheckCircle className="h-4 w-4" />}
          />
        </Section>
      )}

      {/* INVENTARIO Y COMPRAS */}
      {can(PERMISSION_IDS.inventoryRead) && (
        <Section title="Inventario y Compras" href="/inventory">
          <StatCard
            label="Materiales"
            value={data.inventario.materialsTotal}
            hint={`${data.inventario.materialsCritical} críticos`}
            icon={<Package className="h-4 w-4" />}
          />
          <StatCard
            label="Bajo mínimo"
            value={data.inventario.materialsLowStock}
            hint={
              data.inventario.materialsLowStock > 0
                ? "requieren compra"
                : "stock suficiente"
            }
            tone={data.inventario.materialsLowStock > 0 ? "amber" : undefined}
            icon={<AlertTriangle className="h-4 w-4" />}
          />
          <StatCard
            label="OC abiertas"
            value={data.compras.poOpen}
            hint={`${data.compras.poPendingReceive} por recibir`}
            icon={<ShoppingCart className="h-4 w-4" />}
          />
        </Section>
      )}

      {/* LOGÍSTICA */}
      {can(PERMISSION_IDS.deliveriesRead) && (
        <Section title="Logística y Cobranza" href="/deliveries">
          <StatCard
            label="Entregas en tránsito"
            value={data.logistica.deliveriesInTransit}
            hint={
              data.logistica.deliveriesIncidents > 0
                ? `${data.logistica.deliveriesIncidents} con incidencia`
                : "sin incidencias"
            }
            tone={data.logistica.deliveriesIncidents > 0 ? "red" : undefined}
            icon={<Truck className="h-4 w-4" />}
          />
          <StatCard
            label="Facturas abiertas"
            value={data.logistica.invoicesOpen}
            hint={`${data.logistica.invoicesOverdue} vencidas`}
            tone={data.logistica.invoicesOverdue > 0 ? "red" : undefined}
            icon={<CreditCard className="h-4 w-4" />}
          />
          <StatCard
            label="CxC vencida"
            value={formatMoneyShort(data.logistica.receivableOverdue)}
            hint="por cobrar"
            tone={data.logistica.receivableOverdue > 0 ? "red" : undefined}
            icon={<AlertCircle className="h-4 w-4" />}
          />
        </Section>
      )}
    </div>
  );
}

function formatMoneyShort(value: number) {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${Math.round(value / 1_000)}K`;
  return `$${Math.round(value)}`;
}

function Section({
  title,
  href,
  children,
}: {
  title: string;
  href: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">{title}</h2>
        <Link
          href={href}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          Ver módulo
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
    </section>
  );
}

function AlertCard({
  count,
  label,
  href,
  tone,
  icon,
}: {
  count: number;
  label: string;
  href: string;
  tone: "urgent" | "warning" | "info";
  icon: React.ReactNode;
}) {
  const styles = {
    urgent: "border-l-red-500 bg-red-50/60 text-red-700",
    warning: "border-l-amber-500 bg-amber-50/60 text-amber-700",
    info: "border-l-blue-500 bg-blue-50/60 text-blue-700",
  }[tone];

  return (
    <Link
      href={href}
      className={`flex items-center gap-2 rounded-lg border border-l-4 p-3 transition-shadow hover:shadow-sm ${styles}`}
    >
      {icon}
      <span className="text-lg font-bold">{count}</span>
      <span className="min-w-0 flex-1 truncate text-xs font-medium">{label}</span>
      <ArrowRight className="h-3 w-3 shrink-0 opacity-50" />
    </Link>
  );
}