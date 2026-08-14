# Dashboard

# Objetivo

Pantalla de entrada autenticada. Mostrar identidad del usuario y métricas que ya existen en PostgreSQL, sin inventar KPIs operativos.

# Alcance

**Implementado:**

- Saludo e identidad (correo, roles, permisos).
- KPIs: usuarios, roles, sesiones activas.
- KPI clientes activos (si `customers:read`).
- KPIs de cotizaciones (si `quotes:read`): abiertas; por vencer (7 días, `enviada`); convertidas del mes.
- KPIs de ingeniería (si `engineering:read`): abiertas, vencidas, diseños liberados.
- Placeholders sin cifra: ventas hoy, pedidos activos, producción, material, máquinas, entregas.

**No implementado:**

- Centro de Operaciones (Business Spec §51) / dashboard ejecutivo.
- Ventas del día/mes, pedidos atrasados, máquinas ocupadas, etc.

# Flujo de negocio

El usuario inicia sesión → `/` redirige a `/dashboard` → snapshot desde Postgres (`getDashboardSnapshot` + `getQuoteDashboardStats` + `getEngineeringDashboardStats`).

# Entidades

No tiene tabla propia. Lee `users`, `roles`, `sessions`, `customers`, `quotes`, `engineering_requests`.

# Permisos

Cualquier rol sembrado tiene `dashboard:read`. El layout exige sesión. El KPI de clientes se oculta sin `customers:read`. Los KPIs de cotizaciones se ocultan sin `quotes:read`. Los de ingeniería, sin `engineering:read`.

# APIs

`getDashboardSnapshot` en `src/server/services/dashboard.ts`. Totales de quotes en `getQuoteDashboardStats`. No hay route handler.

# Pantallas

`/dashboard` — `src/app/(dashboard)/dashboard/page.tsx`  
Componente `KpiCard`.

# Estados

No aplica.

# Relaciones

Depende de Fase 1–4. KPIs de ingeniería si `engineering:read`. Placeholders de piso: Fases 5–11. ADR-042, ADR-043.

# Riesgos

Un lector puede interpretar los placeholders como “el sistema aún no opera”. Es intencional: no se muestran cifras falsas.

# Dependencias

Fase 1 obligatoria. Fase 2 opcional para clientes. Fase 3 opcional para KPIs de cotizaciones.
