# Auditoría técnica — Fase 2 CRM

Fecha: 2026-08-13  
Tipo: revisión de solo lectura posterior a la implementación.  
No se modificó código en esta auditoría.

---

## Estado del build

`npm run build` — **OK** (Next.js 16.3.0).  
Rutas CRM generadas: `/customers`, `/customers/new`, `/customers/[id]`, `/customers/[id]/edit`.

`npm run typecheck` — **OK**.

---

## Estado de tests

`npm test` — **23/23** en 5 archivos:

- `catalog.test.ts` — RBAC incluyendo `customers:*`
- `customers.test.ts` — Zod de cliente/contacto
- `activity.test.ts` — textos de historial
- `auth.test.ts` — validación de usuarios (Fase 1)
- `trusted-hosts.test.ts` — orígenes LAN (Fase 1)

No hay tests de servicios, base de datos ni UI.

---

## Estado de lint

`npm run lint` — **0 errores**.  
Warning preexistente de Fase 1: `login-form.tsx` usa `window.location.assign`.

---

## Base de datos (verificado)

- Migraciones: 2 filas en `drizzle.__drizzle_migrations`.
- 10 clientes demo (8 activos, 2 inactivos, 0 archivados).
- 13 contactos; exactamente un principal no borrado por cliente.
- 0 RFC duplicados entre no archivados.
- FKs e índices únicos parciales presentes.

---

## Deuda técnica

| ID | Severidad | Tema |
|---|---|---|
| F2-01 | Media | Falta `0001_snapshot.json` |
| F2-02 | Media | Sin tests de persistencia |
| F2-03 | Media | Código/RFC fuera de la transacción de insert |
| F2-04 | Media | Seed hace DELETE físico de contactos demo |
| F2-05 | Media | Botón Principal ignora error de la action |
| F2-06 | Baja | ILIKE no escapa `%` / `_` |
| F2-07 | Baja | Redirect silencioso sin permiso |
| F2-08 | Baja | Paginación fuera de rango; IDs HTML duplicados en diálogos |
| F2-09 | Baja | RFC sin checksum; teléfono libre; sin restore |

---

## Riesgos

- Un `db:generate` futuro puede duplicar la migración CRM.
- Re-seed sobre clientes DEMO destruye contactos añadidos a mano.
- Carrera teórica al crear dos clientes al mismo tiempo (índice único la detiene; el mensaje al usuario puede ser genérico).

---

## Módulos incompletos (fuera de Fase 2, no son defectos)

Cotizaciones, pedidos, producción, inventario, compras, calidad, entregas, reportes, documentos, Centro de Operaciones, búsqueda global, notificaciones.

En la ficha de cliente esas secciones se muestran como «Pendiente · Fase N» **sin cifras inventadas**.

---

## Consola y red (observado)

Sesión Administrador en `/customers` y `/customers/demo-customer-001`: HTTP 200, sin overlay de error de aplicación, sin recursos fallidos. El log de `next dev` no registró 4xx/5xx en esas rutas.

No se ejecutaron mutaciones POST en la auditoría para no alterar datos.

---

## Mejoras futuras (no bloquean el uso)

1. Generar snapshot Drizzle 0001.
2. Tests de servicio: RFC único, un principal, archivo en cascada.
3. Meter generación de código y RFC dentro de la transacción.
4. Seed idempotente sin DELETE físico.
5. Mostrar error al marcar principal.
6. Instalar TanStack Table cuando el listado lo necesite (ADR-020).

---

## Veredicto

**Aprobada con observaciones.** Lista para uso operativo del CRM. Corregir deuda media antes de Fase 3 es recomendable, no obligatorio para un solo operador.
