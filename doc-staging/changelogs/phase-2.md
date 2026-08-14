# Changelog — Fase 2 CRM

Fecha: 2026-08-13  
Repositorio: AMD Operations (`amd-app`)  
Alcance: clientes, contactos, ficha de cliente, historial.

---

## Funcionalidades agregadas

- Listado de clientes con búsqueda, filtros (estado, tipo), paginación (20) y orden por nombre.
- Alta y edición de cliente con persistencia en PostgreSQL.
- Archivo (soft delete) de cliente; archiva también sus contactos activos.
- Ficha de cliente: datos generales, contactos, notas, historial.
- Contactos N:1 por cliente; un contacto principal activo.
- Historial append-only en `activity_logs`.
- Seed de 10 clientes demo (`DEMO_CLIENTE_001` … `010`) claramente marcados.
- KPI de clientes activos en el dashboard (solo si el usuario tiene `customers:read`).
- Ítem **Clientes** habilitado en el sidebar.

No se implementaron cotizaciones, archivos, R2 ni conversión a pedido.

---

## Entidades creadas

| Tabla | Propósito |
|---|---|
| `customers` | Empresa, RFC, tipo, estado, notas, `is_demo`, `deleted_at` |
| `contacts` | Contactos de un cliente; `is_primary` |
| `activity_logs` | Auditoría de mutaciones CRM |

Enums PostgreSQL: `customer_type`, `customer_status`, `activity_action`, `activity_entity_type`.

---

## Migraciones ejecutadas

- `0001_crm` — crea enums, tablas, FKs e índices únicos parciales.
- Journal Drizzle: entradas 0000 (fundación) y 0001_crm.
- **Deuda:** no existe `src/db/migrations/meta/0001_snapshot.json`. El siguiente `drizzle-kit generate` puede reemitir el CRM si no se genera el snapshot.

---

## APIs / Server Actions

No hay REST público de CRM. Las mutaciones son Server Actions en `src/server/actions/customers.ts`:

- `createCustomerAction`
- `updateCustomerAction`
- `archiveCustomerAction`
- `createContactAction`
- `updateContactAction`
- `archiveContactAction`
- `setPrimaryContactAction`

Lectura: servicios `listCustomers`, `getCustomerById`, `listCustomerActivity`, `countActiveCustomers`.

Ruta HTTP existente de auth (Fase 1): `GET/POST /api/auth/[...all]`.

---

## Permisos agregados

| Permiso | Admin | Dirección | Ventas | Resto |
|---|---|---|---|---|
| `customers:read` | sí | sí | sí | no |
| `customers:write` | sí | no | sí | no |

El seed resincroniza `role_permissions` desde el catálogo.

---

## Pantallas

- `/customers`
- `/customers/new`
- `/customers/[id]`
- `/customers/[id]/edit`

---

## Bugs corregidos durante la fase

- Incompatibilidad de tipos RHF + Zod 4 (`z.preprocess` → transforms).
- Lint `no-explicit-any` en el tipado del seed CRM.

---

## Deuda técnica pendiente

Ver [[phase-2-audit]]:

1. Falta snapshot Drizzle 0001.
2. Sin tests de persistencia / flujo CRM.
3. Generación de código y chequeo de RFC fuera de la transacción de insert.
4. Re-seed hace `DELETE` físico de contactos demo.
5. El botón «Principal» no muestra error de la action.
6. Búsqueda ILIKE no escapa `%` / `_`.
7. Denegación de permiso redirige a `/dashboard` sin mensaje.
8. RFC sin dígito verificador SAT; teléfono/WhatsApp sin formato.
9. No hay restore de registros archivados.
10. TanStack Table aplazado (ADR-020).
