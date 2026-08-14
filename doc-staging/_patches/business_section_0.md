# 0. ESTADO DE IMPLEMENTACIÓN

**Fecha de este estado:** 2026-08-13  
**Fase actual:** ninguna en desarrollo. Fase 2 CRM está **✅ Completada**. Siguiente fase autorizada: **Fase 3 — Cotizaciones**.

Este bloque describe lo que **existe en el código**. El resto del documento (el prompt maestro) sigue siendo la visión del producto; no se reescribe.

Leyenda: ✅ Completado · 🔄 En progreso · ⬜ Pendiente

## Alcance real hoy

| Área | Estado | Evidencia en código |
|---|---|---|
| Fundación (app, auth, RBAC, layout, usuarios, roles, dashboard inicial) | ✅ Completado | Fase 1, commit `33187cb` |
| CRM: clientes, contactos, ficha, historial | ✅ Completado | `src/features/customers`, `src/db/schema/crm.ts`, `activity.ts` |
| Cotizaciones / RFQ | ⬜ Pendiente | Sin tablas, rutas ni acciones |
| Pedidos | ⬜ Pendiente | Sidebar deshabilitado |
| Producción y máquinas | ⬜ Pendiente | — |
| Inventario | ⬜ Pendiente | — |
| Compras y proveedores | ⬜ Pendiente | — |
| Calidad y entregas | ⬜ Pendiente | — |
| Reportes / Centro de Operaciones | ⬜ Pendiente | Dashboard solo KPIs de fundación + clientes activos |
| Documentos / R2 / Workers / D1 / KV | ⬜ Pendiente | No hay `wrangler`, ni credenciales R2 en código |

## Módulos de negocio

| Módulo | Spec | Estado |
|---|---|---|
| §7 Clientes | Este documento | ✅ Completado (Fase 2) |
| §8 Contactos | Este documento | ✅ Completado (Fase 2) |
| §9–12 Cotizaciones | Este documento | ⬜ Pendiente |
| §13–14 Pedidos | Este documento | ⬜ Pendiente |
| §15–18 Producción | Este documento | ⬜ Pendiente |
| §19–22 Inventario | Este documento | ⬜ Pendiente |
| §23–26 Compras | Este documento | ⬜ Pendiente |
| §27 Calidad | Este documento | ⬜ Pendiente |
| §28 Entregas | Este documento | ⬜ Pendiente |
| §29–30 Costos / finanzas | Este documento | ⬜ Pendiente |
| §32 Documentos | Este documento | ⬜ Pendiente |
| §33 Usuarios | Este documento | ✅ Completado (Fase 1) |
| §34 Auditoría | Este documento | ✅ Parcial: `activity_logs` en CRM; no hay log global de todo el sistema |
| §35 Notificaciones | Este documento | ⬜ Pendiente |
| §36 Búsqueda global | Este documento | ⬜ Pendiente |
| §51 Centro de Operaciones | Este documento | ⬜ Pendiente |

## Dependencias entre módulos

```
Fase 1 Fundación ✅
    └── Fase 2 CRM ✅
            └── Fase 3 Cotizaciones ⬜
                    └── Fase 4 Pedidos ⬜
                            ├── Fase 5 Producción ⬜
                            ├── Fase 6 Inventario ⬜
                            └── Fase 7 Compras ⬜
                                    └── Fase 8 Calidad y entregas ⬜
                                            └── Fase 9 Reportes ⬜
```

## Criterio de éxito del MVP (§54)

Solo el paso 1 («Crear cliente») está implementado. Los pasos 2–22 permanecen ⬜.

## Dónde leer el detalle

- Roadmap: [[roadmap]]
- Módulo CRM: [[crm]]
- Changelog: [[phase-2]]
- Auditoría: [[phase-2-audit]]
- Resumen Dirección: [[phase-2-summary]]

---
