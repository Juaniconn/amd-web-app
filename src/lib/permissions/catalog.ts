export const ROLE_IDS = {
  administrador: "administrador",
  direccion: "direccion",
  ventas: "ventas",
  ingenieria: "ingenieria",
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
  customersRead: "customers:read",
  customersWrite: "customers:write",
  quotesRead: "quotes:read",
  quotesWrite: "quotes:write",
  engineeringRead: "engineering:read",
  engineeringCreate: "engineering:create",
  engineeringUpdate: "engineering:update",
  engineeringAssign: "engineering:assign",
  engineeringApprove: "engineering:approve",
  engineeringRelease: "engineering:release",
  engineeringDelete: "engineering:delete",
  productionView: "production:view",
  productionCreate: "production:create",
  productionUpdate: "production:update",
  productionCancel: "production:cancel",
  productionClose: "production:close",
  productionSchedule: "production:schedule",
  productionAssignMachine: "production:assign_machine",
  productionAssignOperator: "production:assign_operator",
  qualityRelease: "quality:release",
} as const;

export type PermissionId = (typeof PERMISSION_IDS)[keyof typeof PERMISSION_IDS];

const ENGINEERING_ALL: PermissionId[] = [
  PERMISSION_IDS.engineeringRead,
  PERMISSION_IDS.engineeringCreate,
  PERMISSION_IDS.engineeringUpdate,
  PERMISSION_IDS.engineeringAssign,
  PERMISSION_IDS.engineeringApprove,
  PERMISSION_IDS.engineeringRelease,
  PERMISSION_IDS.engineeringDelete,
];

const PRODUCTION_ALL: PermissionId[] = [
  PERMISSION_IDS.productionView,
  PERMISSION_IDS.productionCreate,
  PERMISSION_IDS.productionUpdate,
  PERMISSION_IDS.productionCancel,
  PERMISSION_IDS.productionClose,
  PERMISSION_IDS.productionSchedule,
  PERMISSION_IDS.productionAssignMachine,
  PERMISSION_IDS.productionAssignOperator,
];

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
      PERMISSION_IDS.customersRead,
      PERMISSION_IDS.quotesRead,
      PERMISSION_IDS.engineeringRead,
      PERMISSION_IDS.productionView,
    ],
  },
  ventas: {
    name: "Ventas",
    description: "Clientes, cotizaciones, pedidos y solicitudes de ingeniería.",
    permissions: [
      PERMISSION_IDS.dashboardRead,
      PERMISSION_IDS.customersRead,
      PERMISSION_IDS.customersWrite,
      PERMISSION_IDS.quotesRead,
      PERMISSION_IDS.quotesWrite,
      PERMISSION_IDS.engineeringRead,
      PERMISSION_IDS.engineeringCreate,
      PERMISSION_IDS.engineeringApprove,
      PERMISSION_IDS.productionView,
    ],
  },
  ingenieria: {
    name: "Ingeniería",
    description: "Solicitudes de diseño, CAD, revisión, aprobación y liberación.",
    permissions: [
      PERMISSION_IDS.dashboardRead,
      ...ENGINEERING_ALL,
      PERMISSION_IDS.productionView,
    ],
  },
  compras: {
    name: "Compras",
    description: "Proveedores, compras e inventario (módulos posteriores).",
    permissions: [PERMISSION_IDS.dashboardRead],
  },
  produccion: {
    name: "Producción",
    description: "Órdenes de trabajo (OT), máquinas, programación y cierre administrativo.",
    permissions: [
      PERMISSION_IDS.dashboardRead,
      PERMISSION_IDS.engineeringRead,
      ...PRODUCTION_ALL,
    ],
  },
  calidad: {
    name: "Calidad",
    description: "Cierre físico de OT, retrabajos y consulta de planos vigentes.",
    permissions: [
      PERMISSION_IDS.dashboardRead,
      PERMISSION_IDS.engineeringRead,
      PERMISSION_IDS.productionView,
      PERMISSION_IDS.qualityRelease,
    ],
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
  "customers:read": {
    name: "Ver clientes",
    description: "Listar clientes y abrir su ficha.",
  },
  "customers:write": {
    name: "Gestionar clientes",
    description: "Crear, editar y archivar clientes y contactos.",
  },
  "quotes:read": {
    name: "Ver cotizaciones",
    description: "Listar cotizaciones, partidas, costos y márgenes.",
  },
  "quotes:write": {
    name: "Gestionar cotizaciones",
    description:
      "Crear y editar cotizaciones, partidas, archivos, estados y conversión a pedido.",
  },
  "engineering:read": {
    name: "Ver ingeniería",
    description: "Listar solicitudes de ingeniería, archivos CAD y KPIs.",
  },
  "engineering:create": {
    name: "Crear ingeniería",
    description: "Abrir una solicitud de ingeniería desde una RFQ.",
  },
  "engineering:update": {
    name: "Editar ingeniería",
    description: "Editar cabecera, horas, archivos y avanzar diseño/correcciones.",
  },
  "engineering:assign": {
    name: "Asignar ingeniería",
    description: "Asignar un responsable a la solicitud.",
  },
  "engineering:approve": {
    name: "Aprobar ingeniería",
    description: "Registrar revisión interna o aprobación del cliente.",
  },
  "engineering:release": {
    name: "Liberar ingeniería",
    description: "Liberar el plano vigente hacia cotización final y producción.",
  },
  "engineering:delete": {
    name: "Eliminar ingeniería",
    description: "Archivar una solicitud pendiente o cancelada.",
  },
  "production:view": {
    name: "Ver producción",
    description: "Consultar órdenes de trabajo, máquinas, tiempos y KPIs de piso.",
  },
  "production:create": {
    name: "Crear OT",
    description: "Crear órdenes de trabajo ancladas a un pedido.",
  },
  "production:update": {
    name: "Editar OT",
    description: "Editar cabecera de OT, centros, rutas y catálogos de piso.",
  },
  "production:cancel": {
    name: "Cancelar OT",
    description: "Cancelar una orden de trabajo. No borra el pedido ni la RFQ.",
  },
  "production:close": {
    name: "Cerrar OT",
    description: "Cierre administrativo de la orden tras el sello físico de Calidad.",
  },
  "production:schedule": {
    name: "Programar OT",
    description: "Programar centro, máquina y ventana de piso.",
  },
  "production:assign_machine": {
    name: "Asignar máquina",
    description: "Asignar una máquina de un centro de trabajo a la OT.",
  },
  "production:assign_operator": {
    name: "Asignar operador",
    description: "Asignar un operador registrado a la OT.",
  },
  "quality:release": {
    name: "Liberar calidad",
    description: "Cierre físico del producto. Pasa la OT de Calidad a Terminada.",
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
