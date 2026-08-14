# Proceso Calidad

Última actualización: 2026-08-13.  
Fuente de diseño: BUSINESS_SPEC §27 y Regla 9.  
Estado real: **no implementado.** No hay tabla `quality_inspections`, ruta `/quality` ni permisos `quality:*`.

El rol Calidad solo tiene `dashboard:read`.

Ver [[quality]], [[Proceso Producción]], [[Estados Produccion]], [[Flujo Orden Produccion]].

---

# Objetivo

Inspeccionar producto (primera pieza, en proceso y final), registrar resultado y **liberar** o devolver a producción. Sin liberación de calidad, la OP no debe pasar a entrega cuando el trabajo lo requiera (Regla 9).

Hoy: el proceso no corre. El cliente dueño del trabajo ya puede existir en el CRM; la OP no existe.

---

# Flujo General

```
OP en estado Calidad ⬜
    → Inspección primera pieza ⬜
    → Inspección en proceso ⬜
    → Inspección final ⬜
    → Resultado (Aprobado / Aprobado con observaciones / Rechazado) ⬜
    → No conformidad si aplica ⬜
    → Liberación ⬜  → OP Terminada → Entregas
```

**Hoy:** no hay OP ni inspecciones. Una RFQ convertida deja un pedido `nuevo` y se detiene ahí.

---

# Tipos de inspección (diseño; no persistidos)

## Inspección primera pieza

- **Cuándo:** al iniciar la corrida, antes de producir el lote.
- **Objetivo:** validar setup, cota crítica y conformidad con plano de la RFQ.
- **Entrada diseñada:** OP Programada o En Producción, plano (hoy solo en documentos de cotización), cantidad 1.
- **Salida diseñada:** primera pieza aprobada → continuar corrida; rechazada → OP Pausada o retorno a En Producción para ajuste. No hay registro en BD.

## Inspección en proceso

- **Cuándo:** durante la corrida (muestreo). El intervalo no está definido en el sistema.
- **Objetivo:** detectar deriva antes del lote completo.
- **Entrada diseñada:** OP En Producción, cantidad inspeccionada / aprobada / rechazada.
- **Salida diseñada:** continuar, pausar, o scrap parcial. Scrap no se contabiliza (no hay KPI ni inventario de producto).

## Inspección final

- **Cuándo:** OP pasa a estado `Calidad` al terminar fabricación.
- **Objetivo:** aceptar o rechazar el lote antes de liberación.
- **Campos diseñados (BUSINESS_SPEC §27):** orden, número de parte, inspector, fecha, cantidad inspeccionada, cantidad aprobada, cantidad rechazada, resultado, notas, archivos, fotografías.
- **Resultados:** Aprobado · Aprobado con observaciones · Rechazado.

## No conformidades

No hay entidad `nonconformances` en el esquema ni en TECHNICAL_SPEC §10.

Diseño mínimo (no implementar ahora): una no conformidad nace de un resultado Rechazado o de observaciones graves; queda ligada a la OP (y en el futuro al pedido). Disposición (retrabajo, scrap, uso bajo concesión) **no** está en el código ni en un catálogo persistido.

No inventar un módulo QMS (ISO, CAPA, calibración). BUSINESS_SPEC pide un módulo **básico** de inspecciones.

## Liberación

Requiere el permiso operativo **Liberar Calidad** (diseño; no existe en el catálogo). El usuario que libera es un usuario registrado, no un nombre de inspector hardcodeado.

- **Aprobado** o **Aprobado con observaciones:** OP → `Terminada` (lista para [[Proceso Entregas]]).
- **Rechazado:** OP no se entrega; vuelve a `En Producción` o queda en `Calidad` hasta disposición. Cancelar la OP es otra transición (Producción), no es liberación.

Regla 9: «Una orden de producción terminada debe pasar por calidad cuando el pedido lo requiera.» El pedido mínimo **no** tiene flag «requiere inspección». Hasta que exista, el diseño de Producción asume que **sí** pasa por `Calidad` (no saltar a `Terminada` desde `En Producción` por omisión).

Quién tiene Liberar Calidad: Inspector de Calidad (alternativa: Supervisor de Producción). ADR-030.

---

# Responsables

| Rol | Hoy en el sistema | Diseño |
|---|---|---|
| Calidad (RBAC) | `dashboard:read` | Inspector registra inspecciones |
| Producción | `dashboard:read` | Entrega la pieza/lote a calidad; retrabaja rechazos |
| Dirección | consulta CRM/RFQ | Consultará resultados cuando existan |
| Ventas | opera RFQ | No inspecciona |

Puesto de planta «Inspector Calidad»: [[Operadores y Roles]]. No es un rol RBAC distinto hoy.

---

# Entradas

Ninguna persistida de calidad.

Disponibles de fases previas: cliente (CRM), partidas y planos de la cotización, pedido mínimo. La OP, el inspector asignado y las cantidades de lote de piso **no** existen.

---

# Salidas

Ninguna.

Diseñadas: registro de inspección, cantidades OK/NG, resultado, evidencia fotográfica, señal de liberación hacia Entregas.

---

# Estados

De la inspección (diseño §27): Aprobado, Aprobado con observaciones, Rechazado.

De la OP relacionada: estado `Calidad` → `Terminada` o retorno a `En Producción`. Ver [[Estados Produccion]].

---

# Reglas de negocio

- BUSINESS_SPEC §27 y Regla 9: no ejecutables.
- Archivos de calidad: el enum `document_entity_type` hoy es `quote` \| `customer` \| `order`. No hay `quality` ni `production`. La API solo sirve `quote` (ADR-022).
- No hay `quality:*` en `src/lib/permissions/catalog.ts`. **Liberar Calidad** es diseño (ADR-029).
- Las tres rutas semilla terminan fabricación en Calidad antes de Entrega ([[Rutas de Fabricacion]]).

---

# KPI relacionados

Ninguno real. Scrap de producción dependerá de cantidades rechazadas cuando Calidad exista ([[KPI Produccion]]).

---

# Integración

- **Producción (Fase 5, no implementada):** la OP es el documento inspeccionado. El plano de referencia debe ser el liberado por Ingeniería cuando aplique.
- **RFQ:** el plano de cotización está en adjuntos de `quotes`; no sustituye al plano vigente de ingeniería en escenario A.
- **Entregas (Fase 9):** solo después de liberación.
- **Inventario (Fase 6):** scrap/consumo de piezas NG no está modelado.
