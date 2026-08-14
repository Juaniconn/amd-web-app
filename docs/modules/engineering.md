# Ingeniería / Diseño

# Objetivo

Solicitudes de diseño, CAD, revisiones, aprobación del cliente y liberación hacia cotización final y producción.

# Alcance

**Implementado (Fase 4) ✅:**

- Solicitudes (`engineering_requests`) ligadas 1:1 activa a una RFQ (ADR-033)
- Horas (`engineering_hours`)
- Archivos CAD/PDF (`documents.entity_type = engineering_request`)
- Máquina de estados [[Estados Ingenieria]]
- Dashboard `/engineering` y KPIs en dashboard general
- Permisos `engineering:*` y rol RBAC **Ingeniería**
- Gate de conversión a pedido (ADR-034)
- Origen de pedido para Fase 5 (ADR-035)

**Fuera de alcance (no construir en Fase 4):** visor CAD / PDM, portal del cliente, ejecución CAM, OP. ECO, costeo completo y nomenclatura validada en código son incrementos documentados (ADR-038–041), no el MVP ya desplegado.

Documentación: [[Proceso Ingenieria]], [[Flujo Ingenieria]], [[Tipos de Proyecto]], [[Estados Ingenieria]], [[Roles Ingenieria]], [[KPI Ingenieria]], [[Archivos Ingenieria]], [[Control Documental]], [[Costeo Ingenieria]], [[ECO ECN]], [[Ingenieria Executive Summary]].

# Flujo de negocio

Dos escenarios (ADR-031):

- **A** — AMD diseña: RFQ → Ingeniería → CAD → aprobación cliente → cotización final → pedido `rfq_ingenieria` → OP.
- **B** — Cliente entrega plano: RFQ + adjunto → cotización → pedido `rfq_directa` → OP; Ingeniería opcional (validación).

# Entidades

`engineering_requests`, `engineering_hours`. Documentos polimórficos. Relaciona `customers`, `quotes`, y más adelante `orders.engineering_request_id`.

# Permisos

| Permiso | Quién |
|---|---|
| `engineering:read` | Admin, Dirección, Ventas, Ingeniería, Producción, Calidad |
| `engineering:create` | Admin, Ventas, Ingeniería |
| `engineering:update` | Admin, Ingeniería |
| `engineering:assign` | Admin, Ingeniería |
| `engineering:approve` | Admin, Ventas, Ingeniería |
| `engineering:release` | Admin, Ingeniería |
| `engineering:delete` | Admin, Ingeniería |

# APIs

Server Actions en `src/server/actions/engineering.ts`. Descarga: `GET /api/documents/[id]` con `engineering:read` si `entity_type = engineering_request`.

# Pantallas

`/engineering`, `/engineering/new`, `/engineering/[id]`, `/engineering/[id]/edit`. Ficha de cliente y ficha de RFQ muestran la solicitud.

# Estados

[[Estados Ingenieria]]. Persistidos en `engineering_request_status`. Resumen en RFQ: [[rfq]] `engineering_status`.

# Relaciones

```
customers ✅ → quotes ✅ → engineering_requests ✅ → production_orders ⬜
                     ↘ documents (quote | engineering_request)
quotes ✅ → orders ✅ (origin + engineering_request_id)
```

# Riesgos

- Costeo de ingeniería (horas estimadas, tarifa, tipo de cobro) no persistido (ADR-039).
- Convertir RFQ a pedido sin `Liberado` en escenario A: **cerrado** (ADR-034).
- Confundir este módulo con la «Ingeniería» de ruta de piso (asignar CNC/láser).
- Inventar PDM/CAD viewer.
- `diseno_solamente` convertido a pedido no debe crear OP en Fase 5.

# Dependencias

[[crm]], [[rfq]] ✅. [[production]] Fase 5. Inventario no es requisito para diseñar.

ADR-031, ADR-032, ADR-033, ADR-034, ADR-035, ADR-036, ADR-037, ADR-038, ADR-039, ADR-040, ADR-041, ADR-042.
