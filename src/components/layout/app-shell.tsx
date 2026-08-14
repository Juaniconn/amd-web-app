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
  "/customers": "Clientes",
  "/customers/new": "Nuevo cliente",
  "/quotes": "Cotizaciones",
  "/quotes/new": "Nueva cotización",
  "/settings/users": "Usuarios",
  "/settings/roles": "Roles",
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
