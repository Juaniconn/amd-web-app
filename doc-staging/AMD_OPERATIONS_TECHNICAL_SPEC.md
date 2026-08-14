# AMD OPERATIONS — TECHNICAL MASTER SPEC
## Cursor + Grok 4.6 + Cloudflare

> Este documento define **cómo** debe construirse AMD Operations.
> La especificación funcional y de negocio se encuentra en `AMD_OPERATIONS_BUSINESS_SPEC.md`.
> Ambos documentos deben leerse conjuntamente y tratarse como una única fuente de verdad.

---

# 0. ESTADO TÉCNICO ACTUAL

**Fecha:** 2026-08-14  
Este bloque documenta el sistema **tal como está compilado y migrado** tras Fase 4. Las secciones 1–40 siguen siendo la especificación objetivo; no se borran. Numeración operativa vigente: **Fase 4 = Ingeniería y Diseño ✅** (ADR-032). ADR-026 queda reemplazada en numeración. No hay código de producción.

## Arquitectura actual

Monolito Next.js (App Router) en un solo repositorio. Servidor Node en desarrollo (`next dev --hostname 0.0.0.0`). PostgreSQL (embebido `embedded-postgres`, Docker `postgres:16-alpine`, o `DATABASE_URL`) + Drizzle. Autenticación Better Auth. Autorización RBAC (tablas + catálogo TypeScript). Mutaciones de negocio por Server Actions. Una Route Handler de descarga de documentos. Sin API REST de CRM ni de cotizaciones.

No hay deploy a Cloudflare. No hay Workers, Pages, D1, R2 SDK, KV ni Queues en el repositorio. El enum `document_storage_backend` incluye `r2`, pero `getStorage()` siempre devuelve el adapter local (ADR-022).

```text
Navegador
    → Next.js 16.3 (React 19) · proxy de sesión (`src/proxy.ts`)
        → Better Auth (cookie)
        → Pages / Server Actions / GET /api/documents/[id]
            → servicios (`src/server/services`)
                → Drizzle ORM → PostgreSQL
                → storage local `.data/uploads`
```

## Stack tecnológico instalado (`package.json`)

| Capa | Librería | Versión declarada |
|---|---|---|
| Framework | `next` | 16.3.0 |
| UI | `react` / `react-dom` | 19.2.8 |
| Lenguaje | TypeScript | ^5 |
| Estilos | `tailwindcss` + `@tailwindcss/postcss` | ^4 |
| Animación CSS | `tw-animate-css` | ^1.4.0 |
| Componentes | `shadcn` + `@base-ui/react` | ^4.17.0 / ^1.7.0 |
| Iconos | `lucide-react` | ^1.31.0 |
| Temas | `next-themes` | ^0.4.6 |
| Formularios | `react-hook-form` + `@hookform/resolvers` | ^7.85.0 / ^5.7.1 |
| Validación | `zod` | ^4.4.3 |
| ORM | `drizzle-orm` / `drizzle-kit` | ^0.45.2 / ^0.31.10 |
| Driver SQL | `postgres` | ^3.4.9 |
| Auth | `better-auth` | ^1.6.27 |
| Toasts | `sonner` | ^2.0.8 |
| Utilidades UI | `class-variance-authority`, `clsx`, `tailwind-merge` | ^0.7.1 / ^2.1.1 / ^3.6.0 |
| Tests | `vitest` | ^4.1.10 |
| Postgres local | `embedded-postgres` | ^18.4.0-beta.17 |
| Scripts | `tsx`, `dotenv` | ^4.23.12 / ^17.4.2 |

**Diseñado en este spec, no instalado:** TanStack Table, Sentry, cliente R2, Wrangler, Cloudflare KV/D1/Queues.

React Hook Form se usa en formularios de cliente y cotización. TanStack Table **no** está en `package.json` (ADR-020).

## Estructura real de `src/` (no el árbol objetivo §9)

```text
src/
├── app/
│   ├── (auth)/login/
│   ├── (dashboard)/
│   │   ├── dashboard/
│   │   ├── customers/          ✅  new/ [id]/ [id]/edit
│   │   ├── quotes/             ✅  new/ [id]/ [id]/edit
│   │   ├── engineering/        ✅  new/ [id]/ [id]/edit
│   │   └── settings/users|roles/
│   └── api/
│       ├── auth/[...all]/      Better Auth
│       └── documents/[id]/     GET descarga autenticada
├── components/                 layout, auth, dashboard, ui (shadcn)
├── features/customers/         ✅
├── features/quotes/            ✅
├── features/engineering/       ✅
├── server/actions/             auth.ts, customers.ts, quotes.ts, engineering.ts
├── server/services/            auth, access, dashboard, customers, contacts,
│                               activity, quotes, documents, engineering, numbering
├── db/schema/                  auth, rbac, crm, activity, quotes, documents, engineering
├── db/migrations/              0000_*, 0001_crm.sql, 0002_quotes.sql, 0003_engineering.sql
├── lib/auth, permissions, quotes, engineering, storage, validation, audit, navigation
└── proxy.ts                    gate de sesión (Next 16; no hay middleware.ts)
```

No existen: `src/server/repositories/`, rutas de páginas `orders|production|inventory|purchasing|quality|deliveries`. El adapter R2 no está implementado; el tipo existe en `src/lib/storage`.

## Modelos de datos persistidos

**Fase 1:** `users`, `sessions`, `accounts`, `verifications`, `roles`, `permissions`, `user_roles`, `role_permissions`.

**Fase 2:** `customers`, `contacts`, `activity_logs`.

**Fase 3:** `quotes`, `quote_items`, `documents`, `orders`, `order_items`.

**Fase 4 Ingeniería:** `engineering_requests`, `engineering_hours`. Columnas RFQ/origen en `quotes` y `orders`. ADR-033, ADR-034, ADR-035.

**Fase 5 Producción (docs only):** no hay `production_orders`, `production_operations`, `work_centers`, `machines`. Ver [[production]] y ADR-025.

**Enums:** `customer_type`, `customer_status`, `quote_status`, `quote_currency`, `quote_rfq_type`, `quote_engineering_type`, `quote_engineering_status`, `order_status` (`nuevo`), `order_origin`, `engineering_request_status`, `engineering_priority`, `document_entity_type`, `document_storage_backend`, `activity_action`, `activity_entity_type`.

Migraciones Drizzle: `0000_faithful_mattie_franklin`, `0001_crm`, `0002_quotes`, `0003_engineering`. Snapshots `meta/0000`–`0002` presentes (`0003` SQL + journal). El journal debe ser UTF-8 **sin BOM**.

## Relaciones entre entidades (Fase 3)

```text
customers 1—N contacts          (RESTRICT)
customers 1—N quotes            (RESTRICT)
contacts  1—N quotes            (SET NULL, opcional)
quotes    1—N quote_items       (CASCADE)
quotes    1—1 orders            (quote_id UNIQUE, RESTRICT)
orders    1—N order_items       (CASCADE)
quotes.converted_order_id → orders.id  (SET NULL, único si no null)
documents (polimórfico: entity_type + entity_id; sin FK)
activity_logs (polimórfico; actor → users SET NULL)
users ← created_by / updated_by / owner_user_id / uploaded_by  (SET NULL)
```

Soft delete: `customers`, `contacts`, `quotes` (`deleted_at`). Un contacto principal activo por cliente. RFC único entre no archivados. Número de cotización y de pedido únicos.

## Entidad — Engineering Request

Tabla `engineering_requests`. 1 RFQ → 0..1 solicitud activa (ADR-033).

```text
customers              1—N  engineering_requests
quotes                 1—0..1  engineering_requests     (único si deleted_at is null)
engineering_requests   1—N  engineering_hours
engineering_requests   0..N  documents                 (entity_type = engineering_request)
engineering_requests   →  orders.engineering_request_id  (al convertir tras Liberado)
```

`convertQuoteToOrder` **exige** `liberado` si `requires_engineering` (ADR-034). `GET /api/documents/[id]` autoriza `quote` (`quotes:read`) y `engineering_request` (`engineering:read`).

Permisos `engineering:*`. Rol `ingenieria`. Estados: [[Estados Ingenieria]].

---

## APIs reales

| Superficie | Existe |
|---|---|
| `GET/POST /api/auth/[...all]` | ✅ Better Auth |
| `GET /api/documents/[id]` | ✅ sesión + `quotes:read` si `entity_type = quote`; otros tipos 403 |
| Server Actions CRM (`customers.ts`) | ✅ 7 actions |
| Server Actions quotes (`quotes.ts`) | ✅ create/update/archive, status, convert (gate Liberado), duplicate, items, upload/delete document |
| Server Actions engineering (`engineering.ts`) | ✅ create/update/assign/status/hours/archive, upload/delete document |
| Server Actions auth/usuarios | ✅ Fase 1 |
| REST `/api/customers` o `/api/quotes` | ❌ No |
| Workers / D1 bindings | ❌ No |

## Componentes UI reales

**Layout:** `app-shell`, `app-sidebar`, `app-header`, `user-menu`, `providers`.

**Auth:** `login-form`.

**Dashboard:** `kpi-card`.

**CRM:** `src/features/customers/*` (listado, ficha, formulario, contactos, historial).

**Cotizaciones:** `quote-form`, `quote-filters`, `quote-items-panel`, `quote-documents`, `quote-status-actions`, `archive-quote-button`.

**Ingeniería:** `engineering-form`, `engineering-filters`, `engineering-documents`, `engineering-status-actions`, `engineering-hours-panel`, `archive-engineering-button`.

**shadcn/ui presentes:** button, input, label, textarea, select, table, card, badge, dialog, dropdown-menu, avatar, separator, sonner.

Sidebar: Dashboard, Clientes, Cotizaciones, Ingeniería habilitados. Pedidos y el resto de operación deshabilitados con etiqueta de fase. Sistema: Usuarios y Roles.

## Roles y permisos reales

Catálogo: `src/lib/permissions/catalog.ts`. Pages y Server Actions llaman `requirePermission`. Sin permiso → redirect a `/dashboard`.

| Permiso | Admin | Dirección | Ventas | Compras / Producción / Calidad / Almacén |
|---|---|---|---|---|
| `dashboard:read` | sí | sí | sí | sí |
| `settings:read` | sí | sí | no | no |
| `users:read` / `users:write` | sí | read | no | no |
| `roles:read` / `roles:write` | sí | read | no | no |
| `customers:read` | sí | sí | sí | no |
| `customers:write` | sí | no | sí | no |
| `quotes:read` | sí | sí | sí | no |
| `quotes:write` | sí | no | sí | no |
| `engineering:read` | sí | sí | sí | Producción y Calidad: sí. Compras/Almacén: no |

Rol adicional **Ingeniería**: `dashboard:read` + todos los `engineering:*`. Ventas también `engineering:create` y `engineering:approve`.

No existen permisos `orders:*`, `production:*`, `inventory:*`, `purchasing:*`, `quality:*`, `billing:*`. Dirección **no** escribe cotizaciones; las consulta (importes y márgenes).

## Estrategia Cloudflare (diseño vs runtime)

ADR-002 sigue vigente como destino de infraestructura. **En este repositorio no hay configuración Cloudflare ejecutable.**

| Servicio | Estado real |
|---|---|
| Workers | No hay `wrangler.toml` ni worker |
| Pages | No hay pipeline de deploy |
| D1 | No se usa; la BD es PostgreSQL |
| R2 | No hay bucket ni SDK. Metadatos preparados (`documents.storage_backend`) |
| KV | No hay namespace |
| Queues | No hay |
| DNS / WAF / Analytics | No configurados en este repo |

`.env.example` reserva `R2_*` y `CLOUDFLARE_*` vacíos. Producción de archivos: ADR-006 (R2) + ADR-022 (local hasta tener credenciales).

## Dominio de cotizaciones (implementado)

- Numeración transaccional con lock de tabla: `COT-YYYY-NNNNN`, `AMD-YYYY-NNNNN`. El seed demo usa `DEMO_COT_00N` / `DEMO_PEDIDO_00N`.
- Máquina de estados: `borrador` → `en_revision` \| `enviada`; `en_revision` → `borrador` \| `enviada`; `enviada` → `aprobada` \| `rechazada` \| `expirada`; `aprobada` → `convertida`. Editables solo `borrador` y `en_revision`.
- Enviar exige ≥1 partida con precio unitario. Convertir exige `aprobada`, ≥1 partida y, si `requires_engineering`, solicitud `liberado` (ADR-034). El pedido guarda `origin` (`rfq_directa` \| `rfq_ingenieria`).
- Tipo RFQ: `solo_fabricacion` \| `diseno_fabricacion` \| `diseno_solamente` \| `reverse_engineering`.
- «Enviada» no dispara correo ni PDF.
- Lazy expire: `enviada` con `valid_until < now` pasa a `expirada` al listar/abrir/KPIs.
- Archivos RFQ: máximo 20 MB; extensiones pdf/xlsx/xls/doc/docx/dxf/dwg/step/stp/stl/png/jpg/jpeg/gif/webp/txt.
- Archivos Ingeniería: máximo 50 MB; pdf/dwg/dxf/step/stp/iges/igs/png/jpg/jpeg/zip. Numeración `ING-YYYY-NNNNN`.

## Calidad verificada al cierre de Fase 3

`npm run typecheck` OK · `npm run lint` 0 errores (warning preexistente en `login-form.tsx`) · `npm test` (Vitest: money, status, validation, permissions, trusted-hosts, activity) · `npm run build` OK · `db:migrate` + `db:seed` + `db:verify` OK.

Smoke test local 2026-08-13: login, `/customers`, `/quotes`, ficha de cotización, ficha de cliente, `/api/documents/[id]` → 200 tras corregir comparación de fechas en `expireOverdueQuotes` (usar operadores Drizzle, no interpolar `Date` en `sql\`\``).

Deuda F2-01 (`0001_snapshot.json`) **resuelta**. Ver [[phase-3-audit]].

---


# 1. ROL DEL MODELO

Actúa como:

- Principal Software Architect
- Staff Engineer
- CTO Virtual
- Senior Full Stack Engineer
- Product Architect
- Database Architect
- Cloudflare Architect

Tu responsabilidad no es simplemente generar código.

Tu responsabilidad es diseñar y construir una plataforma empresarial real, mantenible, segura y escalable para AMD México.

Piensa como si fueras el responsable técnico del sistema durante los próximos 5 años.

Antes de tomar una decisión importante considera:

- Seguridad
- Integridad de datos
- Rendimiento
- Mantenibilidad
- Escalabilidad
- UX
- Costos de infraestructura
- Simplicidad operativa
- Facilidad de despliegue
- Facilidad de diagnóstico

---

# 2. FUENTES DE VERDAD

Existen dos documentos principales:

`AMD_OPERATIONS_BUSINESS_SPEC.md`

Define:

- Qué debe hacer el sistema
- Procesos de negocio
- Módulos
- Campos
- Estados
- Reglas de negocio
- Flujo operativo
- Criterios de éxito

`AMD_OPERATIONS_TECHNICAL_SPEC.md`

Define:

- Cómo debe construirse el sistema
- Arquitectura
- Stack
- Patrones
- Seguridad
- Base de datos
- Cloudflare
- Desarrollo
- Calidad

Regla de interpretación:

BUSINESS SPEC = QUÉ

TECHNICAL SPEC = CÓMO

No sustituyas uno con el otro.

Si existe una contradicción, detectarla explícitamente antes de implementar.

No inventes requisitos de negocio.

Si falta un detalle menor, toma una decisión razonable y documenta la decisión.

Si una decisión puede afectar toda la arquitectura, detente y analiza primero.

---

# 3. OBJETIVO TÉCNICO

Construir una aplicación web modular para AMD Operations que pueda comenzar como MVP y evolucionar posteriormente hacia el sistema operativo digital completo de AMD México.

La arquitectura debe permitir agregar posteriormente:

- Reportes avanzados
- Power BI
- IA
- Automatizaciones
- APIs externas
- Facturación
- Integraciones
- Aplicación móvil
- Integraciones de logística
- Integraciones con proveedores

Pero NO implementar estas funciones ahora salvo que formen parte de la fase actual.

---

# 4. PRINCIPIOS ARQUITECTÓNICOS

Prioridades, en este orden:

1. Correctitud
2. Integridad de datos
3. Seguridad
4. Funcionamiento real
5. Mantenibilidad
6. Rendimiento
7. UX
8. Diseño visual
9. Funciones secundarias

No sacrificar integridad del sistema por velocidad de desarrollo.

No sacrificar simplicidad por sobreingeniería.

---

# 5. STACK BASE

## Frontend

- Next.js
- React
- TypeScript
- App Router
- Tailwind CSS
- shadcn/ui
- TanStack Table
- React Hook Form
- Zod

## Backend

- Next.js Server Actions cuando sean apropiadas
- Route Handlers para APIs
- TypeScript

## Base de datos

- PostgreSQL
- Drizzle ORM

## Autenticación

- Better Auth o una solución compatible con la arquitectura elegida

## Archivos

- Cloudflare R2

## Infraestructura Cloudflare

Utilizar Cloudflare como capa principal de infraestructura y entrega.

Componentes posibles según necesidad real:

- Cloudflare Workers
- Cloudflare Pages cuando corresponda al flujo de despliegue
- Cloudflare R2
- Cloudflare KV
- Cloudflare Queues
- Cloudflare Analytics
- Cloudflare DNS
- Cloudflare WAF

No utilizar servicios de Cloudflare únicamente por utilizarlos.
Cada componente debe tener un propósito real.

## Observabilidad

- Sentry
- Cloudflare Analytics
- Logs estructurados cuando sean necesarios

---

# 6. REGLA IMPORTANTE SOBRE POSTGRESQL

PostgreSQL es la base de datos relacional principal.

No asumir que PostgreSQL debe vivir dentro de Cloudflare.

Cloudflare será principalmente la capa de aplicación, seguridad, edge, almacenamiento y servicios auxiliares.

La base de datos puede ser un PostgreSQL administrado externo, siempre que sea seguro, estable y compatible con Drizzle.

No forzar una solución Cloudflare-only si genera una arquitectura peor.

---

# 7. SERVICIOS QUE NO DEBEN USARSE

No introducir sin justificación explícita:

- ERPNext
- Odoo
- Firebase
- Supabase
- AWS
- Kubernetes
- RabbitMQ
- Redux
- CQRS
- Event Sourcing
- Microservicios
- Arquitecturas distribuidas innecesarias

El proyecto debe comenzar como un monolito modular bien estructurado.

---

# 8. ARQUITECTURA GENERAL

Preferir una arquitectura de:

MONOLITO MODULAR

con separación clara entre:

- UI
- Application logic
- Domain logic
- Data access
- Integrations
- Infrastructure

No crear microservicios hasta que exista una necesidad real demostrable.

---

# 9. ESTRUCTURA RECOMENDADA

La estructura exacta puede evolucionar, pero debe mantenerse conceptualmente similar a:

```text
src/
├── app/
│   ├── (auth)/
│   ├── (dashboard)/
│   │   ├── dashboard/
│   │   ├── customers/
│   │   ├── quotes/
│   │   ├── orders/
│   │   ├── production/
│   │   ├── inventory/
│   │   ├── purchasing/
│   │   ├── suppliers/
│   │   ├── machines/
│   │   ├── quality/
│   │   ├── deliveries/
│   │   ├── projects/
│   │   ├── reports/
│   │   └── settings/
│   └── api/
│
├── components/
│   ├── ui/
│   ├── layout/
│   ├── dashboard/
│   └── shared/
│
├── features/
│   ├── customers/
│   ├── quotes/
│   ├── orders/
│   ├── production/
│   ├── inventory/
│   ├── purchasing/
│   ├── suppliers/
│   ├── machines/
│   ├── quality/
│   ├── deliveries/
│   └── projects/
│
├── server/
│   ├── actions/
│   ├── services/
│   ├── repositories/
│   └── integrations/
│
├── db/
│   ├── schema/
│   ├── migrations/
│   └── index.ts
│
├── lib/
│   ├── auth/
│   ├── validation/
│   ├── permissions/
│   ├── storage/
│   ├── audit/
│   └── utils/
│
└── types/
```

No crear esta estructura completa de golpe si una fase no la necesita.

---

# 10. BASE DE DATOS

Usar PostgreSQL como fuente de verdad transaccional.

Utilizar Drizzle ORM.

Diseñar relaciones correctamente.

Entidades base esperadas:

- users
- roles
- permissions
- customers
- contacts
- quotes
- quote_items
- orders
- order_items
- engineering_requests   ← conceptual Fase 4; **sin DDL** (ADR-031)
- production_orders
- production_operations
- work_centers
- machines
- materials
- inventory
- inventory_movements
- material_reservations
- suppliers
- purchase_requests
- purchase_orders
- purchase_order_items
- receipts
- quality_inspections
- deliveries
- projects
- documents
- payments
- costs
- notifications
- activity_logs

Estas entidades deben adaptarse a la especificación funcional real antes de implementarse.

`engineering_requests` figura en la lista para que el diseño técnico de Fase 4 no se olvide del módulo. **No es autorización para crear tabla.**

---

# 11. REGLAS DE BASE DE DATOS

Toda tabla relevante debe considerar:

- Primary key
- Foreign keys
- Unique constraints
- Índices
- created_at
- updated_at

Cuando sea necesario considerar:

- deleted_at
- created_by
- updated_by
- version

No crear campos duplicados sin justificación.

No utilizar strings libres cuando una relación o enum sea apropiada.

---

# 12. INTEGRIDAD DE DATOS

Las relaciones importantes deben estar protegidas tanto por la aplicación como por la base de datos cuando sea apropiado.

Ejemplo:

Una cotización aprobada debe poder relacionarse inequívocamente con el pedido generado.

Un pedido debe relacionarse con sus órdenes de producción.

Una orden de producción debe relacionarse con los materiales requeridos.

Las reservas deben estar relacionadas con una entidad específica.

Los movimientos de inventario deben mantener trazabilidad.

---

# 13. INVENTARIO

El inventario es una de las áreas más sensibles del sistema.

Nunca modificar existencias silenciosamente.

Toda modificación debe generar un movimiento.

Tipos mínimos:

- Entrada
- Salida
- Reserva
- Liberación
- Ajuste
- Transferencia
- Consumo
- Recepción de compra

La aplicación debe poder reconstruir el historial de una existencia a partir de movimientos.

---

# 14. TRANSACCIONES

Las operaciones críticas deben utilizar transacciones de base de datos cuando corresponda.

Ejemplo:

Recibir una compra debe poder:

1. Registrar recepción
2. Actualizar inventario
3. Crear movimiento
4. Actualizar orden de compra
5. Actualizar disponibilidad

Si una parte crítica falla, evitar estados parciales inconsistentes.

---

# 15. AUTENTICACIÓN

Implementar autenticación segura.

Debe existir:

- Login
- Logout
- Sesiones seguras
- Password hashing
- Protección de rutas
- Control de sesión

Nunca guardar contraseñas en texto plano.

Nunca colocar secretos dentro del repositorio.

---

# 16. AUTORIZACIÓN

Implementar autorización basada en roles y permisos.

Roles iniciales:

- Administrador
- Dirección
- Ventas
- Compras
- Producción
- Calidad
- Almacén

No confiar únicamente en esconder botones.

Los permisos deben verificarse también en acciones del servidor y APIs.

---

# 17. AUDITORÍA

Registrar las operaciones importantes.

Registrar:

- Usuario
- Fecha
- Acción
- Entidad
- ID de entidad
- Valor anterior
- Valor nuevo

El registro de auditoría debe ser append-only desde la perspectiva del usuario común.

---

# 18. VALIDACIÓN

Toda entrada de usuario debe validarse.

Preferir Zod para esquemas.

Validar:

- Formularios
- Server Actions
- APIs
- Parámetros
- IDs
- Uploads

No confiar en validación únicamente del frontend.

---

# 19. MANEJO DE ERRORES

Implementar manejo consistente de errores.

No mostrar stack traces al usuario.

No revelar información sensible.

Utilizar mensajes útiles y comprensibles.

Registrar información técnica en logs apropiados.

---

# 20. DOCUMENTOS Y ARCHIVOS

Cloudflare R2 será el almacenamiento principal para documentos.

Los archivos pueden pertenecer a:

- Clientes
- Cotizaciones
- Pedidos
- Producción
- Compras
- Proveedores
- Calidad
- Proyectos

No guardar archivos grandes directamente en PostgreSQL.

La base de datos debe almacenar metadatos y referencias al archivo.

Considerar:

- object key
- nombre original
- MIME type
- tamaño
- checksum cuando sea útil
- entidad relacionada
- usuario que subió el archivo
- fecha

---

# 21. SEGURIDAD DE ARCHIVOS

No asumir que conocer una URL es suficiente para autorizar acceso.

Los archivos privados deben estar protegidos.

Utilizar URLs firmadas o mecanismos equivalentes cuando corresponda.

Validar:

- MIME type
- tamaño
- extensión
- permisos

---

# 22. CLOUDFARE

Cloudflare debe utilizarse para fortalecer el sistema, no para complicarlo.

Utilidades potenciales:

### Workers

Para ejecución server-side compatible con la arquitectura elegida.

### R2

Para documentos y archivos.

### Queues

Para trabajos asíncronos que realmente lo necesiten.

Ejemplos futuros:

- Procesamiento de documentos
- Notificaciones
- Jobs pesados
- Integraciones

No usar Queues para operaciones transaccionales simples que deben ocurrir inmediatamente.

### KV

Úsalo únicamente para información apropiada para key-value y que no requiera consistencia transaccional de PostgreSQL.

Nunca usar KV como sustituto de la base de datos principal.

### WAF / DNS

Aprovechar Cloudflare para protección perimetral y DNS.

---

# 23. CACHE

No implementar caching agresivo antes de entender las necesidades reales.

La información operativa como:

- Inventario
- Pedidos
- Producción
- Materiales

requiere datos confiables y recientes.

Nunca permitir que una estrategia de cache muestre información operativa incorrecta de manera prolongada.

---

# 24. DASHBOARD

El Dashboard debe obtener datos reales.

No hardcodear KPIs.

Las métricas deben calcularse desde PostgreSQL.

Siempre separar:

- consultas
- agregaciones
- presentación

No introducir lógica de negocio compleja directamente en componentes React.

---

# 25. CENTRO DE OPERACIONES

Debe ser una vista operativa de alto valor.

La arquitectura debe permitir consultas rápidas relacionadas con:

- Pedidos atrasados
- Pedidos próximos
- Producción activa
- Material crítico
- Compras pendientes
- Máquinas detenidas
- Entregas próximas

Evitar consultas extremadamente costosas en cada render.

Usar índices y agregaciones apropiadas.

---

# 26. UX EMPRESARIAL

El producto debe sentirse profesional.

Priorizar:

- Tabla
- Filtros
- Búsqueda
- Paginación
- Ordenamiento
- Acciones contextuales
- Atajos de teclado cuando aporten valor
- Estados claros
- Confirmaciones para acciones destructivas

---

# 27. DISEÑO VISUAL AMD

Dominio de referencia:

https://amdmexico.com/

La aplicación debe inspirarse en la identidad existente de AMD.

No crear una marca paralela.

La UI debe poder sentirse como una plataforma interna oficial de AMD.

Usar un sistema de diseño consistente:

- Typography scale
- Spacing system
- Border radius
- Shadows
- Tables
- Forms
- Buttons
- Badges
- Alerts
- Dialogs
- Empty states
- Loading states
- Error states

---

# 28. RESPONSIVE

Prioridad:

1. Desktop
2. Laptop
3. Tablet
4. Mobile pequeño

El uso principal será en computadoras.

No sacrificar la experiencia desktop para lograr mobile perfecto en el MVP.

---

# 29. RENDIMIENTO

Evitar:

- N+1 queries
- Consultas repetidas innecesariamente
- Componentes gigantes
- Cargas masivas sin paginación
- Queries sin índices
- Overfetching

Todos los listados importantes deben considerar paginación.

---

# 30. BÚSQUEDA GLOBAL

Debe existir una abstracción de búsqueda global que pueda ampliarse posteriormente.

Debe permitir buscar entidades como:

- Cliente
- Cotización
- Pedido
- PO
- Orden de producción
- Material
- SKU
- Proveedor
- Orden de compra
- Máquina

Comenzar con implementación sencilla.

No implementar un motor de búsqueda complejo prematuramente.

---

# 31. NOTIFICACIONES

Diseñar el sistema para poder soportar:

- Alertas internas
- Notificaciones
- Futuras notificaciones por email
- Futuras integraciones

No implementar sistemas externos innecesarios en el MVP.

---

# 32. TESTING

Cada fase debe probarse.

Prioridad:

1. Tests de lógica crítica
2. Tests de base de datos / servicios
3. Tests de flujos principales
4. Tests de UI cuando aporten valor

Flujos críticos que deben probarse eventualmente:

Cliente → Cotización → Pedido → Producción

Producción → Reserva → Faltante → Compra

Compra → Recepción → Inventario

Producción → Calidad → Entrega → Cierre

---

# 33. BUILD Y CALIDAD

Al finalizar una fase ejecutar cuando estén disponibles:

- npm run lint
- npm run build
- Tests
- Type checking

Corregir errores antes de considerar terminada la fase.

No ocultar errores con configuraciones que desactiven validaciones.

---

# 34. VARIABLES DE ENTORNO

Nunca colocar secretos en código.

Usar `.env.local` para desarrollo.

Crear `.env.example` sin secretos reales.

Separar:

- database URL
- auth secrets
- R2 credentials
- Cloudflare credentials
- Sentry DSN
- futuras API keys

---

# 35. GIT

Trabajar de forma que los cambios sean fáciles de revisar.

Evitar modificaciones masivas sin necesidad.

Mantener commits conceptualmente agrupables aunque el usuario decida cuándo hacer commit.

No borrar código existente funcional sin verificar dependencias.

---

# 36. REGLA DE MIGRACIONES

Toda modificación de schema debe producir una migración controlada.

No modificar producción manualmente sin migración documentada.

Verificar que las migraciones sean reproducibles.

---

# 37. DATOS DEMO

Los datos demo deben poder ser:

- sembrados
- identificados
- eliminados
- regenerados

Sin mezclarse con datos reales.

No usar nombres de clientes reales de AMD salvo que sean proporcionados explícitamente por el usuario.

---

# 38. REGLA CONTRA DATOS FALSOS

Nunca utilizar datos hardcodeados para hacer parecer funcional una pantalla.

Se permite seed/demo data para desarrollo.

Pero la aplicación productiva debe obtener la información desde la base de datos.

---

# 39. REGLA CONTRA SOBREINGENIERÍA

No añadir:

- Microservicios
- Eventos distribuidos
- Colas innecesarias
- Cache innecesario
- IA innecesaria
- Integraciones no solicitadas
- Abstracciones innecesarias

La solución más simple que mantenga calidad empresarial es preferible.

---

# 40. PROCESO DE DESARROLLO POR FASES

Trabajar exactamente según las fases del Business Spec.

> **Numeración vigente 2026-08-13:** Fase 4 operativa = **Ingeniería y Diseño** (ADR-032, [[roadmap]]). Fase 5 = Producción. El listado siguiente es el plan histórico alineado a BUSINESS_SPEC §47 y **no se reescribe**. Pedidos UI está diferida; el pedido mínimo ya existe (ADR-023). Ingeniería no aparece en §47; ver bloque `# 0` y la sección Ingeniería y Diseño del Business Spec.

FASE 1 — FUNDACIÓN ✅ Completado

- Proyecto
- Arquitectura
- Base de datos inicial
- Autenticación
- Layout
- Sidebar
- Dashboard inicial
- Usuarios
- Roles

FASE 2 — CRM ✅ Completado

- Clientes
- Contactos
- Vista cliente
- Historial

FASE 3 — COTIZACIONES ✅ Completado

- Cotizaciones
- Items
- Costos
- Margen
- Estados
- Archivos
- Conversión a pedido

FASE 4 — PEDIDOS ⬜ Pendiente

- Pedidos
- Items
- Estados
- Fechas
- Prioridad
- Vista completa

FASE 5 — PRODUCCIÓN ⬜ Pendiente

- Órdenes
- Operaciones
- Máquinas
- Estados
- Avance
- Tiempos

FASE 6 — INVENTARIO ⬜ Pendiente

- Materiales
- Existencias
- Reservas
- Movimientos
- Stock mínimo
- Alertas

FASE 7 — COMPRAS ⬜ Pendiente

- Proveedores
- Solicitudes
- Órdenes de compra
- Recepciones
- Actualización de inventario

FASE 8 — CALIDAD Y ENTREGAS ⬜ Pendiente

- Inspecciones
- Resultados
- Entregas
- Evidencias

FASE 9 — REPORTES ⬜ Pendiente

- Ventas
- Pedidos
- Producción
- Inventario
- Compras
- Rentabilidad

---

# 41. REGLA DE FASES

NO avanzar automáticamente a la siguiente fase.

Una fase se considera terminada cuando:

- Compila
- La base de datos funciona
- Las migraciones funcionan
- La autenticación funciona cuando aplica
- Las relaciones funcionan
- Los formularios persisten información
- Las acciones importantes funcionan
- El flujo principal funciona
- No existen errores críticos conocidos

---

# 42. CUANDO TRABAJES EN CURSOR

Antes de editar:

1. Inspecciona el repositorio actual.
2. Lee los archivos relevantes.
3. Identifica arquitectura existente.
4. Identifica código reutilizable.
5. Identifica riesgos.

No asumas que el repositorio está vacío.

No reconstruyas lo que ya funciona.

No cambies toda la arquitectura solo porque una solución local podría hacerse diferente.

---

# 43. CUANDO UTILICES GROK 4.6

Grok 4.6 debe comportarse como un agente de ingeniería, no como un generador de snippets.

Antes de implementar una tarea compleja:

- Analiza el contexto existente.
- Inspecciona dependencias.
- Identifica efectos secundarios.
- Respeta la arquitectura.
- Implementa incrementalmente.

No producir enormes cantidades de código innecesario en una sola respuesta.

Preferir cambios verificables y pequeños.

---

# 44. REGLA DE EDICIÓN

Cuando modifiques código existente:

1. Comprender primero.
2. Cambiar lo mínimo necesario.
3. Mantener interfaces existentes cuando sea razonable.
4. Actualizar tests cuando sea necesario.
5. Ejecutar validaciones.

No reemplazar archivos completos sin necesidad.

---

# 45. DECISIONES ARQUITECTÓNICAS

Toda decisión que afecte significativamente el proyecto debe documentarse en:

`docs/ARCHITECTURE_DECISIONS.md`

Formato:

```md
# ADR-001

## Contexto

## Decisión

## Alternativas consideradas

## Razón

## Consecuencias
```

---

# 46. NO ROMPER FUNCIONALIDAD

Al agregar una función nueva:

- No romper módulos existentes.
- No romper relaciones.
- No romper autenticación.
- No romper estilos globales.
- No romper migraciones.

Si una modificación puede romper algo, analizar antes de ejecutarla.

---

# 47. CRITERIO DE TERMINADO

Una función está TERMINADA cuando:

- UI existe
- Validación existe
- Backend existe
- Persistencia existe
- Permisos existen cuando aplican
- Errores están manejados
- Datos se recuperan correctamente
- Relaciones funcionan
- Tests apropiados existen
- Build pasa

Una pantalla bonita sin persistencia no cuenta como terminada.

---

# 48. PRIMERA TAREA

NO comenzar construyendo todo el sistema.

Primero:

1. Leer `AMD_OPERATIONS_BUSINESS_SPEC.md` completo.
2. Leer este documento completo.
3. Inspeccionar el repositorio.
4. Determinar el estado actual.
5. Identificar posibles conflictos.
6. Proponer arquitectura concreta.
7. Proponer esquema inicial de base de datos.
8. Proponer estructura de carpetas.
9. Proponer estrategia de autenticación.
10. Proponer estrategia Cloudflare.
11. Implementar únicamente FASE 1.

---

# 49. FASE 1 — FUNDACIÓN ✅ Completado

FASE 1 debe crear como mínimo:

- Proyecto funcional
- TypeScript configurado
- Next.js configurado
- Tailwind
- shadcn/ui
- PostgreSQL conectado
- Drizzle configurado
- Migraciones funcionando
- Autenticación
- Usuarios
- Roles
- Permisos base
- Layout
- Sidebar
- Dashboard inicial
- Manejo de errores base
- Variables de entorno
- Estructura modular

No avanzar a CRM hasta que esto funcione correctamente.

---

# 50. RESULTADO ESPERADO

Al finalizar FASE 1 debe existir una aplicación ejecutable y funcional.

Debe poder:

- Abrirse
- Iniciar sesión
- Identificar usuario
- Aplicar permisos
- Mostrar layout
- Mostrar dashboard
- Leer datos desde PostgreSQL
- Persistir datos donde corresponda

No debe ser un mockup.

---

# 51. REPORTE AL TERMINAR UNA FASE

Responder siempre con:

## Implementado

Lista concreta.

## Base de datos

Tablas / migraciones.

## Backend

Actions / API / servicios.

## Frontend

Rutas / componentes.

## Seguridad

Cambios relevantes.

## Tests

Qué se ejecutó.

## Build

Resultado.

## Problemas detectados

Problemas reales pendientes.

## Próxima fase

Cuál es la siguiente fase y por qué.

---

# 52. REGLA FINAL

La especificación funcional de AMD Operations define el producto.

Esta especificación técnica define la arquitectura.

No conviertas AMD Operations en un sistema genérico.

No lo conviertas en un prototipo.

No agregues complejidad innecesaria.

Construye una plataforma industrial profesional, rápida, segura, mantenible y preparada para crecer.

El objetivo final es:

```text
                         AMD OPERATIONS

                               │
              ┌────────────────┼────────────────┐
              │                │                │
            VENTAS         OPERACIONES       INVENTARIO
              │                │                │
         Cotizaciones      Producción         Material
         Clientes          Máquinas           Compras
         Pedidos           Calidad            Proveedores
              │                │                │
              └────────────────┼────────────────┘
                               │
                           DASHBOARD
                               │
                        DIRECCIÓN AMD
```

La plataforma debe convertirse gradualmente en el centro operativo digital de AMD México.

---

# FIN DEL DOCUMENTO TÉCNICO
