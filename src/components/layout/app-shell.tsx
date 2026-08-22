"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppHeader } from "@/components/layout/app-header";
import { CommandPalette } from "@/components/layout/command-palette";
import { NotificationCenter } from "@/components/layout/notification-center";
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
  "/my-production": "Mis Tareas",
  "/production/kanban": "Tablero Kanban",
  "/tv": "Dashboard TV",
  "/customers": "Clientes",
  "/quotes": "Cotizaciones",
  "/orders": "Pedidos",
  "/production": "Producción",
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
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader
          title={title}
          userName={userName}
          userEmail={userEmail}
          roles={roles}
          onSearch={() => setCommandOpen(true)}
          onNotifications={() => setNotifOpen(true)}
        />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
      <CommandPalette open={commandOpen} onClose={() => setCommandOpen(false)} />
      <NotificationCenter open={notifOpen} onClose={() => setNotifOpen(false)} />
    </div>
  );
}
