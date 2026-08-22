import Link from "next/link";
import { useRouter } from "next/navigation";
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
  Search,
  ChevronRight,
} from "lucide-react";
import { PERMISSION_IDS, type PermissionId } from "@/lib/permissions/catalog";

type NavSection = {
  label: string;
  items: {
    href: string;
    label: string;
    icon: React.ReactNode;
    permission?: PermissionId;
  }[];
};

const NAV_SECTIONS: NavSection[] = [
  {
    label: "Principal",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
    ],
  },
  {
    label: "Ventas",
    items: [
      { href: "/customers", label: "Clientes", icon: <Users className="h-4 w-4" />, permission: PERMISSION_IDS.customersRead },
      { href: "/quotes", label: "Cotizaciones", icon: <FileText className="h-4 w-4" />, permission: PERMISSION_IDS.quotesRead },
      { href: "/orders", label: "Pedidos", icon: <ClipboardList className="h-4 w-4" />, permission: PERMISSION_IDS.ordersView },
    ],
  },
  {
    label: "Producción",
    items: [
      { href: "/engineering", label: "Ingeniería", icon: <Wrench className="h-4 w-4" />, permission: PERMISSION_IDS.engineeringRead },
      { href: "/production", label: "Producción", icon: <Settings className="h-4 w-4" />, permission: PERMISSION_IDS.productionView },
      { href: "/production/kanban", label: "Tablero Kanban", icon: <LayoutDashboard className="h-4 w-4" />, permission: PERMISSION_IDS.productionView },
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
      { href: "/settings/roles", label: "Roles", icon: <Settings className="h-4 w-4" />, permission: PERMISSION_IDS.rolesRead },
      { href: "/settings/branches", label: "Sucursales", icon: <Factory className="h-4 w-4" />, permission: PERMISSION_IDS.branchesRead },
      { href: "/settings/calculator", label: "Calculadora", icon: <Settings className="h-4 w-4" />, permission: PERMISSION_IDS.quotesRead },
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
    <aside className="flex w-56 shrink-0 flex-col border-r bg-[#0f1117] text-sidebar-foreground">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-600 text-xs font-bold text-white">
          AMD
        </div>
        <div>
          <p className="text-xs font-semibold text-white">AMD México</p>
          <p className="text-[10px] text-gray-400">Operations</p>
        </div>
      </div>

      {/* Search */}
      <div className="px-3 pb-2">
        <button
          onClick={onSearch}
          className="flex w-full items-center gap-2 rounded-md border border-gray-700 bg-gray-800/50 px-2 py-1.5 text-xs text-gray-400 hover:border-gray-600"
        >
          <Search className="h-3 w-3" />
          <span>Buscar...</span>
          <kbd className="ml-auto rounded bg-gray-700 px-1 py-0.5 text-[9px]">⌘K</kbd>
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-1">
        {NAV_SECTIONS.map((section) => {
          const visibleItems = section.items.filter((item) =>
            canSee(item.permission, permissions)
          );
          if (visibleItems.length === 0) return null;

          return (
            <div key={section.label} className="mb-3">
              <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
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
                        className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors ${
                          active
                            ? "bg-blue-600/20 text-blue-400"
                            : "text-gray-400 hover:bg-gray-800 hover:text-gray-200"
                        }`}
                      >
                        {item.icon}
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      {/* Operator shortcut */}
      {permissions.includes(PERMISSION_IDS.productionView) && (
        <div className="border-t border-gray-800 p-2">
          <Link
            href="/my-production"
            className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-gray-400 hover:bg-gray-800 hover:text-gray-200"
          >
            <Settings className="h-4 w-4" />
            Mis Tareas
          </Link>
        </div>
      )}
    </aside>
  );
}
