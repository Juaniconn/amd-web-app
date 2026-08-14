# Roadmap — AMD Operations

Última actualización: 2026-08-13  
Fuente: código en `src/`, migraciones Drizzle y specs en `/docs`.

Leyenda: ✅ Completado · 🔄 En progreso · ⬜ Pendiente

---

## Estado actual

**Fase 2 — CRM está completada.**  
No hay una fase en implementación activa. La siguiente fase autorizada es **Fase 3 — Cotizaciones**.

---

## Fases

| Fase | Nombre | Estado | Entregable real |
|---|---|---|---|
| 1 | Fundación | ✅ Completado | App Next.js, PostgreSQL, Better Auth, RBAC, layout, dashboard inicial, usuarios y roles |
| 2 | CRM | ✅ Completado | Clientes, contactos, ficha, historial, seed demo |
| 3 | Cotizaciones | ⬜ Pendiente | No existe código de quotes |
| 4 | Pedidos | ⬜ Pendiente | Sidebar deshabilitado |
| 5 | Producción | ⬜ Pendiente | Incluye máquinas |
| 6 | Inventario | ⬜ Pendiente | — |
| 7 | Compras | ⬜ Pendiente | Incluye proveedores |
| 8 | Calidad y entregas | ⬜ Pendiente | — |
| 9 | Reportes | ⬜ Pendiente | — |

---

## Dependencias

```
Fase 1 Fundación
    └── Fase 2 CRM (clientes + contactos + historial)
            └── Fase 3 Cotizaciones (requiere cliente)
                    └── Fase 4 Pedidos
                            ├── Fase 5 Producción
                            ├── Fase 6 Inventario
                            └── Fase 7 Compras
                                    └── Fase 8 Calidad y entregas
                                            └── Fase 9 Reportes
```

El Centro de Operaciones (Business Spec §51) no está implementado. El dashboard actual solo muestra KPIs de fundación y el conteo de clientes activos.

---

## Fuera de las fases (diseñado, no construido)

- Búsqueda global
- Notificaciones
- Documentos / Cloudflare R2
- Sentry
- Deploy Cloudflare (Workers, Pages, D1, KV, Queues)
- Facturación fiscal
- Integraciones ERP

Ver [[AMD_OPERATIONS_BUSINESS_SPEC]] y [[AMD_OPERATIONS_TECHNICAL_SPEC]].
