# Dashboard

# Objetivo

Pantalla de entrada autenticada. Mostrar identidad del usuario y métricas que ya existen en PostgreSQL, sin inventar KPIs operativos.

# Alcance

**Implementado:**

- Saludo e identidad (correo, roles, permisos).
- KPIs: usuarios, roles, sesiones activas.
- KPI clientes activos (si `customers:read`).
- KPIs de cotizaciones (si `quotes:read`): abiertas; por vencer (7 días, `enviada`); convertidas del mes.
- KPIs de ingeniería (si `engineering:read`): abiertas, vencidas, diseños liberados. Detalle oficial en `/engineering` ([[KPI Ingenieria]], ADR-042).
- Placeholders sin cifra: ventas hoy, pedidos activos, producción, material, máquinas, entregas.

**No implementado:**

- Centro de Operaciones (Business Spec §51) / dashboard ejecutivo (ADR-043).
- KPI Dirección faltantes: ventas del día, cotizaciones ganadas (nombre oficial), órdenes activas/retrasadas, entregas del día, material crítico, compras pendientes.
- Cumplimiento liberación, horas estimadas vs reales, errores y retrabajos de ingeniería.

# Flujo de negocio

El usuario inicia sesión → `/` redirige a `/dashboard` → snapshot desde Postgres (`getDashboardSnapshot` + `getQuoteDashboardStats` + `getEngineeringDashboardStats`).

# Entidades

No tiene tabla propia. Lee `users`, `roles`, `sessions`, `customers`, `quotes`, `engineering_requests`.

# Permisos

Cualquier rol sembrado tiene `dashboard:read`. El KPI de clientes se oculta sin `customers:read`. Los de cotizaciones, sin `quotes:read`. Los de ingeniería, sin `engineering:read`.

# Pantallas

`/dashboard` — `src/app/(dashboard)/dashboard/page.tsx`  
`/engineering` — tablero de módulo con más KPI de diseño.

# Riesgos

Un lector puede interpretar los placeholders como “el sistema aún no opera”. Es intencional: no se muestran cifras falsas.

En agosto 2026 un `Date` interpolado en SQL tumbó `/dashboard` (digest `3831674674`). Corregido con `gte()` en `getEngineeringDashboardStats`.

# Dependencias

Fases 1–4. KPI de piso/compras/entregas: Fases 5–11. ADR-042, ADR-043.
