# Estados Ingeniería

Última actualización: 2026-08-14.  
Máquina de estados de `engineering_requests.status`. Persistida en PostgreSQL (`engineering_request_status`).

No mezclar con `quote_status`, `quote_engineering_status` (resumen en RFQ) ni con estados de OP ([[Estados Produccion]]).

Código: `src/lib/engineering/status.ts`.

---

| Estado | Código | Significado |
|---|---|---|
| Pendiente | `pendiente` | Solicitud creada; sin ingeniero |
| Asignado | `asignado` | Ingeniero designado |
| Diseñando | `disenando` | CAD / modificación en curso |
| Revisión Interna | `revision_interna` | Revisión AMD (supervisor) |
| Esperando Cliente | `esperando_cliente` | Plano enviado; falta OK del cliente |
| Correcciones | `correcciones` | Retrabajo por revisión interna o cliente |
| Aprobado | `aprobado` | Cliente (y revisión interna) OK |
| Liberado | `liberado` | Listo para cotización final y/o OP |
| Cancelado | `cancelado` | No se diseña |

Resumen en la RFQ (`quotes.engineering_status`):

| Solicitud | RFQ |
|---|---|
| pendiente / cancelado | `pendiente` |
| asignado / diseñando / revisión / correcciones | `en_proceso` |
| esperando_cliente | `esperando_cliente` |
| aprobado | `aprobada` |
| liberado | `liberada` |
| (sin solicitud y no requiere) | `no_requerida` |

---

## Transiciones

```
Pendiente → Asignado → Diseñando → Revisión Interna
                ↑            ↓              ↓
                └── Correcciones ←─────────┘
                                   ↓
                         Esperando Cliente
                                   ↓
                         Correcciones o Aprobado
                                   ↓
                               Liberado
```

Cancelado: desde cualquier no terminal.

| Desde | Hacia |
|---|---|
| Pendiente | Asignado, Cancelado |
| Asignado | Diseñando, Revisión Interna, Cancelado |
| Diseñando | Revisión Interna, Correcciones, Cancelado |
| Revisión Interna | Diseñando, Correcciones, Esperando Cliente, Cancelado |
| Esperando Cliente | Aprobado, Correcciones, Cancelado |
| Correcciones | Diseñando, Cancelado |
| Aprobado | Liberado, Correcciones, Cancelado |
| Liberado | — (terminal de ingeniería; la OP es otro documento) |
| Cancelado | — |

Escenario B (solo validación): Pendiente → Asignado → Revisión Interna → Esperando Cliente / Aprobado → Liberado.

Permiso por destino: asignar `engineering:assign`; esperar cliente / aprobar / correcciones `engineering:approve`; liberar `engineering:release`; resto `engineering:update`.

---

## Relación con cotización y OP

- `quote_status` sigue su máquina (ADR-024). Ingeniería no la reemplaza.
- En escenario A (o B con validación), **no** convertir a pedido hasta `Liberado` (ADR-034).
- OP de Fase 5 espera un plano liberado o un adjunto de RFQ directa ([[Origen Orden Produccion]]).
