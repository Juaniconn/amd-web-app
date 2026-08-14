# Estados Producción

Última actualización: 2026-08-13.  
Diseño de Fase 4. **Ningún estado de OP está en PostgreSQL.**

El pedido comercial (`orders.status`) solo admite `nuevo` (migración `0002_quotes`). No mezclar ambas máquinas de estados.

Ver [[Flujo Orden Produccion]], [[Proceso Producción]], ADR-025.

---

## Conjunto vigente (Fase 4)

Ampliación operativa de BUSINESS_SPEC §15 (que traía Pendiente, Preparación, En producción, Pausada, Calidad, Terminada, Cancelada).

| Estado | Código sugerido (no persistido) | Significado |
|---|---|---|
| Pendiente | `pendiente` | OP creada desde el pedido; no liberada a piso |
| Liberada | `liberada` | Autorizada por Producción para programar (reemplaza «Preparación» del §15) |
| Programada | `programada` | Centro, máquina y ventana asignados |
| En Producción | `en_produccion` | Fabricándose |
| Pausada | `pausada` | Interrumpida; debe haber motivo al implementarse |
| Esperando Material | `esperando_material` | Bloqueada por faltante. Inventario/Compras aún no existen |
| Calidad | `calidad` | En inspección ([[Proceso Calidad]]) |
| Terminada | `terminada` | Fabricación y liberación de calidad OK; pendiente de logística |
| Entregada | `entregada` | Cierre de piso tras embarque ([[Proceso Entregas]]) |
| Cancelada | `cancelada` | No se fabrica |

---

## Mapeo con §15

| §15 | Fase 4 |
|---|---|
| Pendiente | Pendiente |
| Preparación | Liberada + Programada |
| En producción | En Producción |
| — | Pausada (ya en §15) |
| — | Esperando Material (nuevo; integración futura con Inventario) |
| Calidad | Calidad |
| Terminada | Terminada |
| — | Entregada (cierre hacia Entregas) |
| Cancelada | Cancelada |

---

## Reglas de transición (diseño)

No hay código que las aplique. Al implementar: enum + función de transiciones (mismo patrón que `src/lib/quotes/status.ts`).

```
Pendiente ──────────────► Liberada ──────────► Programada ──────────► En Producción
    │                        │                     │                      │
    │                        │                     │                      ├──► Pausada
    │                        │                     │                      ├──► Esperando Material
    │                        │                     │                      └──► Calidad
    │                        │                     │
    │                        └──► Esperando Material ◄─────────────────────┘
    │
    └──► Cancelada ◄──── (desde no terminales, con permiso)
```

| Desde | Hacia permitidos | Notas |
|---|---|---|
| Pendiente | Liberada, Cancelada | Crear OP no implica fabricar. **Autorizar Producción** para Liberada |
| Liberada | Programada, Esperando Material, Cancelada | **Programar Máquinas** para Programada. **Liberar Material** si Inventario existe |
| Programada | En Producción, Esperando Material, Cancelada | Arranque de piso |
| En Producción | Pausada, Esperando Material, Calidad, Cancelada | No saltar a Terminada si aplica Regla 9 |
| Pausada | En Producción, Esperando Material, Cancelada | Reanudar o abortar |
| Esperando Material | Liberada, Programada, En Producción, Cancelada | Según etapa; material con **Liberar Material** |
| Calidad | En Producción, Terminada, Cancelada | **Liberar Calidad** para Terminada |
| Terminada | Entregada | **Cerrar Orden** |
| Entregada | — | Terminal |
| Cancelada | — | Terminal. No borra pedido ni cotización |

---

## Reglas adicionales

1. **Regla 9:** si el trabajo requiere inspección, `En Producción` → `Calidad` (no `Terminada` directo). El pedido mínimo no tiene flag; el diseño asume que **sí** requiere calidad.
2. **Esperando Material** es válido aunque Inventario no exista: en Fase 4 puede usarse como estado manual. No descuenta stock (ADR-009 no aplica todavía).
3. Cancelar OP no cambia `quotes.status` ni borra `orders`.
4. El estado de **máquina** (§18) es independiente del estado de la OP y de Activo/Inactivo (ADR-027).
5. Transiciones deben auditarse en `activity_logs` cuando exista la entidad (ADR-010). Hoy el enum `activity_entity_type` no incluye `production_order`.
6. Autorizar Producción, Liberar Material, Programar Máquinas, Liberar Calidad y Cerrar Orden **no existen** en el catálogo. Quién programa y quién libera: ADR-030 / [[Pendiente Validacion Direccion]] (aprobado).
7. Solo se programa una **máquina Activa** del centro (ADR-027).

---

## Qué no es un estado de OP

| Concepto | Dónde vive |
|---|---|
| Borrador / Enviada / Aprobada / Convertida | `quotes.status` (implementado) |
| Pedido Nuevo / Confirmado / En producción / Cerrado | BUSINESS_SPEC §13; en código solo `nuevo` |
| Inspección Aprobado / Rechazado | Resultado de calidad, no estado de OP |
| Entrega Pendiente / Enviado / Entregado | [[Proceso Entregas]], no implementado |
