# 0. ESTADO TÉCNICO ACTUAL

**Fecha:** 2026-08-13  
Este bloque documenta el sistema **tal como está compilado y migrado**. Las secciones 1–40 de este archivo siguen siendo la especificación objetivo; no se borran.

## Arquitectura real

Monolito Next.js (App Router) en un solo repositorio. Servidor Node en desarrollo (`next dev --hostname 0.0.0.0`). PostgreSQL embebido local (`embedded-postgres`) + Drizzle. Autenticación Better Auth. Autorización RBAC en tablas + catálogo TypeScript. Mutaciones de negocio por Server Actions. Sin API REST de CRM.

No hay deploy a Cloudflare. No hay Workers, Pages, D1, R2, KV ni Queues en el repositorio.

```text
Navegador
    → Next.js 16.3 (React 19)
        → Better Auth (cookie de sesión)
        → Server Actions / servicios
            → Drizzle ORM
                → PostgreSQL
```

## Stack instalado (package.json)

| Capa | Librería | Versión declarada |
|---|---|---|
| Framework | `next` | 16.3.0 |
| UI | `react` / `react-dom` | 19.2.8 |
| Lenguaje | TypeScript | ^5 |
| Estilos | `tailwindcss` | ^4 |
| Componentes | `shadcn` + `@base-ui/react` (base-nova) | ^4.17.0 / ^1.7.0 |
| Formularios | `react-hook-form` + `@hookform/resolvers` | ^7.85.0 / ^5.7.1 |
| Validación | `zod` | ^4.4.3 |
| ORM | `drizzle-orm` / `drizzle-kit` | ^0.45.2 / ^0.31.10 |
| Driver SQL | `postgres` | ^3.4.9 |
| Auth | `better-auth` | ^1.6.27 |
| Toasts | `sonner` | ^2.0.8 |
| Tests | `vitest` | ^4.1.10 |

**Diseñado en este spec, no instalado:** TanStack Table, Sentry, cliente R2, Wrangler, Cloudflare KV/D1/Queues.

React Hook Form **sí** se usa en el formulario de cliente (Fase 2). TanStack Table **no** está en `package.json` (ADR-020).

## Estructura real de `src/` (no la árbol objetivo §9)

```text
src/
├── app/
│   ├── (auth)/login/
│   ├── (dashboard)/
│   │   ├── dashboard/
│   │   ├── customers/          ✅
│   │   │   ├── new/
│   │   │   └── [id]/edit/
│   │   └── settings/users|roles/
│   └── api/auth/[...all]/      (Better Auth)
├── components/                 (layout, ui, kpi-card)
├── features/customers/         ✅
├── server/actions/             auth.ts, customers.ts
├── server/services/            auth, dashboard, customers, contacts, activity
├── db/schema/                  auth, rbac, crm, activity
├── db/migrations/              0000_*, 0001_crm.sql
├── lib/auth, permissions, validation, audit, navigation
└── test/
```

No existen: `src/server/repositories/`, `src/lib/storage/`, rutas `quotes|orders|production|inventory|purchasing|quality|deliveries`.

## Modelos persistidos

**Fase 1:** `users`, `sessions`, `accounts`, `verifications`, `roles`, `permissions`, `user_roles`, `role_permissions`.

**Fase 2:** `customers`, `contacts`, `activity_logs`.

Enums: `customer_type`, `customer_status`, `activity_action`, `activity_entity_type`.

Relaciones: `contacts.customer_id` → `customers.id` (RESTRICT); `customers.created_by` / `updated_by` → `users.id` (SET NULL); `activity_logs.actor_user_id` → `users.id` (SET NULL). Soft delete en clientes y contactos. Un principal activo por cliente (índice único parcial). RFC único entre no archivados.

## APIs

| Superficie | Existe |
|---|---|
| `GET/POST /api/auth/[...all]` | ✅ Better Auth |
| Server Actions CRM (`src/server/actions/customers.ts`) | ✅ 7 actions |
| Server Actions auth/usuarios | ✅ Fase 1 |
| REST `/api/customers` | ❌ No |
| Workers / D1 bindings | ❌ No |

## Autenticación

Better Auth, email/password, signup cerrado. Sesión por cookie. El servidor escucha en `0.0.0.0` para LAN (ADR-019). Trusted hosts en código de auth.

## Autorización

Catálogo en `src/lib/permissions/catalog.ts`. Pages y Server Actions llaman `requirePermission`.

| Permiso | Admin | Dirección | Ventas | Compras / Producción / Calidad / Almacén |
|---|---|---|---|---|
| `dashboard:read` | sí | sí | sí | sí |
| `settings:read` | sí | sí | no | no |
| `users:read` / `users:write` | sí | read | no | no |
| `roles:read` / `roles:write` | sí | read | no | no |
| `customers:read` | sí | sí | sí | no |
| `customers:write` | sí | no | sí | no |

No existen permisos `quotes:*`, `orders:*`, `production:*`, `inventory:*`, `purchasing:*`, `quality:*`, `billing:*`.

## Cloudflare

| Servicio | Estado real |
|---|---|
| Workers | No hay `wrangler.toml` ni worker |
| Pages | No hay pipeline de deploy |
| D1 | No se usa; la BD es PostgreSQL |
| R2 | No hay bucket ni SDK |
| KV | No hay namespace |
| Queues | No hay |
| DNS / WAF / Analytics | No configurados en este repo |

Variables de entorno de Cloudflare/R2 **no** están definidas en el código. El spec §22 y §34 las reserva para fases futuras.

## Calidad verificada al cierre de Fase 2

`npm run typecheck` OK · `npm run lint` 0 errores · `npm test` 23/23 · `npm run build` OK · `db:migrate` + `db:seed` + `db:verify` OK.

Deuda: falta `src/db/migrations/meta/0001_snapshot.json`. Ver [[phase-2-audit]].

---
