export const ROLE_IDS = {
  administrador: "administrador",
  direccion: "direccion",
  ventas: "ventas",
  ingenieria: "ingenieria",
  compras: "compras",
  produccion: "produccion",
  operador: "operador",
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
  branchesRead: "branches:read",
  branchesWrite: "branches:write",
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
  /** Ver y cerrar SOLO los procesos asignados a mí (piso). No expone clientes ni costos. */
  productionMyWork: "production:my_work",
  productionCreate: "production:create",
  productionUpdate: "production:update",
  productionCancel: "production:cancel",
  productionClose: "production:close",
  productionSchedule: "production:schedule",
  productionAssignMachine: "production:assign_machine",
  productionAssignOperator: "production:assign_operator",
  qualityRelease: "quality:release",
  qualityRead: "quality:read",
  qualityInspect: "quality:inspect",
  qualityNcr: "quality:ncr",
  purchasingRead: "purchasing:read",
  purchasingWrite: "purchasing:write",
  purchasingApprove: "purchasing:approve",
  purchasingReceive: "purchasing:receive",
  deliveriesRead: "deliveries:read",
  deliveriesWrite: "deliveries:write",
  deliveriesConfirm: "deliveries:confirm",
  billingRead: "billing:read",
  billingWrite: "billing:write",
  billingRegisterPayment: "billing:register_payment",
  inventoryRead: "inventory:read",
  inventoryWrite: "inventory:write",
  inventoryAdjust: "inventory:adjust",
  inventoryReserve: "inventory:reserve",
  inventoryConsume: "inventory:consume",
  ordersView: "orders:view",
  ordersCreate: "orders:create",
  ordersUpdate: "orders:update",
  ordersCancel: "orders:cancel",
  ordersApprove: "orders:approve",
  projectsView: "projects:view",
  projectsCreate: "projects:create",
  projectsUpdate: "projects:update",
  projectsClose: "projects:close",
  projectsCancel: "projects:cancel",
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

const INVENTORY_ALL: PermissionId[] = [
  PERMISSION_IDS.inventoryRead,
  PERMISSION_IDS.inventoryWrite,
  PERMISSION_IDS.inventoryAdjust,
  PERMISSION_IDS.inventoryReserve,
  PERMISSION_IDS.inventoryConsume,
];

const ORDERS_ALL: PermissionId[] = [
  PERMISSION_IDS.ordersView,
  PERMISSION_IDS.ordersCreate,
  PERMISSION_IDS.ordersUpdate,
  PERMISSION_IDS.ordersCancel,
  PERMISSION_IDS.ordersApprove,
];

const PROJECTS_ALL: PermissionId[] = [
  PERMISSION_IDS.projectsView,
  PERMISSION_IDS.projectsCreate,
  PERMISSION_IDS.projectsUpdate,
  PERMISSION_IDS.projectsClose,
  PERMISSION_IDS.projectsCancel,
];

const PRODUCTION_ALL: PermissionId[] = [
  PERMISSION_IDS.productionView,
  PERMISSION_IDS.productionMyWork,
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
      PERMISSION_IDS.branchesRead,
      PERMISSION_IDS.branchesWrite,
      PERMISSION_IDS.quotesRead,
      PERMISSION_IDS.engineeringRead,
      PERMISSION_IDS.ordersView,
      PERMISSION_IDS.projectsView,
      PERMISSION_IDS.productionView,
      PERMISSION_IDS.inventoryRead,
      PERMISSION_IDS.purchasingRead,
      PERMISSION_IDS.qualityRead,
      PERMISSION_IDS.deliveriesRead,
      PERMISSION_IDS.billingRead,
    ],
  },
  ventas: {
    name: "Ventas",
    description: "Clientes, cotizaciones, órdenes de trabajo y solicitudes de ingeniería.",
    permissions: [
      PERMISSION_IDS.dashboardRead,
      PERMISSION_IDS.customersRead,
      PERMISSION_IDS.customersWrite,
      PERMISSION_IDS.branchesRead,
      PERMISSION_IDS.quotesRead,
      PERMISSION_IDS.quotesWrite,
      PERMISSION_IDS.engineeringRead,
      PERMISSION_IDS.engineeringCreate,
      PERMISSION_IDS.engineeringApprove,
      ...ORDERS_ALL,
      ...PROJECTS_ALL,
      PERMISSION_IDS.productionView,
      PERMISSION_IDS.inventoryRead,
      PERMISSION_IDS.inventoryReserve,
      PERMISSION_IDS.deliveriesRead,
      PERMISSION_IDS.deliveriesWrite,
      PERMISSION_IDS.billingRead,
      PERMISSION_IDS.billingWrite,
      PERMISSION_IDS.billingRegisterPayment,
    ],
  },
  ingenieria: {
    name: "Ingeniería",
    description: "Solicitudes de diseño, CAD, revisión, aprobación y liberación.",
    permissions: [
      PERMISSION_IDS.dashboardRead,
      PERMISSION_IDS.branchesRead,
      ...ENGINEERING_ALL,
      PERMISSION_IDS.ordersView,
      PERMISSION_IDS.projectsView,
      PERMISSION_IDS.productionView,
      PERMISSION_IDS.inventoryRead,
      PERMISSION_IDS.qualityRead,
    ],
  },
  compras: {
    name: "Compras",
    description: "Proveedores, compras e inventario.",
    permissions: [
      PERMISSION_IDS.dashboardRead,
      PERMISSION_IDS.branchesRead,
      PERMISSION_IDS.ordersView,
      PERMISSION_IDS.projectsView,
      PERMISSION_IDS.inventoryRead,
      PERMISSION_IDS.purchasingRead,
      PERMISSION_IDS.purchasingWrite,
      PERMISSION_IDS.purchasingApprove,
      PERMISSION_IDS.purchasingReceive,
    ],
  },
  produccion: {
    name: "Jefe de Producción",
    description:
      "Programa números de parte, asigna operadores y máquinas, y cierra administrativamente.",
    permissions: [
      PERMISSION_IDS.dashboardRead,
      PERMISSION_IDS.branchesRead,
      PERMISSION_IDS.engineeringRead,
      PERMISSION_IDS.ordersView,
      PERMISSION_IDS.projectsView,
      ...PRODUCTION_ALL,
      PERMISSION_IDS.inventoryRead,
      PERMISSION_IDS.inventoryReserve,
      PERMISSION_IDS.inventoryConsume,
      PERMISSION_IDS.qualityRead,
      PERMISSION_IDS.deliveriesRead,
    ],
  },
  operador: {
    name: "Operador",
    description:
      "Solo ve y cierra los procesos que le fueron asignados. Sin acceso a clientes, costos, programación ni listados generales.",
    permissions: [
      PERMISSION_IDS.productionMyWork,
    ],
  },
  calidad: {
    name: "Calidad",
    description:
      "Cierre físico de números de parte, retrabajos y consulta de planos vigentes.",
    permissions: [
      PERMISSION_IDS.dashboardRead,
      PERMISSION_IDS.branchesRead,
      PERMISSION_IDS.engineeringRead,
      PERMISSION_IDS.ordersView,
      PERMISSION_IDS.projectsView,
      PERMISSION_IDS.productionView,
      PERMISSION_IDS.qualityRelease,
      PERMISSION_IDS.qualityRead,
      PERMISSION_IDS.qualityInspect,
      PERMISSION_IDS.qualityNcr,
      PERMISSION_IDS.inventoryRead,
      PERMISSION_IDS.deliveriesRead,
    ],
  },
  almacen: {
    name: "Almacén",
    description:
      "Inventario, entradas, salidas, ajustes y existencias. Consulta órdenes de trabajo para reservar y entregar a piso.",
    permissions: [
      PERMISSION_IDS.dashboardRead,
      PERMISSION_IDS.branchesRead,
      PERMISSION_IDS.ordersView,
      PERMISSION_IDS.productionView,
      ...INVENTORY_ALL,
      PERMISSION_IDS.purchasingRead,
      PERMISSION_IDS.purchasingReceive,
      PERMISSION_IDS.deliveriesRead,
      PERMISSION_IDS.deliveriesWrite,
      PERMISSION_IDS.deliveriesConfirm,
    ],
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
  "branches:read": {
    name: "Ver sucursales",
    description: "Consultar plazas de AMD México y usarlas al cotizar.",
  },
  "branches:write": {
    name: "Gestionar sucursales",
    description: "Crear, editar, activar o desactivar sucursales.",
  },
  "quotes:read": {
    name: "Ver cotizaciones",
    description: "Listar cotizaciones, partidas, costos y márgenes.",
  },
  "quotes:write": {
    name: "Gestionar cotizaciones",
    description:
      "Crear y editar cotizaciones, partidas, archivos, estados y conversión a orden de trabajo.",
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
    description: "Consultar números de parte en producción, máquinas, tiempos y KPIs de piso.",
  },
  "production:my_work": {
    name: "Ver y cerrar mis procesos",
    description:
      "Vista de piso: solo los procesos asignados al propio usuario, sin clientes ni costos. Permite iniciar y cerrar su trabajo.",
  },
  "production:create": {
    name: "Crear número de parte",
    description: "Crear números de parte anclados a una orden de trabajo.",
  },
  "production:update": {
    name: "Editar número de parte",
    description:
      "Editar cabecera del número de parte, centros, rutas y catálogos de piso.",
  },
  "production:cancel": {
    name: "Cancelar número de parte",
    description: "Cancelar un número de parte. No borra la orden de trabajo ni la RFQ.",
  },
  "production:close": {
    name: "Cerrar número de parte",
    description: "Cierre administrativo de la orden tras el sello físico de Calidad.",
  },
  "production:schedule": {
    name: "Programar número de parte",
    description: "Programar centro, máquina y ventana de piso.",
  },
  "production:assign_machine": {
    name: "Asignar máquina",
    description: "Asignar una máquina de un centro de trabajo al número de parte.",
  },
  "production:assign_operator": {
    name: "Asignar operador",
    description: "Asignar un operador registrado al número de parte.",
  },
  "quality:release": {
    name: "Liberar calidad",
    description:
      "Cierre físico del producto. Pasa el número de parte de Calidad a Terminada.",
  },
  "quality:read": {
    name: "Ver calidad",
    description: "Consultar inspecciones y NCR.",
  },
  "quality:inspect": {
    name: "Registrar inspección",
    description: "Capturar inspección de primera pieza, proceso o final.",
  },
  "quality:ncr": {
    name: "Gestionar NCR",
    description: "Abrir y cerrar no conformidades.",
  },
  "purchasing:read": {
    name: "Ver compras",
    description: "Consultar proveedores, OC y recepciones.",
  },
  "purchasing:write": {
    name: "Gestionar compras",
    description: "Crear proveedores y órdenes de compra.",
  },
  "purchasing:approve": {
    name: "Aprobar compras",
    description: "Aprobar OC urgentes y enviar al proveedor.",
  },
  "purchasing:receive": {
    name: "Recibir compras",
    description: "Registrar recepción de OC y generar entrada de inventario.",
  },
  "deliveries:read": {
    name: "Ver entregas",
    description: "Consultar guías y estado logístico.",
  },
  "deliveries:write": {
    name: "Gestionar entregas",
    description: "Crear entregas y capturar guía.",
  },
  "deliveries:confirm": {
    name: "Confirmar entrega",
    description: "Marcar entrega realizada o incidencia.",
  },
  "billing:read": {
    name: "Ver facturación",
    description: "Consultar facturas operativas y CxC.",
  },
  "billing:write": {
    name: "Emitir facturas",
    description: "Crear facturas operativas desde una orden de trabajo. No es CFDI.",
  },
  "billing:register_payment": {
    name: "Registrar pagos",
    description: "Capturar cobros contra factura operativa.",
  },
  "inventory:read": {
    name: "Ver inventario",
    description: "Consultar catálogo, existencias, movimientos, reservas y KPIs.",
  },
  "inventory:write": {
    name: "Gestionar inventario",
    description: "Crear y editar materiales, registrar entradas y salidas.",
  },
  "inventory:adjust": {
    name: "Ajustar inventario",
    description: "Corregir existencias con motivo obligatorio.",
  },
  "inventory:reserve": {
    name: "Reservar material",
    description: "Reservar o liberar material contra una orden de trabajo.",
  },
  "inventory:consume": {
    name: "Consumir material",
    description:
      "Registrar consumo de producción contra una reserva de orden de trabajo.",
  },
  "orders:view": {
    name: "Ver órdenes de trabajo",
    description: "Listar órdenes de trabajo, abrir ficha y ver trazabilidad comercial.",
  },
  "orders:create": {
    name: "Crear órdenes de trabajo",
    description: "Convertir una RFQ aprobada en orden de trabajo oficial.",
  },
  "orders:update": {
    name: "Editar órdenes de trabajo",
    description:
      "Actualizar responsable, fecha prometida, notas, proyecto, estado operativo y material de la OT.",
  },
  "orders:cancel": {
    name: "Cancelar órdenes de trabajo",
    description: "Cancelar una orden de trabajo sin borrar historial ni la RFQ.",
  },
  "orders:approve": {
    name: "Aprobar órdenes de trabajo",
    description: "Aprobar comercialmente una orden de trabajo pendiente.",
  },
  "projects:view": {
    name: "Ver proyectos",
    description: "Listar proyectos agrupadores y abrir su expediente.",
  },
  "projects:create": {
    name: "Crear proyectos",
    description: "Abrir un proyecto agrupador para un cliente.",
  },
  "projects:update": {
    name: "Editar proyectos",
    description: "Editar datos del proyecto y asociar RFQ u órdenes de trabajo.",
  },
  "projects:close": {
    name: "Cerrar proyectos",
    description: "Marcar un proyecto como completado.",
  },
  "projects:cancel": {
    name: "Cancelar proyectos",
    description: "Cancelar un proyecto agrupador. No borra órdenes de trabajo ni RFQ.",
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
