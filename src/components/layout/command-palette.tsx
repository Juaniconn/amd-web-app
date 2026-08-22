"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  FileText,
  ClipboardList,
  Settings,
  Package,
  Wrench,
  ShoppingCart,
  Truck,
  CheckCircle,
  CreditCard,
  Factory,
  Search,
  X,
  Loader2,
} from "lucide-react";
import { Input } from "@/components/ui/input";

type CommandItem = {
  id: string;
  label: string;
  description?: string;
  icon: React.ReactNode;
  href: string;
};

const RECENT_ITEMS: CommandItem[] = [
  { id: "r1", label: "Dashboard", icon: <LayoutDashboard className="h-4 w-4" />, href: "/dashboard" },
  { id: "r2", label: "Cotizaciones", icon: <FileText className="h-4 w-4" />, href: "/quotes" },
  { id: "r3", label: "Producción", icon: <Settings className="h-4 w-4" />, href: "/production" },
];

const NAVIGATION: CommandItem[] = [
  { id: "n1", label: "Dashboard", icon: <LayoutDashboard className="h-4 w-4" />, href: "/dashboard" },
  { id: "n2", label: "Clientes", icon: <Users className="h-4 w-4" />, href: "/customers" },
  { id: "n3", label: "Cotizaciones", icon: <FileText className="h-4 w-4" />, href: "/quotes" },
  { id: "n4", label: "Pedidos", icon: <ClipboardList className="h-4 w-4" />, href: "/orders" },
  { id: "n5", label: "Ingeniería", icon: <Wrench className="h-4 w-4" />, href: "/engineering" },
  { id: "n6", label: "Producción", icon: <Settings className="h-4 w-4" />, href: "/production" },
  { id: "n7", label: "Inventario", icon: <Package className="h-4 w-4" />, href: "/inventory" },
  { id: "n8", label: "Compras", icon: <ShoppingCart className="h-4 w-4" />, href: "/purchasing" },
  { id: "n9", label: "Proveedores", icon: <Factory className="h-4 w-4" />, href: "/suppliers" },
  { id: "n10", label: "Calidad", icon: <CheckCircle className="h-4 w-4" />, href: "/quality" },
  { id: "n11", label: "Entregas", icon: <Truck className="h-4 w-4" />, href: "/deliveries" },
  { id: "n12", label: "Facturación", icon: <CreditCard className="h-4 w-4" />, href: "/billing" },
  { id: "n13", label: "Usuarios", icon: <Users className="h-4 w-4" />, href: "/settings/users" },
  { id: "n14", label: "Roles", icon: <Settings className="h-4 w-4" />, href: "/settings/roles" },
  { id: "n15", label: "Sucursales", icon: <Factory className="h-4 w-4" />, href: "/settings/branches" },
];

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(0);
      const handler = (e: KeyboardEvent) => {
        if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
          e.preventDefault();
          onClose();
        }
        if (e.key === "Escape") onClose();
      };
      window.addEventListener("keydown", handler);
      return () => window.removeEventListener("keydown", handler);
    }
  }, [open, onClose]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  if (!open) return null;

  const items = query
    ? NAVIGATION.filter((item) =>
        item.label.toLowerCase().includes(query.toLowerCase())
      )
    : [...RECENT_ITEMS, ...NAVIGATION];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-xl border bg-card shadow-2xl">
        <div className="flex items-center gap-3 border-b px-4 py-3">
          <Search className="h-5 w-5 text-muted-foreground" />
          <input
            autoFocus
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            placeholder="Buscar módulos, clientes, cotizaciones..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <kbd className="rounded border bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            ESC
          </kbd>
        </div>
        <div className="max-h-80 overflow-y-auto p-2">
          {query === "" && (
            <p className="px-2 py-1 text-xs text-muted-foreground">Recientes</p>
          )}
          {query === "" && RECENT_ITEMS.map((item) => (
            <button
              key={item.id}
              className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-muted"
              onClick={() => { router.push(item.href); onClose(); }}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
          {query === "" && (
            <p className="mt-2 px-2 py-1 text-xs text-muted-foreground">Navegación</p>
          )}
          {items.map((item) => (
            <button
              key={item.id}
              className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-muted"
              onClick={() => { router.push(item.href); onClose(); }}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
          {items.length === 0 && (
            <p className="px-2 py-4 text-center text-sm text-muted-foreground">
              No se encontraron resultados
            </p>
          )}
        </div>
        <div className="border-t px-4 py-2 text-xs text-muted-foreground">
          ⌘K para cerrar · ↑↓ para navegar · Enter para abrir
        </div>
      </div>
    </div>
  );
}
