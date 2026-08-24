"use client";

import Link from "next/link";
import {
  LayoutDashboard,
  Users,
  FileText,
  ClipboardList,
  Wrench,
  Settings,
  Package,
  ShoppingCart,
  Factory,
  CheckCircle,
  Truck,
  CreditCard,
  Hammer,
  Search,
  Zap,
  Shield,
  Building2,
  Calculator,
  Layers,
} from "lucide-react";
import { PERMISSION_IDS, type PermissionId } from "@/lib/permissions/catalog";

type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
  permission?: PermissionId;
  badge?: number;
};

type NavSection = {
  label: string;
  items: NavItem[];
};

const NAV_SECTIONS: NavSection[] = [
  {
    label: "Principal",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
      { href: "/my-production", label: "Mis Procesos", icon: <Hammer className="h-4 w-4" />, permission: PERMISSION_IDS.productionMyWork },
    ],
  },
  {
    label: "Ventas",
    items: [
      { href: "/customers", label: "Clientes", icon: <Users className="h-4 w-4" />, permission: PERMISSION_IDS.customersRead },
      { href: "/quotes", label: "Cotizaciones", icon: <FileText className="h-4 w-4" />, permission: PERMISSION_IDS.quotesRead },
    ],
  },
  {
    label: "Producción",
    items: [
      { href: "/production", label: "Producción", icon: <Layers className="h-4 w-4" />, permission: PERMISSION_IDS.productionView },
      { href: "/production/kanban", label: "Tablero Kanban", icon: <LayoutDashboard className="h-4 w-4" />, permission: PERMISSION_IDS.productionView },
      { href: "/engineering", label: "Ingeniería", icon: <Wrench className="h-4 w-4" />, permission: PERMISSION_IDS.engineeringRead },
      { href: "/inventory", label: "Inventario", icon: <Package className="h-4 w-4" />, permission: PERMISSION_IDS.inventoryRead },
      { href: "/purchasing", label: "Compras", icon: <ShoppingCart className="h-4 w-4" />, permission: PERMISSION_IDS.purchasingRead },
      { href: "/suppliers", label: "Proveedores", icon: <Factory className="h-4 w-4" />, permission: PERMISSION_IDS.purchasingRead },
      { href: "/machines", label: "Máquinas", icon: <Settings className="h-4 w-4" />, permission: PERMISSION_IDS.productionView },
    ],
  },
  {
    label: "Logística",
    items: [
      { href: "/quality", label: "Calidad", icon: <CheckCircle className="h-4 w-4" />, permission: PERMISSION_IDS.qualityRead },
      { href: "/deliveries", label: "Entregas", icon: <Truck className="h-4 w-4" />, permission: PERMISSION_IDS.deliveriesRead },
      { href: "/billing", label: "Facturación", icon: <CreditCard className="h-4 w-4" />, permission: PERMISSION_IDS.billingRead },
    ],
  },
  {
    label: "Sistema",
    items: [
      { href: "/settings/users", label: "Usuarios", icon: <Users className="h-4 w-4" />, permission: PERMISSION_IDS.usersRead },
      { href: "/settings/roles", label: "Roles", icon: <Shield className="h-4 w-4" />, permission: PERMISSION_IDS.rolesRead },
      { href: "/settings/branches", label: "Sucursales", icon: <Building2 className="h-4 w-4" />, permission: PERMISSION_IDS.branchesRead },
      { href: "/settings/calculator", label: "Calculadora", icon: <Calculator className="h-4 w-4" />, permission: PERMISSION_IDS.quotesRead },
    ],
  },
];

type AppSidebarProps = {
  pathname: string;
  permissions: PermissionId[];
  onSearch: () => void;
};

function canSee(permission: PermissionId | undefined, permissions: PermissionId[]) {
  if (!permission) return true;
  return permissions.includes(permission);
}

export function AppSidebar({ pathname, permissions, onSearch }: AppSidebarProps) {
  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-white/5 bg-[#0b0d12] text-sidebar-foreground">
      {/* Header con logo */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-white/5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/20">
          <Zap className="h-5 w-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white tracking-tight">AMD México</p>
          <p className="text-[10px] text-gray-500 font-medium">Operations ERP</p>
        </div>
      </div>

      {/* Búsqueda */}
      <div className="px-3 py-3">
        <button
          onClick={onSearch}
          className="flex w-full items-center gap-2 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2 text-xs text-gray-500 transition-all hover:border-white/10 hover:bg-white/[0.04] hover:text-gray-400"
        >
          <Search className="h-3.5 w-3.5" />
          <span className="flex-1 text-left">Buscar...</span>
          <kbd className="rounded bg-white/5 px-1.5 py-0.5 text-[9px] text-gray-600 font-mono">⌘K</kbd>
        </button>
      </div>

      {/* Navegación */}
      <nav className="flex-1 overflow-y-auto px-2 pb-4 space-y-1">
        {NAV_SECTIONS.map((section) => {
          const visibleItems = section.items.filter((item) =>
            canSee(item.permission, permissions)
          );
          if (visibleItems.length === 0) return null;

          return (
            <div key={section.label} className="mb-4">
              <p className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-600">
                {section.label}
              </p>
              <ul className="space-y-0.5">
                {visibleItems.map((item) => {
                  const active =
                    pathname === item.href || pathname.startsWith(`${item.href}/`);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={`group relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-150 ${
                          active
                            ? "bg-blue-500/10 text-blue-400 shadow-sm"
                            : "text-gray-400 hover:bg-white/[0.03] hover:text-gray-200"
                        }`}
                      >
                        {active && (
                          <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 rounded-r-full bg-blue-500" />
                        )}
                        <span className={`transition-colors ${active ? "text-blue-400" : "text-gray-500 group-hover:text-gray-400"}`}>
                          {item.icon}
                        </span>
                        <span className="flex-1 truncate">{item.label}</span>
                        {item.badge && item.badge > 0 ? (
                          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500/20 px-1.5 text-[10px] font-bold text-red-400">
                            {item.badge > 99 ? "99+" : item.badge}
                          </span>
                        ) : null}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      {/* Footer con versión */}
      <div className="border-t border-white/5 px-4 py-3">
        <p className="text-[10px] text-gray-600 font-medium">v0.1.0 · AMD Operations</p>
      </div>
    </aside>
  );
}
