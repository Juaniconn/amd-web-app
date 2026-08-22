"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ClipboardList,
  CreditCard,
  Factory,
  FileText,
  LayoutDashboard,
  Layers,
  Loader2,
  Package,
  Search,
  Settings,
  ShoppingCart,
  Truck,
  Users,
  Wrench,
  CheckCircle,
} from "lucide-react";

type SearchResult = {
  kind: string;
  id: string;
  title: string;
  subtitle: string;
  href: string;
};

type NavItem = {
  label: string;
  href: string;
  icon: React.ReactNode;
};

const NAVIGATION: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: "Clientes", href: "/customers", icon: <Users className="h-4 w-4" /> },
  { label: "Cotizaciones", href: "/quotes", icon: <FileText className="h-4 w-4" /> },
  { label: "Órdenes de Trabajo", href: "/orders", icon: <ClipboardList className="h-4 w-4" /> },
  { label: "Ingeniería", href: "/engineering", icon: <Wrench className="h-4 w-4" /> },
  { label: "Números de Parte", href: "/production", icon: <Layers className="h-4 w-4" /> },
  { label: "Tablero Kanban", href: "/production/kanban", icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: "Dashboard TV", href: "/tv", icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: "Inventario", href: "/inventory", icon: <Package className="h-4 w-4" /> },
  { label: "Compras", href: "/purchasing", icon: <ShoppingCart className="h-4 w-4" /> },
  { label: "Proveedores", href: "/suppliers", icon: <Factory className="h-4 w-4" /> },
  { label: "Máquinas", href: "/machines", icon: <Settings className="h-4 w-4" /> },
  { label: "Calidad", href: "/quality", icon: <CheckCircle className="h-4 w-4" /> },
  { label: "Entregas", href: "/deliveries", icon: <Truck className="h-4 w-4" /> },
  { label: "Facturación", href: "/billing", icon: <CreditCard className="h-4 w-4" /> },
  { label: "Usuarios", href: "/settings/users", icon: <Users className="h-4 w-4" /> },
  { label: "Roles", href: "/settings/roles", icon: <Settings className="h-4 w-4" /> },
  { label: "Sucursales", href: "/settings/branches", icon: <Factory className="h-4 w-4" /> },
];

const KIND_META: Record<string, { label: string; icon: React.ReactNode }> = {
  order: { label: "OT", icon: <ClipboardList className="h-4 w-4" /> },
  part: { label: "Número de Parte", icon: <Layers className="h-4 w-4" /> },
  quote: { label: "Cotización", icon: <FileText className="h-4 w-4" /> },
  customer: { label: "Cliente", icon: <Users className="h-4 w-4" /> },
  material: { label: "Material", icon: <Package className="h-4 w-4" /> },
  supplier: { label: "Proveedor", icon: <Factory className="h-4 w-4" /> },
  invoice: { label: "Factura", icon: <CreditCard className="h-4 w-4" /> },
  delivery: { label: "Entrega", icon: <Truck className="h-4 w-4" /> },
};

export function CommandPalette({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset al abrir
  useEffect(() => {
    if (open) {
      setQuery("");
      setResults([]);
      setSelected(0);
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [open]);

  // Búsqueda con debounce
  useEffect(() => {
    if (!open) return;
    const term = query.trim();
    if (term.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const timer = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(term)}`)
        .then((res) => res.json())
        .then((data) => {
          setResults(data.results ?? []);
          setSelected(0);
        })
        .catch(() => setResults([]))
        .finally(() => setLoading(false));
    }, 220);
    return () => clearTimeout(timer);
  }, [query, open]);

  const navMatches =
    query.trim().length > 0
      ? NAVIGATION.filter((item) =>
          item.label.toLowerCase().includes(query.trim().toLowerCase()),
        )
      : NAVIGATION.slice(0, 6);

  // Lista combinada para navegación con flechas
  const items: { href: string; label: string }[] = [
    ...results.map((r) => ({ href: r.href, label: r.title })),
    ...navMatches.map((n) => ({ href: n.href, label: n.label })),
  ];

  const go = useCallback(
    (href: string) => {
      router.push(href);
      onClose();
    },
    [router, onClose],
  );

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelected((s) => Math.min(s + 1, items.length - 1));
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelected((s) => Math.max(s - 1, 0));
      }
      if (e.key === "Enter") {
        e.preventDefault();
        const target = items[selected];
        if (target) go(target.href);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, items, selected, go, onClose]);

  if (!open) return null;

  let cursor = -1;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh]">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-xl rounded-xl border bg-card shadow-2xl">
        <div className="flex items-center gap-3 border-b px-4 py-3">
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : (
            <Search className="h-4 w-4 text-muted-foreground" />
          )}
          <input
            ref={inputRef}
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            placeholder="Buscar OT, número de parte, cliente, cotización, material..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <kbd className="rounded border bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
            ESC
          </kbd>
        </div>

        <div className="max-h-96 overflow-y-auto p-2">
          {/* Resultados de la base */}
          {results.length > 0 && (
            <>
              <p className="px-2 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Resultados
              </p>
              {results.map((result) => {
                cursor += 1;
                const idx = cursor;
                const meta = KIND_META[result.kind] ?? {
                  label: result.kind,
                  icon: <FileText className="h-4 w-4" />,
                };
                return (
                  <button
                    key={`${result.kind}-${result.id}`}
                    onMouseEnter={() => setSelected(idx)}
                    onClick={() => go(result.href)}
                    className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left ${
                      selected === idx ? "bg-muted" : "hover:bg-muted/60"
                    }`}
                  >
                    <span className="shrink-0 text-muted-foreground">{meta.icon}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">
                        {result.title}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {result.subtitle}
                      </span>
                    </span>
                    <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[9px] uppercase text-muted-foreground">
                      {meta.label}
                    </span>
                  </button>
                );
              })}
            </>
          )}

          {/* Sin resultados */}
          {!loading && query.trim().length >= 2 && results.length === 0 && (
            <p className="px-3 py-3 text-xs text-muted-foreground">
              Sin resultados en la base para “{query.trim()}”.
            </p>
          )}

          {/* Navegación */}
          {navMatches.length > 0 && (
            <>
              <p className="px-2 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                {query.trim() ? "Ir a" : "Módulos"}
              </p>
              {navMatches.map((item) => {
                cursor += 1;
                const idx = cursor;
                return (
                  <button
                    key={item.href}
                    onMouseEnter={() => setSelected(idx)}
                    onClick={() => go(item.href)}
                    className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm ${
                      selected === idx ? "bg-muted" : "hover:bg-muted/60"
                    }`}
                  >
                    <span className="text-muted-foreground">{item.icon}</span>
                    {item.label}
                  </button>
                );
              })}
            </>
          )}
        </div>

        <div className="flex items-center gap-3 border-t px-4 py-2 text-[10px] text-muted-foreground">
          <span>↑↓ navegar</span>
          <span>↵ abrir</span>
          <span>ESC cerrar</span>
        </div>
      </div>
    </div>
  );
}
