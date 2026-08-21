"use client";

import { usePathname } from "next/navigation";
import { AppHeader } from "@/components/layout/app-header";
import { AppSidebar } from "@/components/layout/app-sidebar";
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
  "/my-production": "Mis tareas de hoy",
  "/production/kanban": "Tablero Kanban",
  "/tv": "Dashboard TV",
  "/customers": "Clientes",
  "/customers/new": "Nuevo cliente",
  "/quotes": "Cotizaciones",
  "/quotes/new": "Nueva cotización",
  "/purchasing": "Compras",
  "/purchasing/new": "Nueva OC",
  "/suppliers": "Proveedores",
  "/suppliers/new": "Nuevo proveedor",
  "/quality": "Calidad",
  "/deliveries": "Entregas",
  "/deliveries/new": "Nueva entrega",
  "/billing": "Facturación",
  "/billing/new": "Nueva factura",
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
  const title =
    TITLES[pathname] ??
    (pathname.startsWith("/customers")
      ? "Cliente"
      : pathname.startsWith("/quotes")
        ? "Cotización"
        : pathname.startsWith("/purchasing")
          ? "Orden de compra"
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
    <div className="flex min-h-full bg-background">
      <AppSidebar pathname={pathname} permissions={permissions} />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader
          title={title}
          userName={userName}
          userEmail={userEmail}
          roles={roles}
        />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
