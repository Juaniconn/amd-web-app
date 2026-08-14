# Origen de la orden (pedido / OP)

Última actualización: 2026-08-14.  
ADR-035. Aplica al **pedido mínimo** ya persistido y a la **OP futura** (Fase 5).

Ver [[Proceso Ingenieria]], [[Proceso Producción]], [[rfq]].

---

## Campo persistido

`orders.origin`

| Código | Etiqueta | Cuándo |
|---|---|---|
| `rfq_directa` | RFQ directa | `quotes.requires_engineering = false` al convertir |
| `rfq_ingenieria` | RFQ + Ingeniería | `requires_engineering = true` y solicitud `liberado` |

`orders.engineering_request_id` se llena solo en el segundo caso.

## Impacto en Producción (Fase 5)

Toda OP deberá heredar el origen del pedido:

```
RFQ Directa
    → OP usa adjuntos de la cotización (escenario B)
RFQ + Ingeniería
    → OP usa el paquete liberado de engineering_requests (escenario A o B con validación)
```

Reglas para el diseño de OP (no implementadas):

1. No crear OP desde cotización suelta; nace del pedido (ADR-025).
2. Si origen = `rfq_ingenieria`, exigir `engineering_requests.status = liberado` y copiar/ligar el plano vigente.
3. Si origen = `rfq_directa`, no bloquear por Ingeniería.
4. `diseno_solamente` puede tener pedido `rfq_ingenieria` **sin** OP de piso.

## Trazabilidad

```
Cliente → CRM → RFQ → (Ingeniería) → Pedido (origin) → OP
```

La liberación queda en `activity_logs` (`action = released`, entidad `engineering_request`).
