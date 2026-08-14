# Proceso RFQ

Última actualización: 2026-08-14 (Fase 4: RFQ distingue diseño vs fabricación).  
Fuente: código en `src/features/quotes`, `src/server/services/quotes.ts`, `src/lib/quotes/status.ts`, `src/lib/quotes/rfq.ts`.  
No duplicar este proceso fuera de `docs/Procesos/`.

# Objetivo

Recibir una solicitud de cotización (RFQ), asociarla a un cliente del CRM, indicar si AMD diseña o solo fabrica, cotizar partidas con costo y margen, adjuntar planos y producir una cotización formal. Una cotización **aprobada** puede convertirse en **pedido mínimo** si, cuando aplica, Ingeniería está **Liberada**. No crea orden de producción (Fase 5, ADR-025).

Hoy el flujo de `/quotes` cubre **escenario B** y **escenario A** (tipo RFQ + solicitud de ingeniería).

La RFQ no es un documento aparte: es la cotización en estado `borrador` (ADR-024).

# Flujo General

```
Cliente maestro CRM ✅
    → Alta /quotes/new (RFQ = cotización borrador) ✅
    → Partidas + archivos (mientras borrador o en revisión) ✅
    → Enviar a revisión (opcional) ✅
    → Marcar enviada ✅  ← solo cambio de estado; no hay correo ni PDF
    → Aprobada | Rechazada | Expirada ✅
    → Convertir en pedido mínimo ✅
    → Ingeniería ✅  (obligatoria si requires_engineering; 1 RFQ → 0..1 solicitud)
    → Orden de producción ⬜  (Fase 5 Producción, ADR-025; este proceso no la genera)
```

Transiciones permitidas en el sistema:

```
borrador     → en_revision | enviada
en_revision  → borrador | enviada
enviada      → aprobada | rechazada | expirada
aprobada     → convertida
rechazada    → (terminal)
expirada     → (terminal)
convertida   → (terminal)
```

Edición de cabecera, partidas y archivos: solo `borrador` y `en_revision`.

# Responsables

| Rol | En el sistema |
|---|---|
| Ventas | `quotes:*` + `engineering:read/create/approve` |
| Dirección | `quotes:read` + `engineering:read` |
| Ingeniería | `engineering:*` (no escribe cotizaciones salvo que el usuario tenga también Ventas) |

# Entradas

- Cliente activo y no archivado (`customers.id`)
- Contacto opcional del mismo cliente
- Fecha de emisión; vigencia opcional
- Moneda `mxn` \| `usd`
- Condiciones de pago, tiempo de entrega, notas (texto de la solicitud RFQ)
- Partidas: descripción, número de parte, cantidad, unidad (default `pza`), precio unitario, descuento %, IVA % (default 16), costo estimado
- Archivos (opcional): pdf, office, CAD (dxf/dwg/step/stp/stl), imágenes, txt; máximo 20 MB

# Salidas

- Cotización numerada `COT-YYYY-NNNNN` (el seed demo usa `DEMO_COT_00N`)
- Totales persistidos: subtotal, IVA, total, costo estimado, utilidad estimada, margen %
- Historial en `activity_logs`
- Si se convierte: pedido `AMD-YYYY-NNNNN` (`orders.status = nuevo`) y partidas comerciales en `order_items`
- Archivos en `documents` + disco `.data/uploads` (o `STORAGE_DIR`)

# Estados

| Código | Etiqueta UI | Significado operativo |
|---|---|---|
| `borrador` | Borrador | RFQ en captura |
| `en_revision` | En revisión | Interna; sigue editable |
| `enviada` | Enviada | Oferta formal; no editable. No envía email |
| `aprobada` | Aprobada | Lista para convertir |
| `rechazada` | Rechazada | Terminal |
| `expirada` | Expirada | Terminal. Manual o lazy expire si `valid_until` venció estando `enviada` |
| `convertida` | Convertida en pedido | Terminal; muestra número de pedido |

# Reglas de negocio

1. La cotización apunta a un `customers.id` activo y no archivado.
2. El contacto, si existe, pertenece a ese cliente.
3. Marcar `enviada` exige al menos una partida y precio unitario en todas.
4. Convertir exige estado `aprobada`, al menos una partida y, si `requires_engineering`, solicitud de ingeniería `liberado` (ADR-034).
5. No se puede archivar una cotización `convertida`.
6. Duplicar crea un nuevo `borrador` con nuevo número, copia de partidas y, si aplica, una solicitud nueva.
7. Cálculo de dinero solo en servidor (IVA default 16 %, redondeo a 2 decimales).
8. Los registros `is_demo = true` no son ventas reales de AMD.
9. Tipo RFQ `diseno_fabricacion` / `diseno_solamente` / `reverse_engineering` fuerza `requires_engineering`.
10. `solo_fabricacion` puede pedir ingeniería opcional (manufacturabilidad).

# Conversión a Producción

**No implementada.** Este proceso no genera órdenes de producción, no asigna máquina y no reserva material.

La acción **Convertir en pedido** (solo desde `aprobada`):

1. Crea `orders` + `order_items` (descripción, cantidad, precios, IVA; **sin** costo estimado).
2. Estado del pedido: `nuevo`. Origen: `rfq_directa` o `rfq_ingenieria` (ADR-035).
3. Liga `quotes.converted_order_id` ↔ `orders.quote_id`. Si hubo liberación, `orders.engineering_request_id`.
4. `/orders` permanece deshabilitado (UI de pedidos diferida, ADR-026).
5. Fase 5 (Producción) partirá de ese pedido ([[Origen Orden Produccion]]).

Ver [[Proceso Ingenieria]], [[Proceso Producción]] (aún no ejecutable), [[Flujo Orden Produccion]], ADR-023, ADR-025, ADR-031.

# Integración con Ingeniería

Implementada. ADR-031, ADR-033, ADR-034, [[Proceso Ingenieria]].

- **A:** AMD diseña; la conversión a pedido espera `Liberado`.
- **B:** el plano vive en adjuntos de la cotización; Ingeniería solo si Ventas marca Requiere Ingeniería (validación).
- Guardar una RFQ que requiere ingeniería **crea** la solicitud si no existe.

# Integración con CRM

- El alta puede llevar `?customerId=` desde la ficha del cliente.
- La ficha de cliente lista cotizaciones reales (número, estado, fecha, total) si el usuario tiene `quotes:read`.
- El historial de cotización usa el mismo `activity_logs` del CRM, con `parent_entity` = cliente.
- Archivar un cliente no borra cotizaciones; el alta nueva exige cliente activo.

Ver [[crm]].

# KPI

En `/dashboard`, si el usuario tiene `quotes:read`:

| KPI | Definición en código |
|---|---|
| Cotizaciones abiertas | `borrador` + `en_revision` + `enviada`, no archivadas |
| Por vencer (7 días) | `enviada` con `valid_until` entre ahora y ahora+7 días |
| Convertidas del mes | `convertida` con `updated_at` ≥ inicio de mes |

No hay KPI de «ventas hoy» (la UI de pedidos está diferida). El Centro de Operaciones (§51) no existe.

Filtros del listado `/quotes`: búsqueda (número/cliente/notas) y estado. Paginación 20.

Ver [[rfq]], ADR-022, ADR-023, ADR-024.
