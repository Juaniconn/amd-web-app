# Roadmap — AMD Operations

Última actualización: 2026-08-14  
Fuente: código en `src/`, migraciones Drizzle y specs en `/docs`.  
Numeración operativa vigente: **ADR-032**. ADR-026 (Fase 4 = Producción) queda **reemplazada** en la numeración. El cuerpo histórico de BUSINESS_SPEC §47 no se reescribe.

Leyenda: ✅ Completado · 🔄 En progreso · ⬜ Pendiente

---

## Estado actual

**Fase 4 — Ingeniería y Diseño está ✅ implementada** (MVP en código + cierre documental Dirección ADR-036–043).  
Existen tablas `engineering_requests` / `engineering_hours`, rutas `/engineering`, permisos `engineering:*`, rol **Ingeniería**, gate de conversión (ADR-034) y origen de pedido (ADR-035).  
ECO, costeo completo, nomenclatura validada y DFM firmado por taller son **incrementos**, no el MVP.  
Producción (documentación de piso validada, ADR-030 + ADR-043) es **Fase 5** y **no se implementa todavía**.

Fases 1–4 cerradas. Pedido mínimo al convertir RFQ: sí existe (ADR-023). `/orders` deshabilitado.

Cadena objetivo:

```
CRM ✅ → RFQ ✅ → Ingeniería ✅ → Producción ⬜
```

---

## Fases (numeración operativa vigente)

| Fase | Nombre | Estado | Entregable real |
|---|---|---|---|
| 1 | Fundación | ✅ Completado | App Next.js, PostgreSQL, Better Auth, RBAC, layout, dashboard, usuarios y roles |
| 2 | CRM | ✅ Completado | Clientes, contactos, ficha, historial |
| 3 | RFQ | ✅ Completado | `quotes`, partidas, archivos, estados, conversión a pedido mínimo |
| 4 | Ingeniería y Diseño | ✅ Completado | `engineering_requests`, horas, archivos CAD, estados, KPIs, gate Liberado |
| 5 | Producción | ⬜ Pendiente | Docs de piso listas (ADR-030). Sin código. Esperan origen de pedido + plano vigente |
| 6 | Inventario | ⬜ Pendiente | — |
| 7 | Compras | ⬜ Pendiente | — |
| 8 | Calidad | ⬜ Pendiente | — |
| 9 | Entregas | ⬜ Pendiente | — |
| 10 | Facturación | ⬜ Pendiente | — |
| 11 | Dashboard Ejecutivo | ⬜ Pendiente | KPIs actuales: fundación, CRM, RFQ, Ingeniería |
| 12 | Beta Interna | ⬜ Pendiente | — |
| 13 | Deploy Cloudflare | ⬜ Pendiente | — |

---

## Relación con numeraciones anteriores

| Origen | Qué decía | Vigente ahora |
|---|---|---|
| BUSINESS_SPEC §47 | 4 Pedidos, 5 Producción | No se borra el cuerpo |
| ADR-026 | 4 Producción | **Reemplazada** por ADR-032 |
| ADR-032 | **4 Ingeniería**, **5 Producción**, … **13 Cloudflare** | Esta tabla |

- Pedido mínimo (ADR-023) no cambia. Origen: ADR-035.
- Catálogos de piso 2026-08-14: ADR-043.

El sidebar habilita `/engineering` (Fase 4). `/production` permanece «Fase 5».

---

## Dependencias

```
✅ Fase 1 Fundación
    └── ✅ Fase 2 CRM
            └── ✅ Fase 3 RFQ
                    └── ✅ Fase 4 Ingeniería y Diseño
                            └── ⬜ Fase 5 Producción
                                    ├── ⬜ Fase 6 Inventario
                                    └── ⬜ Fase 7 Compras
                                            └── ⬜ Fase 8 Calidad
                                                    └── ⬜ Fase 9 Entregas
                                                            └── ⬜ Fase 10 Facturación
                                                                    └── ⬜ Fase 11 Dashboard Ejecutivo
                                                                            └── ⬜ Fase 12 Beta Interna
                                                                                    └── ⬜ Fase 13 Deploy Cloudflare
```

```
Escenario A: RFQ → Ingeniería (diseño AMD) → cotización final → pedido (origen rfq_ingenieria) → OP
Escenario B: RFQ + plano del cliente → cotización → pedido (origen rfq_directa) → OP
             (Ingeniería opcional: validación de manufactura)
```

---

## Qué existe hoy (no inventar)

- CRM, RFQ, pedido mínimo, Ingeniería: como Fases 1–4
- Roles: Administrador, Dirección, Ventas, **Ingeniería**, Compras, Producción, Calidad, Almacén
- Entidad `engineering_requests` (1 RFQ → 0..1 activa, ADR-033)
- Documentos: `entity_type` `quote` y `engineering_request`
- Convertir RFQ exige `Liberado` si `requires_engineering` (ADR-034)
- `orders.origin` = `rfq_directa` \| `rfq_ingenieria` (ADR-035)
- Producción: documentada, **no** implementada

---

Ver [[AMD_OPERATIONS_BUSINESS_SPEC]], [[Proceso Ingenieria]], [[Ingenieria Executive Summary]], [[Proceso Producción]], [[Auditoria Fase 4 Ingenieria]], ADR-031 a ADR-043.
