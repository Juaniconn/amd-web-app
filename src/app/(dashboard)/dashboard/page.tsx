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
  ShoppingBag,
  Globe,
} from "lucide-react";
import { motion } from "framer-motion";
import { requirePermission } from "@/lib/auth/session";
import { PERMISSION_IDS } from "@/lib/permissions/catalog";
import { getCommandCenterData } from "@/server/services/command-center";
import { StatCard, StatRow } from "@/components/shared/ui-patterns";

export default async function DashboardPage() {
  const { access } = await requirePermission(PERMISSION_IDS.dashboardRead);
  const data = await getCommandCenterData();

  const can = (p: string) => access.permissions.includes(p as never);

  const alerts = [
    { count: data.produccion.partsDelayed, label: "Partes atrasadas", href: "/production?delayed=1", tone: "urgent" as const, icon: <AlertCircle className="h-4 w-4" /> },
    { count: data.produccion.machinesDown, label: "Máquinas detenidas", href: "/machines", tone: "urgent" as const, icon: <Factory className="h-4 w-4" /> },
    { count: data.inventario.materialsLowStock, label: "Material bajo mínimo", href: "/inventory?critical=1", tone: "warning" as const, icon: <Package className="h-4 w-4" /> },
    { count: data.compras.poUrgent, label: "OC urgentes", href: "/purchasing", tone: "warning" as const, icon: <ShoppingCart className="h-4 w-4" /> },
    { count: data.logistica.invoicesOverdue, label: "Facturas vencidas", href: "/billing", tone: "urgent" as const, icon: <CreditCard className="h-4 w-4" /> },
    { count: data.logistica.deliveriesIncidents, label: "Incidencias de entrega", href: "/deliveries", tone: "urgent" as const, icon: <Truck className="h-4 w-4" /> },
    { count: data.ventas.quotesExpiringSoon, label: "Cotizaciones por vencer", href: "/quotes?status=enviada", tone: "info" as const, icon: <FileText className="h-4 w-4" /> },
    { count: data.ventas.ordersDelayed, label: "OT atrasadas", href: "/orders?delayed=1", tone: "urgent" as const, icon: <ClipboardList className="h-4 w-4" /> },
  ].filter((a) => a.count > 0);

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h2 className="text-2xl font-bold tracking-tight">Centro de Operaciones</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Resumen de operaciones AMD. Datos en tiempo real.
        </p>
      </motion.div>

      {/* ALERTAS */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Requiere Atención</h2>
          {alerts.length > 0 && (
            <span className="text-xs text-muted-foreground">
              {alerts.length} {alerts.length === 1 ? "alerta" : "alertas"}
            </span>
          )}
        </div>
        {alerts.length === 0 ? (
          <div className="flex items-center gap-2 rounded-xl border border-success/20 bg-success/10 p-4">
            <CheckCircle className="h-5 w-5 text-success" />
            <p className="text-sm text-success font-medium">
              Todo en orden. Sin atrasos, sin material faltante, sin incidencias.
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {alerts.map((alert) => (
              <AlertCard key={alert.label} {...alert} />
            ))}
          </div>
        )}
      </section>

      {/* VENTAS */}
      {can(PERMISSION_IDS.quotesRead) && (
        <Section title="Ventas" href="/quotes">
          <StatCard label="Cotizaciones" value={data.ventas.quotesTotal} hint={`${data.ventas.quotesOpen} abiertas`} icon={<FileText className="h-4 w-4" />} />
          <StatCard label="Órdenes de Trabajo" value={data.ventas.ordersActive} hint={data.ventas.ordersDelayed > 0 ? `${data.ventas.ordersDelayed} atrasadas` : `${data.ventas.ordersTotal} en total`} tone={data.ventas.ordersDelayed > 0 ? "red" : undefined} icon={<ClipboardList className="h-4 w-4" />} />
          <StatCard label="Clientes" value={data.ventas.customersTotal} hint={`${data.ventas.customersNewThisMonth} nuevos este mes`} icon={<Users className="h-4 w-4" />} />
        </Section>
      )}

      {/* PRODUCCIÓN */}
      {can(PERMISSION_IDS.productionView) && (
        <Section title="Producción" href="/production">
          <StatCard label="Números de Parte activos" value={data.produccion.partsActive} hint={data.produccion.partsUrgent > 0 ? `${data.produccion.partsUrgent} urgentes` : `${data.produccion.partsTotal} en total`} tone={data.produccion.partsUrgent > 0 ? "amber" : undefined} icon={<Layers className="h-4 w-4" />} />
          <StatCard label="En piso" value={data.produccion.partsInProduction} hint={`${data.produccion.opsInProgress} procesos en curso`} icon={<Settings className="h-4 w-4" />} />
          <StatCard label="Máquinas ocupadas" value={`${data.produccion.machinesBusy}/${data.produccion.machinesTotal}`} hint={data.produccion.machinesDown > 0 ? `${data.produccion.machinesDown} detenidas` : "todas operativas"} tone={data.produccion.machinesDown > 0 ? "red" : undefined} icon={<Factory className="h-4 w-4" />} />
        </Section>
      )}

      {/* E-COMMERCE */}
      {can(PERMISSION_IDS.inventoryRead) && (
        <Section title="E-Commerce" href="/ebay">
          <StatCard label="Listings en eBay" value={0} hint="productos publicados" icon={<ShoppingBag className="h-4 w-4" />} />
          <StatCard label="Ventas este mes" value="$0" hint="ingresos por eBay" tone="green" icon={<Globe className="h-4 w-4" />} />
          <StatCard label="Pendientes" value={0} hint="por publicar" icon={<Package className="h-4 w-4" />} />
        </Section>
      )}

      {/* INGENIERÍA */}
      {can(PERMISSION_IDS.engineeringRead) && (
        <Section title="Ingeniería" href="/engineering">
          <StatCard label="Solicitudes abiertas" value={data.ingenieria.requestsOpen} hint="en diseño o revisión" icon={<Wrench className="h-4 w-4" />} />
          <StatCard label="Liberados" value={data.ingenieria.requestsReleased} hint="listos para producción" tone="green" icon={<CheckCircle className="h-4 w-4" />} />
        </Section>
      )}

      {/* INVENTARIO Y COMPRAS */}
      {can(PERMISSION_IDS.inventoryRead) && (
        <Section title="Inventario y Compras" href="/inventory">
          <StatCard label="Materiales" value={data.inventario.materialsTotal} hint={`${data.inventario.materialsCritical} críticos`} icon={<Package className="h-4 w-4" />} />
          <StatCard label="Bajo mínimo" value={data.inventario.materialsLowStock} hint={data.inventario.materialsLowStock > 0 ? "requieren compra" : "stock suficiente"} tone={data.inventario.materialsLowStock > 0 ? "amber" : undefined} icon={<AlertTriangle className="h-4 w-4" />} />
          <StatCard label="OC abiertas" value={data.compras.poOpen} hint={`${data.compras.poPendingReceive} por recibir`} icon={<ShoppingCart className="h-4 w-4" />} />
        </Section>
      )}

      {/* LOGÍSTICA */}
      {can(PERMISSION_IDS.deliveriesRead) && (
        <Section title="Logística y Cobranza" href="/deliveries">
          <StatCard label="Entregas en tránsito" value={data.logistica.deliveriesInTransit} hint={data.logistica.deliveriesIncidents > 0 ? `${data.logistica.deliveriesIncidents} con incidencia` : "sin incidencias"} tone={data.logistica.deliveriesIncidents > 0 ? "red" : undefined} icon={<Truck className="h-4 w-4" />} />
          <StatCard label="Facturas abiertas" value={data.logistica.invoicesOpen} hint={`${data.logistica.invoicesOverdue} vencidas`} tone={data.logistica.invoicesOverdue > 0 ? "red" : undefined} icon={<CreditCard className="h-4 w-4" />} />
          <StatCard label="CxC vencida" value={formatMoneyShort(data.logistica.receivableOverdue)} hint="por cobrar" tone={data.logistica.receivableOverdue > 0 ? "red" : undefined} icon={<AlertCircle className="h-4 w-4" />} />
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

function Section({ title, href, children }: { title: string; href: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{title}</h2>
        <Link href={href} className="flex items-center gap-1 text-xs text-brand hover:underline">
          Ver módulo
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
      <StatRow>{children}</StatRow>
    </section>
  );
}

function AlertCard({ count, label, href, tone, icon }: { count: number; label: string; href: string; tone: "urgent" | "warning" | "info"; icon: React.ReactNode }) {
  const styles = {
    urgent: "border-l-red-500 bg-danger/10 text-danger hover:bg-danger/20",
    warning: "border-l-amber-500 bg-warning/10 text-warning hover:bg-warning/20",
    info: "border-l-blue-500 bg-blue-50 text-blue-600 hover:bg-blue-100",
  }[tone];

  return (
    <Link href={href} className={`flex items-center gap-2 rounded-xl border border-l-4 p-3 transition-all hover:shadow-md ${styles}`}>
      {icon}
      <span className="text-lg font-bold">{count}</span>
      <span className="min-w-0 flex-1 truncate text-xs font-medium">{label}</span>
      <ArrowRight className="h-3 w-3 shrink-0 opacity-50" />
    </Link>
  );
}