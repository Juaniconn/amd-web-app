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
          <Stat
            label="Cotizaciones"
            value={data.ventas.quotesTotal}
            sub={`${data.ventas.quotesOpen} abiertas`}
            icon={<FileText className="h-4 w-4" />}
            href="/quotes"
          />
          <Stat
            label="Órdenes de Trabajo"
            value={data.ventas.ordersActive}
            sub={
              data.ventas.ordersDelayed > 0
                ? `${data.ventas.ordersDelayed} atrasadas`
                : `${data.ventas.ordersTotal} en total`
            }
            tone={data.ventas.ordersDelayed > 0 ? "urgent" : undefined}
            icon={<ClipboardList className="h-4 w-4" />}
            href="/orders"
          />
          <Stat
            label="Clientes"
            value={data.ventas.customersTotal}
            sub={`${data.ventas.customersNewThisMonth} nuevos este mes`}
            icon={<Users className="h-4 w-4" />}
            href="/customers"
          />
        </Section>
      )}

      {/* PRODUCCIÓN */}
      {can(PERMISSION_IDS.productionView) && (
        <Section title="Producción" href="/production">
          <Stat
            label="Números de Parte activos"
            value={data.produccion.partsActive}
            sub={
              data.produccion.partsUrgent > 0
                ? `${data.produccion.partsUrgent} urgentes`
                : `${data.produccion.partsTotal} en total`
            }
            tone={data.produccion.partsUrgent > 0 ? "warning" : undefined}
            icon={<Layers className="h-4 w-4" />}
            href="/production"
          />
          <Stat
            label="En piso"
            value={data.produccion.partsInProduction}
            sub={`${data.produccion.opsInProgress} procesos en curso`}
            icon={<Settings className="h-4 w-4" />}
            href="/production?status=en_produccion"
          />
          <Stat
            label="Máquinas ocupadas"
            value={`${data.produccion.machinesBusy}/${data.produccion.machinesTotal}`}
            sub={
              data.produccion.machinesDown > 0
                ? `${data.produccion.machinesDown} detenidas`
                : "todas operativas"
            }
            tone={data.produccion.machinesDown > 0 ? "urgent" : undefined}
            icon={<Factory className="h-4 w-4" />}
            href="/machines"
          />
        </Section>
      )}

      {/* INGENIERÍA */}
      {can(PERMISSION_IDS.engineeringRead) && (
        <Section title="Ingeniería" href="/engineering">
          <Stat
            label="Solicitudes abiertas"
            value={data.ingenieria.requestsOpen}
            sub="en diseño o revisión"
            icon={<Wrench className="h-4 w-4" />}
            href="/engineering"
          />
          <Stat
            label="Liberados"
            value={data.ingenieria.requestsReleased}
            sub="listos para producción"
            icon={<CheckCircle className="h-4 w-4" />}
            href="/engineering"
          />
        </Section>
      )}

      {/* INVENTARIO Y COMPRAS */}
      {can(PERMISSION_IDS.inventoryRead) && (
        <Section title="Inventario y Compras" href="/inventory">
          <Stat
            label="Materiales"
            value={data.inventario.materialsTotal}
            sub={`${data.inventario.materialsCritical} críticos`}
            icon={<Package className="h-4 w-4" />}
            href="/inventory"
          />
          <Stat
            label="Bajo mínimo"
            value={data.inventario.materialsLowStock}
            sub={
              data.inventario.materialsLowStock > 0
                ? "requieren compra"
                : "stock suficiente"
            }
            tone={data.inventario.materialsLowStock > 0 ? "warning" : undefined}
            icon={<AlertTriangle className="h-4 w-4" />}
            href="/inventory?critical=1"
          />
          <Stat
            label="OC abiertas"
            value={data.compras.poOpen}
            sub={`${data.compras.poPendingReceive} por recibir`}
            icon={<ShoppingCart className="h-4 w-4" />}
            href="/purchasing"
          />
        </Section>
      )}

      {/* LOGÍSTICA */}
      {can(PERMISSION_IDS.deliveriesRead) && (
        <Section title="Logística y Cobranza" href="/deliveries">
          <Stat
            label="Entregas en tránsito"
            value={data.logistica.deliveriesInTransit}
            sub={
              data.logistica.deliveriesIncidents > 0
                ? `${data.logistica.deliveriesIncidents} con incidencia`
                : "sin incidencias"
            }
            tone={data.logistica.deliveriesIncidents > 0 ? "urgent" : undefined}
            icon={<Truck className="h-4 w-4" />}
            href="/deliveries"
          />
          <Stat
            label="Facturas abiertas"
            value={data.logistica.invoicesOpen}
            sub={`${data.logistica.invoicesOverdue} vencidas`}
            tone={data.logistica.invoicesOverdue > 0 ? "urgent" : undefined}
            icon={<CreditCard className="h-4 w-4" />}
            href="/billing"
          />
          <Stat
            label="CxC vencida"
            value={formatMoneyShort(data.logistica.receivableOverdue)}
            sub="por cobrar"
            tone={data.logistica.receivableOverdue > 0 ? "urgent" : undefined}
            icon={<AlertCircle className="h-4 w-4" />}
            href="/billing"
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

function Stat({
  label,
  value,
  sub,
  icon,
  href,
  tone,
}: {
  label: string;
  value: number | string;
  sub: string;
  icon: React.ReactNode;
  href: string;
  tone?: "urgent" | "warning";
}) {
  const toneRing =
    tone === "urgent"
      ? "border-red-200"
      : tone === "warning"
        ? "border-amber-200"
        : "";
  const iconTone =
    tone === "urgent"
      ? "bg-red-50 text-red-600"
      : tone === "warning"
        ? "bg-amber-50 text-amber-600"
        : "bg-muted text-muted-foreground";

  return (
    <Link
      href={href}
      className={`flex items-center gap-3 rounded-lg border bg-card p-3 transition-colors hover:bg-muted/40 ${toneRing}`}
    >
      <div className={`flex h-9 w-9 items-center justify-center rounded-md ${iconTone}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xl font-bold leading-tight">{value}</p>
        <p className="truncate text-xs font-medium">{label}</p>
        <p className="truncate text-[10px] text-muted-foreground">{sub}</p>
      </div>
    </Link>
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
