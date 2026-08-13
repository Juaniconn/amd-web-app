export const ROLE_IDS = {
  administrador: "administrador",
  direccion: "direccion",
  ventas: "ventas",
  compras: "compras",
  produccion: "produccion",
  calidad: "calidad",
  almacen: "almacen",
} as const;

export type RoleId = (typeof ROLE_IDS)[keyof typeof ROLE_IDS];

export const PERMISSION_IDS = {
  dashboardRead: "dashboard:read",
  settingsRead: "settings:read",
  usersRead: "users:read",
  usersWrite: "users:write",
  rolesRead: "roles:read",
  rolesWrite: "roles:write",
} as const;

export type PermissionId = (typeof PERMISSION_IDS)[keyof typeof PERMISSION_IDS];

export const ROLES: Record<
  RoleId,
  { name: string; description: string; permissions: PermissionId[] }
> = {
  administrador: {
    name: "Administrador",
    description: "Acceso completo a AMD Operations.",
    permissions: Object.values(PERMISSION_IDS),
  },
  direccion: {
    name: "Dirección",
    description: "Dashboard, operación y consulta de configuración.",
    permissions: [
      PERMISSION_IDS.dashboardRead,
      PERMISSION_IDS.settingsRead,
      PERMISSION_IDS.usersRead,
      PERMISSION_IDS.rolesRead,
    ],
  },
  ventas: {
    name: "Ventas",
    description: "Clientes, cotizaciones y pedidos (módulos posteriores).",
    permissions: [PERMISSION_IDS.dashboardRead],
  },
  compras: {
    name: "Compras",
    description: "Proveedores, compras e inventario (módulos posteriores).",
    permissions: [PERMISSION_IDS.dashboardRead],
  },
  produccion: {
    name: "Producción",
    description: "Órdenes de producción, máquinas y materiales (módulos posteriores).",
    permissions: [PERMISSION_IDS.dashboardRead],
  },
  calidad: {
    name: "Calidad",
    description: "Inspecciones y producción (módulos posteriores).",
    permissions: [PERMISSION_IDS.dashboardRead],
  },
  almacen: {
    name: "Almacén",
    description: "Inventario, entradas, salidas y recepción (módulos posteriores).",
    permissions: [PERMISSION_IDS.dashboardRead],
  },
};

export const PERMISSIONS: Record<
  PermissionId,
  { name: string; description: string }
> = {
  "dashboard:read": {
    name: "Ver dashboard",
    description: "Acceso al dashboard inicial.",
  },
  "settings:read": {
    name: "Ver configuración",
    description: "Acceso a la sección de configuración.",
  },
  "users:read": {
    name: "Ver usuarios",
    description: "Listar usuarios del sistema.",
  },
  "users:write": {
    name: "Gestionar usuarios",
    description: "Crear usuarios y asignar roles.",
  },
  "roles:read": {
    name: "Ver roles",
    description: "Consultar roles y permisos.",
  },
  "roles:write": {
    name: "Gestionar roles",
    description: "Modificar la matriz de permisos. Reservado al administrador.",
  },
};

export function roleHasPermission(
  roleId: RoleId,
  permissionId: PermissionId,
): boolean {
  return ROLES[roleId].permissions.includes(permissionId);
}

export function permissionsForRoles(roleIds: RoleId[]): PermissionId[] {
  const set = new Set<PermissionId>();
  for (const roleId of roleIds) {
    const role = ROLES[roleId];
    if (!role) continue;
    for (const permission of role.permissions) {
      set.add(permission);
    }
  }
  return [...set];
}
