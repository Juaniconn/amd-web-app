# CRM

# Objetivo

Mantener el maestro de clientes y contactos de AMD Operations, con historial de cambios.

# Alcance

**Implementado (Fase 2):**

- Clientes
- Contactos
- Ficha de cliente
- Historial (`activity_logs`)

**No implementado (se ve como placeholder en la ficha):**

- Cotizaciones, pedidos, producción, facturación, pagos, documentos

# Flujo de negocio

1. Ventas o Administrador crea un cliente.
2. Se agregan contactos. El primero queda como principal.
3. Se consulta o edita la ficha.
4. Si el cliente ya no opera, se archiva (soft delete). Los contactos activos se archivan con él.
5. Toda mutación queda en historial.

# Entidades

## `customers`

`id`, `code` (único; reales `CLI-AAAA-00001`, demo `DEMO_CLIENTE_00N`), `legal_name`, `trade_name`, `rfc` (único si no es nulo y no está archivado), `phone`, `email`, `address`, `city`, `state`, `country` (default México), `type` (`industrial` \| `maquiladora` \| `comercial` \| `otro`), `status` (`activo` \| `inactivo`), `notes`, `is_demo`, `created_by`, `updated_by`, `deleted_at`, timestamps.

## `contacts`

`id`, `customer_id` (FK restrict), `name`, `title`, `email`, `phone`, `whatsapp`, `department`, `is_primary`, `notes`, `is_demo`, `created_by`, `updated_by`, `deleted_at`, timestamps.

Un solo `is_primary = true` por cliente entre contactos no archivados.

## `activity_logs`

`actor_user_id`, `action` (`created` \| `updated` \| `deleted` \| `primary_contact_changed`), `entity_type` (`customer` \| `contact`), `entity_id`, `parent_entity_*`, `previous_value`, `new_value` (jsonb), `summary`, `created_at`. Append-only.

# Permisos

| Permiso | Quién |
|---|---|
| `customers:read` | Administrador, Dirección, Ventas |
| `customers:write` | Administrador, Ventas |

Las pages y las Server Actions llaman `requirePermission`. Ocultar un botón no basta.

# APIs

Server Actions en `src/server/actions/customers.ts` (no hay REST de CRM):

`createCustomerAction`, `updateCustomerAction`, `archiveCustomerAction`, `createContactAction`, `updateContactAction`, `archiveContactAction`, `setPrimaryContactAction`.

Servicios: `src/server/services/customers.ts`, `contacts.ts`, `activity.ts`.

# Pantallas

| Ruta | Función |
|---|---|
| `/customers` | Listado |
| `/customers/new` | Alta |
| `/customers/[id]` | Ficha |
| `/customers/[id]/edit` | Edición |

Componentes: `src/features/customers/*`.

# Estados

Cliente: `activo`, `inactivo`. Archivo = `deleted_at` no nulo (no aparece en el listado; la ficha por URL sí se puede abrir).

# Relaciones

```
users 1—N customers (created_by / updated_by, SET NULL)
customers 1—N contacts (RESTRICT)
users 1—N activity_logs (actor, SET NULL)
contact.activity → parent customer
```

# Riesgos

- Re-seed borra contactos de clientes DEMO.
- Carrera al generar `code` / RFC fuera de transacción.
- Sin restore de archivados.

# Dependencias

- Requiere Fase 1 (auth, RBAC, layout, PostgreSQL).
- Es dependencia de Fase 3 Cotizaciones.
- ADR-020, ADR-010, ADR-011.
