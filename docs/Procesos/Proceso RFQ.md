# Proceso RFQ

Última actualización: 2026-08-13 (Fase 3 Cotizaciones).  
Fuente: código en `src/features/quotes`, `src/server/services/quotes.ts`, `src/lib/quotes/status.ts`.  
No duplicar este proceso fuera de `docs/Procesos/`.

# Objetivo

Recibir una solicitud de cotización (RFQ), asociarla a un cliente del CRM, cotizar partidas con costo y margen, adjuntar planos y producir una cotización formal. Una cotización **aprobada** puede convertirse en **pedido mínimo**. No crea orden de producción.

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
    → Orden de producción ⬜  (Fase 5; este proceso no la genera)
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
| Ventas | `quotes:read` + `quotes:write`: captura, partidas, archivos, estados, duplicar, archivar, convertir |
| Dirección | `quotes:read`: consulta listado, ficha, costos y márgenes. No escribe |
| Administrador | Ambos permisos |
| Compras, Producción, Calidad, Almacén | Sin `quotes:*`. No ven el módulo |

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
4. Convertir exige estado `aprobada` y al menos una partida.
5. No se puede archivar una cotización `convertida`.
6. Duplicar crea un nuevo `borrador` con nuevo número y copia de partidas.
7. Cálculo de dinero solo en servidor (IVA default 16 %, redondeo a 2 decimales).
8. Los registros `is_demo = true` no son ventas reales de AMD.
9. Compras/Producción/Calidad/Almacén no operan este proceso en el sistema.

# Conversión a Producción

**No implementada.** Este proceso no genera órdenes de producción, no asigna máquina y no reserva material.

La acción **Convertir en pedido** (solo desde `aprobada`):

1. Crea `orders` + `order_items` (descripción, cantidad, precios, IVA; **sin** costo estimado).
2. Estado del pedido: `nuevo`.
3. Liga `quotes.converted_order_id` ↔ `orders.quote_id`.
4. `/orders` permanece deshabilitado (Fase 4).
5. Fase 5 (Producción) partirá de ese pedido, no de la cotización.

Ver [[Proceso Producción]] (aún no ejecutable) y ADR-023.

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

No hay KPI de «ventas hoy» (Fase 4). El Centro de Operaciones (§51) no existe.

Filtros del listado `/quotes`: búsqueda (número/cliente/notas) y estado. Paginación 20.

Ver [[rfq]], ADR-022, ADR-023, ADR-024.
