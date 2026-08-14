# Operadores y Roles

Última actualización: 2026-08-13.

Hay que distinguir **roles RBAC del sistema** (existen) de **puestos de planta** (guía operativa) y de **permisos operativos de Fase 4** (diseño; no están en el catálogo).

Los responsables de máquina u OP serán **usuarios registrados**. No se asumen personas concretas.

**Modelo operativo:** validado por Dirección (ADR-030, [[Pendiente Validacion Direccion]]).

Ver [[Proceso Producción]], `src/lib/permissions/catalog.ts`, BUSINESS_SPEC §33, ADR-008, ADR-029, ADR-030.

---

## Lo que existe en AMD Operations

Roles sembrados: Administrador, Dirección, Ventas, Compras, **Producción**, **Calidad**, **Almacén**.

| Rol RBAC | Permisos reales | Módulos que ve |
|---|---|---|
| Administrador | todo el catálogo | Dashboard, Clientes, Cotizaciones, Usuarios, Roles |
| Dirección | `dashboard:read`, `settings:read`, `users:read`, `roles:read`, `customers:read`, `quotes:read` | Consulta CRM y RFQ |
| Ventas | `dashboard:read`, `customers:*`, `quotes:*` | Opera CRM y RFQ; convierte a pedido |
| Compras | `dashboard:read` | Solo dashboard |
| Producción | `dashboard:read` | Solo dashboard |
| Calidad | `dashboard:read` | Solo dashboard |
| Almacén | `dashboard:read` | Solo dashboard |

No existen: `production:*`, `orders:*`, `inventory:*`, `purchasing:*`, `quality:*`, `billing:*`. Tampoco existen aún los cinco permisos operativos de abajo.

---

## Permisos operativos (diseño Fase 4)

Se asignan a **roles**; los roles, a **usuarios** de la plataforma. IDs exactos al implementar. **No hay código.**

| Permiso de negocio | Intención | Transición / acto | ¿Existe hoy? |
|---|---|---|---|
| Autorizar Producción | Liberar OP a piso | `Pendiente` → `Liberada` | No |
| Liberar Material | Entregar o reservar insumo a la OP | Alimenta `Esperando Material` / reserva (Inventario ⬜) | No |
| Programar Máquinas | Centro, máquina Activa, operador (usuario), ventana | → `Programada` | No |
| Liberar Calidad | Inspección aceptada | `Calidad` → `Terminada` | No |
| Cerrar Orden | Cierre de piso / entrega | `Terminada` → `Entregada` (o cierre comercial futuro) | No |

Administrar el maestro de máquinas (crear/editar/desactivar/eliminar) es **catálogo**, no uno de estos cinco. Lo ejerce Administrador.

---

## Asignación aprobada (ADR-030)

Puestos → actos. Al implementar se mapean a roles RBAC + los cinco permisos. **Ningún puesto nuevo está en `role_id` hoy.**

| Acto aprobado | Puesto responsable | Permiso de negocio |
|---|---|---|
| Programar trabajos (asignar OP, máquina, operador; balancear carga; ajustar prioridad de piso) | Supervisor de Producción | Programar Máquinas |
| Priorizar órdenes | Dirección General, Ventas y Supervisor de Producción | (prioridad 1–4; no es un sexto permiso nombrado) |
| Autorizar compras urgentes | Dirección General (futuro: Gerente de Operaciones) | Compras Fase 6; no hay `purchasing:*` |
| Liberar producto terminado | Inspector de Calidad (principal); Supervisor de Producción (alternativa) | Liberar Calidad |
| Registrar horas máquina / hombre | Operador asignado (inicio/fin) | Avance de operación |
| Autorizar Producción (liberar OP a piso) | No reasignado en esta validación; sigue el permiso de negocio | Autorizar Producción |
| Liberar Material | Almacén cuando exista Inventario | Liberar Material |
| Cerrar Orden | Tras liberación; Entregas / Almacén | Cerrar Orden |

---

No existen como `role_id`: Gerente Producción, Supervisor Producción, Operador CNC, Operador Láser, Operador Torno, Inspector Calidad (el inspector de planta usará el rol **Calidad** cuando haya permisos).

`/production` y `/machines` están deshabilitados para todos.

---

## Puestos de planta (diseño Fase 4)

Estos nombres son responsabilidades operativas. Al implementar, se mapean a permisos nuevos sobre los roles RBAC existentes, **o** se crean roles adicionales con ADR. Esta preparación documental **no** crea roles.

### Gerente Producción

**Responsabilidades diseñadas:**

- Dueño de visibilidad de piso y KPIs de producción para Dirección.
- No sustituye al Supervisor en la programación diaria (eso está aprobado al Supervisor).

**Mapeo RBAC sugerido (no implementado):** rol `produccion` + `production:*` de escritura amplia; Dirección con lectura.

**Hoy:** un usuario con rol Producción no ve OP.

---

### Supervisor Producción

**Aprobado por Dirección (ADR-030):**

- Asignar órdenes
- Asignar máquinas
- Asignar operadores
- Balancear carga
- Ajustar prioridades
- Liberar producto terminado **si no hay Inspector** (alternativa)

Permiso: **Programar Máquinas**; alternativa **Liberar Calidad**.

**Hoy:** el rol RBAC Producción solo tiene `dashboard:read`. No existe `role_id` supervisor.

---

### Operador CNC

**Responsabilidades diseñadas:**

- Ejecutar OP asignadas al centro CNC. Registrar **horas máquina** y **horas hombre** (inicio/fin, orden, operación).
- No cambia precios ni estados de cotización.

**Mapeo RBAC sugerido:** `production:write` limitado a avance de OP propias. No hay usuario-por-máquina.

---

### Operador Láser

**Responsabilidades diseñadas:**

- Igual que CNC, acotado al centro Láser (Láser #1 y #2).

**Mapeo RBAC:** no hay rol distinto. El centro de la OP discrimina el puesto, no el `role_id`.

---

### Operador Torno

**Responsabilidades diseñadas:**

- Igual, acotado a Tornos (Torno #1 y #2).

No hay en el listado de puestos: operador de Doblado, Wire EDM, Router CNC, Rectificado, Moldeo, Prototipado (Ultimaker S5), soldadura o ensamble. Esas estaciones las cubre Supervisor / Gerente hasta que Administración defina puestos. **No se inventan roles RBAC por estación.**

---

### Inspector Calidad

**Responsabilidades diseñadas:**

- Primera pieza, en proceso, final.
- Registrar Aprobado / Aprobado con observaciones / Rechazado.
**Aprobado:** responsable **principal** de liberación de producto terminado (Producción → Calidad → Liberación → Entrega). Permiso **Liberar Calidad**.

**Mapeo RBAC:** rol existente `calidad` + futuros `quality:*`. Hoy solo `dashboard:read`.

---

### Almacén

**Responsabilidades diseñadas:**

- Entregar material a la OP (reserva / surplus) cuando exista Inventario (Fase 5).
- Recibir producto terminado y preparar embarque (Fase 8).
- No opera cotizaciones.

**Mapeo RBAC:** rol existente `almacen` + futuros `inventory:*` / permisos de entrega. Hoy solo `dashboard:read`.

---

## Matriz de proceso (aprobado vs hoy)

| Actividad | Puesto aprobado | Permiso | ¿Hoy? |
|---|---|---|---|
| Convertir RFQ a pedido | Ventas | `quotes:write` | Sí |
| Autorizar Producción | (permiso de negocio; usuario con el rol que se configure) | Autorizar Producción | No |
| Liberar Material | Almacén (Inventario ⬜) | Liberar Material | No |
| Programar Máquinas | Supervisor de Producción | Programar Máquinas | No |
| Registrar horas | Operador asignado | Avance | No |
| Liberar Calidad | Inspector (alt. Supervisor) | Liberar Calidad | No |
| Cerrar Orden | Tras liberación / Entregas | Cerrar Orden | No |
| CRUD máquinas | Administrador | Catálogo | No |
| Compras urgentes | Dirección General | Compras ⬜ | No |

---

## Usuarios

Fase 1 permite crear usuarios y asignar los 7 roles. No hay seed de «operador CNC 1». Los datos demo de producción (§42: 8 OP) no están sembrados.
