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
  {
    href: "/orders",
    label: "Órdenes de Trabajo",
    enabled: true,
    permission: PERMISSION_IDS.ordersView,
    phase: "Órdenes de Trabajo",
  },
  {
    href: "/projects",
    label: "Proyectos",
    enabled: true,
    permission: PERMISSION_IDS.projectsView,
    phase: "Proyectos",
  },
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
  {
    href: "/purchasing",
    label: "Compras",
    enabled: true,
    permission: PERMISSION_IDS.purchasingRead,
    phase: "Fase 7",
  },
  {
    href: "/suppliers",
    label: "Proveedores",
    enabled: true,
    permission: PERMISSION_IDS.purchasingRead,
    phase: "Fase 7",
  },
  {
    href: "/machines",
    label: "Máquinas",
    enabled: true,
    permission: PERMISSION_IDS.productionView,
    phase: "Fase 5",
  },
  {
    href: "/quality",
    label: "Calidad",
    enabled: true,
    permission: PERMISSION_IDS.qualityRead,
    phase: "Fase 8",
  },
  {
    href: "/deliveries",
    label: "Entregas",
    enabled: true,
    permission: PERMISSION_IDS.deliveriesRead,
    phase: "Fase 9",
  },
  {
    href: "/billing",
    label: "Facturación",
    enabled: true,
    permission: PERMISSION_IDS.billingRead,
    phase: "Fase 10",
  },
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
  {
    href: "/settings/branches",
    label: "Sucursales",
    enabled: true,
    permission: PERMISSION_IDS.branchesRead,
    phase: "Sucursales",
  },
  {
    href: "/settings/calculator",
    label: "Calculadora",
    enabled: true,
    permission: PERMISSION_IDS.quotesRead,
    phase: "Fase 3",
  },
];
