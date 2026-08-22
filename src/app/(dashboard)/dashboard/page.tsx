import Link from "next/link";
import {
  AlertTriangle,
  Users,
  FileText,
  ClipboardList,
  Settings,
  Package,
  ShoppingCart,
  CheckCircle,
  Truck,
  CreditCard,
  Factory,
  ArrowUpRight,
  AlertCircle,
} from "lucide-react";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Alerts */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Requiere Atención</h2>
          <Link href="/alerts" className="text-xs text-muted-foreground hover:underline">
            Ver todas →
          </Link>
        </div>
        <div className="grid gap-3 md:grid-cols-4">
          <AlertCard type="urgent" label="OT Vencidas" count={5} icon={<AlertCircle className="h-4 w-4" />} />
          <AlertCard type="warning" label="Material Bajo Mín." count={3} icon={<Package className="h-4 w-4" />} />
          <AlertCard type="info" label="OC Pendientes" count={2} icon={<ShoppingCart className="h-4 w-4" />} />
          <AlertCard type="urgent" label="Máquinas Detenidas" count={1} icon={<Factory className="h-4 w-4" />} />
        </div>
      </section>

      {/* Sales */}
      <DashboardSection title="Ventas" href="/quotes" ctpLabel="Nueva Cotización">
        <StatCard
          label="Cotizaciones"
          value="30"
          sub="5 por vencer"
          icon={<FileText className="h-4 w-4" />}
          href="/quotes"
        />
        <StatCard
          label="Órdenes de Trabajo"
          value="15"
          sub="3 atrasadas"
          icon={<ClipboardList className="h-4 w-4" />}
          href="/orders"
        />
        <StatCard
          label="Clientes"
          value="10"
          sub="2 nuevos"
          icon={<Users className="h-4 w-4" />}
          href="/customers"
        />
      </DashboardSection>

      {/* Production */}
      <DashboardSection title="Producción" href="/production" ctpLabel="Nueva OT">
        <StatCard
          label="OT Activas"
          value="41"
          sub="5 urgentes"
          icon={<Settings className="h-4 w-4" />}
          href="/production"
        />
        <StatCard
          label="En Producción"
          value="8"
          sub="2 atrasadas"
          icon={<Settings className="h-4 w-4" />}
          href="/production?status=en_produccion"
        />
        <StatCard
          label="En Calidad"
          value="3"
          sub="1 rechazado"
          icon={<CheckCircle className="h-4 w-4" />}
          href="/quality"
        />
      </DashboardSection>

      {/* Inventory */}
      <DashboardSection title="Inventario" href="/inventory" ctpLabel="Nuevo Material">
        <StatCard
          label="Materiales"
          value="13"
          sub="13 tipos"
          icon={<Package className="h-4 w-4" />}
          href="/inventory"
        />
        <StatCard
          label="Críticos Bajo Stock"
          value="3"
          sub="Requieren compra"
          icon={<AlertTriangle className="h-4 w-4" />}
          href="/inventory?filter=critical"
        />
        <StatCard
          label="Valor Inventario"
          value="$245K"
          sub="MXN estimado"
          icon={<CreditCard className="h-4 w-4" />}
          href="/inventory"
        />
      </DashboardSection>

      {/* Logistics */}
      <DashboardSection title="Logística" href="/deliveries" ctpLabel="Nueva Entrega">
        <StatCard
          label="Entregas"
          value="3"
          sub="1 hoy"
          icon={<Truck className="h-4 w-4" />}
          href="/deliveries"
        />
        <StatCard
          label="Facturas"
          value="6"
          sub="2 pendientes"
          icon={<CreditCard className="h-4 w-4" />}
          href="/billing"
        />
        <StatCard
          label="CxC Vencida"
          value="$45K"
          sub="3 facturas"
          icon={<AlertCircle className="h-4 w-4" />}
          href="/billing?status=overdue"
        />
      </DashboardSection>

      {/* Purchasing */}
      <DashboardSection title="Compras" href="/purchasing" ctpLabel="Nueva OC">
        <StatCard
          label="OC Abiertas"
          value="2"
          sub="1 urgente"
          icon={<ShoppingCart className="h-4 w-4" />}
          href="/purchasing"
        />
        <StatCard
          label="Proveedores"
          value="5"
          sub="2 activos"
          icon={<Factory className="h-4 w-4" />}
          href="/suppliers"
        />
        <StatCard
          label="Por Recibir"
          value="1"
          sub="Pendiente"
          icon={<Truck className="h-4 w-4" />}
          href="/purchasing"
        />
      </DashboardSection>
    </div>
  );
}

function DashboardSection({
  title,
  href,
  ctpLabel,
  children,
}: {
  title: string;
  href: string;
  ctpLabel: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <Link href={href} className="text-sm font-semibold text-foreground hover:underline">
          {title}
        </Link>
        <Link
          href={`${href}/new`}
          className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
        >
          <ArrowUpRight className="h-3 w-3" />
          {ctpLabel}
        </Link>
      </div>
      <div className="grid gap-3 md:grid-cols-3">{children}</div>
    </section>
  );
}

function StatCard({
  label,
  value,
  sub,
  icon,
  href,
}: {
  label: string;
  value: string;
  sub: string;
  icon: React.ReactNode;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-lg border bg-card p-3 transition-colors hover:bg-muted/50"
    >
      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted text-muted-foreground">
        {icon}
      </div>
      <div>
        <p className="text-xl font-bold">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-[10px] text-muted-foreground">{sub}</p>
      </div>
    </Link>
  );
}

function AlertCard({
  type,
  label,
  count,
  icon,
}: {
  type: "urgent" | "warning" | "success" | "info";
  label: string;
  count: number;
  icon: React.ReactNode;
}) {
  const colors = {
    urgent: "border-l-red-500 bg-red-50/50",
    warning: "border-l-amber-500 bg-amber-50/50",
    success: "border-l-green-500 bg-green-50/50",
    info: "border-l-blue-500 bg-blue-50/50",
  };

  return (
    <div className={`flex items-center gap-2 rounded-lg border border-l-4 p-3 ${colors[type]}`}>
      <span className="text-lg font-bold">{count}</span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium">{label}</p>
      </div>
    </div>
  );
}
