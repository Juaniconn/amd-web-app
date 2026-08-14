# Dashboard

# Objetivo

Pantalla de entrada autenticada. Mostrar identidad del usuario y métricas que ya existen en PostgreSQL, sin inventar KPIs operativos.

# Alcance

**Implementado:**

- Saludo e identidad (correo, roles, permisos).
- KPIs: usuarios, roles, sesiones activas.
- KPI clientes activos (si `customers:read`).
- Placeholders de ventas, pedidos, producción, material, máquinas, entregas.

**No implementado:**

- Centro de Operaciones (Business Spec §51).
- Ventas del día/mes, pedidos atrasados, máquinas ocupadas, etc.

# Flujo de negocio

El usuario inicia sesión → `/` redirige a `/dashboard` → se lee un snapshot desde Postgres.

# Entidades

No tiene tabla propia. Lee `users`, `roles`, `sessions`, `customers`.

# Permisos

Cualquier rol sembrado tiene `dashboard:read`. El layout exige sesión. El KPI de clientes se oculta sin `customers:read`.

# APIs

`getDashboardSnapshot` en `src/server/services/dashboard.ts`. No hay route handler.

# Pantallas

`/dashboard` — `src/app/(dashboard)/dashboard/page.tsx`  
Componente `KpiCard`.

# Estados

No aplica.

# Relaciones

Depende de Fase 1 (auth) y Fase 2 (conteo de clientes). El resto de KPIs depende de fases futuras.

# Riesgos

Un lector puede interpretar los placeholders como “el sistema aún no opera”. Es intencional: no se muestran cifras falsas.

# Dependencias

Fase 1 obligatoria. Fase 2 opcional para el KPI de clientes.
