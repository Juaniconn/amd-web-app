# Changelog — Fase 1 Fundación

Fecha: 2026-08-13  
Alcance: proyecto, autenticación, RBAC, layout, dashboard inicial, usuarios y roles.

---

## Funcionalidades agregadas

- Aplicación Next.js 16 (App Router) + React 19 + TypeScript.
- PostgreSQL + Drizzle. Migración `0000_faithful_mattie_franklin`.
- Better Auth (email/password, signup cerrado).
- Roles y permisos de negocio.
- Layout con sidebar AMD Operations.
- Dashboard con KPIs reales de fundación (usuarios, roles, sesiones).
- CRUD de usuarios (crear, editar, archivar/eliminar con protecciones).
- Consulta de matriz de roles (sin editor de permisos en UI).
- Acceso LAN (ADR-019): el servidor escucha en `0.0.0.0`.

---

## Entidades

`users`, `sessions`, `accounts`, `verifications`, `roles`, `permissions`, `user_roles`, `role_permissions`.

---

## Permisos iniciales

`dashboard:read`, `settings:read`, `users:read`, `users:write`, `roles:read`, `roles:write`.

---

## Tests

Validación de login/usuarios, catálogo RBAC, orígenes LAN de confianza.
