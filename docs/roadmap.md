# Roadmap — AMD Operations

Última actualización: 2026-08-13  
Fuente: código en `src/`, migraciones Drizzle y specs en `/docs`.

Leyenda: ✅ Completado · 🔄 En progreso · ⬜ Pendiente

---

## Estado actual

**Fase 3 — Cotizaciones / RFQ está completada.**  
No hay una fase 🔄 en implementación activa. La siguiente fase autorizada es **Fase 4 — Pedidos**.

---

## Fases (plan Business Spec §47)

| Fase | Nombre | Estado | Entregable real |
|---|---|---|---|
| 1 | Fundación | ✅ Completado | App Next.js, PostgreSQL, Better Auth, RBAC, layout, dashboard inicial, usuarios y roles |
| 2 | CRM | ✅ Completado | Clientes, contactos, ficha, historial, seed demo |
| 3 | Cotizaciones | ✅ Completado | `quotes` / RFQ, partidas, archivos locales, máquina de estados, conversión a pedido mínimo |
| 4 | Pedidos | ⬜ Pendiente | Sidebar `/orders` deshabilitado. Tablas mínimas `orders` / `order_items` ya existen (ADR-023) |
| 5 | Producción | ⬜ Pendiente | Incluye máquinas. No hay OP al convertir una cotización |
| 6 | Inventario | ⬜ Pendiente | — |
| 7 | Compras | ⬜ Pendiente | Incluye proveedores |
| 8 | Calidad y entregas | ⬜ Pendiente | — |
| 9 | Reportes | ⬜ Pendiente | — |

Ninguna fase está 🔄 En progreso.

---

## Dependencias

```
Fase 1 Fundación ✅
    └── Fase 2 CRM ✅
            └── Fase 3 Cotizaciones ✅
                    └── Fase 4 Pedidos ⬜
                            ├── Fase 5 Producción ⬜
                            ├── Fase 6 Inventario ⬜
                            └── Fase 7 Compras ⬜
                                    └── Fase 8 Calidad y entregas ⬜
                                            └── Fase 9 Reportes ⬜
```

---

## Fuera del plan numerado §47

Estos ítems aparecen en la visión o en el Technical Spec; **no** están numerados como Fase 10–12 en BUSINESS_SPEC. Estado real:

| Ítem | Estado |
|---|---|
| Dashboard ejecutivo / Centro de Operaciones (§51) | ⬜ Pendiente |
| Beta interna | ⬜ Pendiente (no hay checklist de beta en el repo) |
| Deploy Cloudflare (Workers, Pages, D1, KV, Queues, R2 runtime) | ⬜ Pendiente |
| Búsqueda global | ⬜ Pendiente |
| Notificaciones | ⬜ Pendiente |
| Sentry | ⬜ Pendiente |
| Facturación fiscal | ⬜ Pendiente |
| Integraciones ERP | ⬜ Pendiente (ADR-013: no ERPNext) |

El dashboard actual muestra KPIs de fundación, clientes activos y, con `quotes:read`, cotizaciones abiertas / por vencer / convertidas del mes. El resto son placeholders.

---

Ver [[AMD_OPERATIONS_BUSINESS_SPEC]], [[AMD_OPERATIONS_TECHNICAL_SPEC]], [[Proceso RFQ]].
