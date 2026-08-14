import {
  PERMISSION_IDS,
  type PermissionId,
} from "@/lib/permissions/catalog";

export type NavItem = {
  href: string;
  label: string;
  enabled: boolean;
  permission?: PermissionId;
  phase: string;
};

export const NAV_ITEMS: NavItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    enabled: true,
    permission: PERMISSION_IDS.dashboardRead,
    phase: "Fase 1",
  },
  {
    href: "/customers",
    label: "Clientes",
    enabled: true,
    permission: PERMISSION_IDS.customersRead,
    phase: "Fase 2",
  },
  {
    href: "/quotes",
    label: "Cotizaciones",
    enabled: true,
    permission: PERMISSION_IDS.quotesRead,
    phase: "Fase 3",
  },
  {
    href: "/engineering",
    label: "Ingeniería",
    enabled: true,
    permission: PERMISSION_IDS.engineeringRead,
    phase: "Fase 4",
  },
  { href: "/orders", label: "Pedidos", enabled: false, phase: "Fase 6+" },
  {
    href: "/production",
    label: "Producción",
    enabled: true,
    permission: PERMISSION_IDS.productionView,
    phase: "Fase 5",
  },
  {
    href: "/inventory",
    label: "Inventario",
    enabled: true,
    permission: PERMISSION_IDS.inventoryRead,
    phase: "Fase 6",
  },
  { href: "/purchasing", label: "Compras", enabled: false, phase: "Fase 7" },
  { href: "/suppliers", label: "Proveedores", enabled: false, phase: "Fase 7" },
  {
    href: "/machines",
    label: "Máquinas",
    enabled: true,
    permission: PERMISSION_IDS.productionView,
    phase: "Fase 5",
  },
  { href: "/quality", label: "Calidad", enabled: false, phase: "Fase 8" },
  { href: "/deliveries", label: "Entregas", enabled: false, phase: "Fase 8" },
  { href: "/projects", label: "Proyectos", enabled: false, phase: "Fase 4+" },
  { href: "/reports", label: "Reportes", enabled: false, phase: "Fase 9" },
];

export const SETTINGS_NAV_ITEMS: NavItem[] = [
  {
    href: "/settings/users",
    label: "Usuarios",
    enabled: true,
    permission: PERMISSION_IDS.usersRead,
    phase: "Fase 1",
  },
  {
    href: "/settings/roles",
    label: "Roles",
    enabled: true,
    permission: PERMISSION_IDS.rolesRead,
    phase: "Fase 1",
  },
];
