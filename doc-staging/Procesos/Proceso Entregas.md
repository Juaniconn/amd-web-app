# Proceso Entregas

Última actualización: 2026-08-13.  
Fuente de diseño: BUSINESS_SPEC §28.  
Estado real: **no implementado.** No hay tabla `deliveries` ni ruta `/deliveries`.

Ver [[shipping]], [[Proceso Producción]], [[Proceso Calidad]].

---

# Objetivo

Despachar trabajo **liberado** (producción terminada y, cuando aplique, calidad aprobada), registrar guía/transportista y dejar evidencia de entrega al cliente.

Hoy: el destinatario (cliente) ya puede existir en el CRM. El pedido mínimo puede existir si la RFQ se convirtió. No hay OP, inspección ni embarque.

---

# Flujo General

```
OP Terminada (liberada por Calidad) ⬜
    → Pedido listo para entrega ⬜
        → Preparar embarque ⬜
            → Enviar ⬜
                → Entregar ⬜
                    → OP Entregada / pedido cerrado ⬜
```

**Hoy:** el flujo se detiene en `orders.status = nuevo`. Sidebar `/deliveries` deshabilitado.

---

# Relación con Producción

La entrega **no** arranca desde la RFQ ni desde `aprobada`.

Cadena diseñada (ADR-025):

```
RFQ convertida ✅ → pedido mínimo ✅ → OP ⬜ → (fabricación) → Calidad ⬜ → Terminada ⬜ → Entrega ⬜
```

- Una OP en `En Producción`, `Pausada`, `Esperando Material` o `Calidad` **no** es embarcable.
- Estado de OP `Entregada`: cierre de piso, distinto de la logística del embarque.
- Un pedido puede tener varias OP (Regla 2): el embarque puede ser parcial. Eso no está modelado (el pedido solo tiene estado `nuevo`).

Fase 5 documenta la OP; **no** implementa entregas. Entregas es Fase 9.

---

# Relación con Calidad

[[Proceso Calidad]] libera el lote:

- Aprobado / Aprobado con observaciones → OP `Terminada` → entra a este proceso.
- Rechazado → no se embarca.

No hay flag en el pedido mínimo «requiere inspección». El diseño asume paso por calidad antes de entregar.

Sin módulo Calidad, no hay evidencia de liberación que Entregas pueda consultar.

---

# Relación con Embarques

«Embarque» en AMD Operations es este mismo proceso (módulo Entregas / `deliveries`), no un carrier externo integrado.

Campos diseñados (BUSINESS_SPEC §28):

- Pedido
- Cliente
- Fecha
- Responsable
- Transportista (texto; no hay catálogo)
- Número de guía
- Cantidad
- Estado
- Evidencia
- Notas

Estados diseñados: Pendiente · Preparando · Enviado · Entregado · Incidencia.

No hay integración con paquetería, carta porte, SAT ni tracking URL.

El dashboard tiene el placeholder «Entregas próximas · Fase 8» sin cifra.

---

# Responsables

| Rol | Hoy | Diseño |
|---|---|---|
| Almacén | `dashboard:read` | Preparar, empacar, evidenciar |
| Producción | `dashboard:read` | Entrega interna a almacén / calidad, no al cliente |
| Ventas | CRM + RFQ | Informa al cliente; no registra guía |
| Dirección | consulta | Verá entregas próximas cuando existan |

No hay permisos `deliveries:*` ni `shipping:*`.

---

# Entradas

Ninguna persistida de entrega.

Disponibles: `customers` (dirección/ciudad/estado/país del maestro; no hay dirección de envío aparte), pedido mínimo (número AMD, total, partidas). Faltan: OP terminada, cantidades de piso, inspección, transportista.

---

# Salidas

Ninguna.

Diseñadas: registro de entrega, guía, evidencia, cambio de estado de OP a `Entregada`. Cierre del pedido comercial (estados §13: Listo para entrega → Entregado → Cerrado) **no** está en `order_status` (solo `nuevo`).

---

# Estados

Pendiente, Preparando, Enviado, Entregado, Incidencia. No persistidos.

---

# Reglas de negocio

- BUSINESS_SPEC §28: no ejecutable.
- **Cerrar Orden** (ADR-029) pasa OP `Terminada` → `Entregada`. Liberación previa: Inspector (alt. Supervisor). ADR-030.
- Regla 8: un pedido no debe cerrarse con procesos críticos pendientes. No hay cierre de pedido.
- Documentos de evidencia: `documents` no admite `entity_type` de entrega; la API solo sirve cotizaciones.

---

# KPI relacionados

Placeholder: «Entregas próximas · Fase 8». Ningún cálculo.
