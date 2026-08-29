"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppHeader } from "@/components/layout/app-header";
import { CommandPalette } from "@/components/layout/command-palette";
import { NotificationCenter } from "@/components/layout/notification-center";
import { AIAssistant } from "@/components/ai/ai-assistant";
import type { PermissionId } from "@/lib/permissions/catalog";

type AppShellProps = {
  userName: string;
  userEmail: string;
  roles: string[];
  permissions: PermissionId[];
  title?: string;
  children: React.ReactNode;
};

const TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/my-production": "Mis Procesos",
  "/production/kanban": "Tablero Kanban",
  "/tv": "Dashboard TV",
  "/customers": "Clientes",
  "/quotes": "Cotizaciones",
  "/orders": "Órdenes de Trabajo",
  "/production": "Números de Parte",
  "/inventory": "Inventario",
  "/purchasing": "Compras",
  "/suppliers": "Proveedores",
  "/machines": "Máquinas",
  "/quality": "Calidad",
  "/deliveries": "Entregas",
  "/billing": "Facturación",
  "/settings/users": "Usuarios",
  "/settings/roles": "Roles",
  "/settings/branches": "Sucursales",
  "/settings/calculator": "Calculadora",
};

export function AppShell({
  userName,
  userEmail,
  roles,
  permissions,
  children,
}: AppShellProps) {
  const pathname = usePathname();
  const [commandOpen, setCommandOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [alertCount, setAlertCount] = useState(0);
  // Drawer del sidebar en móvil (por debajo de lg). En desktop es irrelevante.
  // No hace falta cerrarlo al navegar con un efecto: cada Link del sidebar
  // llama onMobileClose, y el backdrop también.
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Atajo global ⌘K / Ctrl+K para abrir la búsqueda
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommandOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Conteo de alertas: al montar y cada 60s
  useEffect(() => {
    let active = true;
    const load = () => {
      fetch("/api/alerts")
        .then((res) => res.json())
        .then((data) => {
          if (active) setAlertCount((data.alerts ?? []).length);
        })
        .catch(() => {});
    };
    load();
    const interval = setInterval(load, 60000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [pathname]);

  const title =
    TITLES[pathname] ??
    (pathname.startsWith("/customers")
      ? "Cliente"
      : pathname.startsWith("/quotes")
        ? "Cotización"
        : pathname.startsWith("/orders")
          ? "Orden de Trabajo"
          : pathname.startsWith("/production")
            ? "Producción"
            : pathname.startsWith("/inventory")
              ? "Inventario"
              : pathname.startsWith("/purchasing")
                ? "Compras"
                : pathname.startsWith("/suppliers")
                  ? "Proveedor"
                  : pathname.startsWith("/quality")
                    ? "Calidad"
                    : pathname.startsWith("/deliveries")
                      ? "Entrega"
                      : pathname.startsWith("/billing")
                        ? "Factura"
                        : pathname.startsWith("/settings")
                          ? "Configuración"
                          : "AMD Operations");

  return (
    <div className="flex h-screen bg-background">
      <AppSidebar
        pathname={pathname}
        permissions={permissions}
        onSearch={() => setCommandOpen(true)}
        mobileOpen={sidebarOpen}
        onMobileClose={() => setSidebarOpen(false)}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader
          title={title}
          userName={userName}
          userEmail={userEmail}
          roles={roles}
          alertCount={alertCount}
          onSearch={() => setCommandOpen(true)}
          onNotifications={() => setNotifOpen(true)}
          onMenu={() => setSidebarOpen(true)}
        />
        {/*
          Padding progresivo: 16px en móvil (aprovecha el ancho de 360px),
          24px desde tablet. min-w-0 evita que tablas anchas desborden el flex.
        */}
        <main className="min-w-0 flex-1 overflow-y-auto bg-background p-4 sm:p-6">
          {children}
        </main>
      </div>
      <CommandPalette open={commandOpen} onClose={() => setCommandOpen(false)} />
      <NotificationCenter open={notifOpen} onClose={() => setNotifOpen(false)} />
      <AIAssistant />
    </div>
  );
}
