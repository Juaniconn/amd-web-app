"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  BarChart3,
  Clock,
  Globe,
  Bell,
  Settings,
  Plus,
  List,
  Filter,
  Tv,
  CheckCircle,
  ChevronDown,
} from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useState } from "react";

type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
};

type NavSection = {
  label: string;
  items: NavItem[];
};

const EBAY_NAV: NavSection[] = [
  {
    label: "General",
    items: [
      { href: "/ebay", label: "Dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
      { href: "/ebay/stats", label: "Estadísticas", icon: <BarChart3 className="h-4 w-4" /> },
      { href: "/ebay/tv", label: "Modo TV", icon: <Tv className="h-4 w-4" /> },
    ],
  },
  {
    label: "Productos",
    items: [
      { href: "/ebay/inventory", label: "Inventario", icon: <Package className="h-4 w-4" /> },
      { href: "/ebay/new", label: "Nuevo Producto", icon: <Plus className="h-4 w-4" /> },
      { href: "/ebay/listings", label: "Listados", icon: <List className="h-4 w-4" /> },
      { href: "/ebay/filters", label: "Filtros", icon: <Filter className="h-4 w-4" /> },
    ],
  },
  {
    label: "Ventas",
    items: [
      { href: "/ebay/orders", label: "Órdenes", icon: <ShoppingCart className="h-4 w-4" /> },
      { href: "/ebay/history", label: "Historial", icon: <Clock className="h-4 w-4" /> },
    ],
  },
  {
    label: "Cuenta",
    items: [
      { href: "/ebay/accounts", label: "Cuentas", icon: <Globe className="h-4 w-4" /> },
      { href: "/ebay/compliance", label: "Compliance", icon: <CheckCircle className="h-4 w-4" /> },
      { href: "/ebay/notifications", label: "Notificaciones", icon: <Bell className="h-4 w-4" /> },
      { href: "/ebay/settings", label: "Configuración", icon: <Settings className="h-4 w-4" /> },
    ],
  },
];

export default function EbayLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (<>
    <div className="flex h-full">
      <aside
        className={cn(
          "hidden lg:flex flex-col border-r border-border/50 bg-card/50 transition-all duration-300",
          collapsed ? "w-16" : "w-56"
        )}
      >
        <div className="flex items-center gap-2 border-b border-border/50 p-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-purple-600">
            <ShoppingCart className="h-4 w-4 text-white" />
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-foreground truncate">eBay</p>
              <p className="text-[10px] text-muted-foreground">Marketplace</p>
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:inline-flex items-center justify-center rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <ChevronDown
              className={cn(
                "h-4 w-4 transition-transform",
                collapsed ? "-rotate-90" : "rotate-0"
              )}
            />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-2">
          {EBAY_NAV.map((section) => (
            <div key={section.label} className="mb-3">
              {!collapsed && (
                <p className="px-2 pb-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  {section.label}
                </p>
              )}
              <ul className="space-y-0.5">
                {section.items.map((item) => {
                  const active =
                    pathname === item.href || pathname.startsWith(item.href + "/");
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={cn(
                          "group flex items-center gap-2 rounded-lg px-2 py-2 text-sm font-medium transition-all",
                          active
                            ? "bg-primary/10 text-primary"
                            : "text-muted-foreground hover:bg-accent hover:text-foreground"
                        )}
                      >
                        <span
                          className={cn(
                            "transition-colors",
                            active ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                          )}
                        >
                          {item.icon}
                        </span>
                        {!collapsed && (
                          <span className="flex-1 truncate">{item.label}</span>
                        )}
                        {active && !collapsed && (
                          <motion.span
                            layoutId="ebay-nav-indicator"
                            className="h-1.5 w-1.5 rounded-full bg-primary"
                          />
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
      </aside>

      <main className="flex-1 overflow-y-auto pb-16 lg:pb-0">{children}</main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border/50 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <div className="flex items-center justify-around h-16">
          <Link
            href="/ebay"
            className={cn(
              "flex flex-col items-center justify-center gap-1 text-xs font-medium transition-colors",
              pathname === "/ebay" ? "text-blue-500" : "text-muted-foreground"
            )}
          >
            <LayoutDashboard className="h-5 w-5" />
            <span>Dashboard</span>
          </Link>
          <Link
            href="/ebay/inventory"
            className={cn(
              "flex flex-col items-center justify-center gap-1 text-xs font-medium transition-colors",
              pathname.startsWith("/ebay/inventory") ? "text-blue-500" : "text-muted-foreground"
            )}
          >
            <Package className="h-5 w-5" />
            <span>Inventario</span>
          </Link>
          <Link
            href="/ebay/new"
            className={cn(
              "flex flex-col items-center justify-center gap-1 text-xs font-medium transition-colors",
              pathname.startsWith("/ebay/new") ? "text-blue-500" : "text-muted-foreground"
            )}
          >
            <Plus className="h-5 w-5" />
            <span>Nuevo</span>
          </Link>
          <Link
            href="/ebay/listings"
            className={cn(
              "flex flex-col items-center justify-center gap-1 text-xs font-medium transition-colors",
              pathname.startsWith("/ebay/listings") ? "text-blue-500" : "text-muted-foreground"
            )}
          >
            <List className="h-5 w-5" />
            <span>Listados</span>
          </Link>
        </div>
      </nav>
      </>
  );
}
