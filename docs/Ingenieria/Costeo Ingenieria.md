# Costeo y cobro de Ingeniería

Última actualización: 2026-08-14.  
ADR-039. Ver [[Proceso Ingenieria]], [[Proceso RFQ]], [[KPI Ingenieria]], [[Tipos de Proyecto]].

Campos oficiales validados por Dirección. **Horas reales** sí se capturan. El resto **no está en PostgreSQL**.

---

# Tres escenarios de cobro

No confundir con los escenarios de **flujo** A/B (quién diseña, ADR-031).

| Cobro | Situación | Tratamiento comercial |
|---|---|---|
| **A** | El cliente entrega diseño completo | Costo de ingeniería **integrado** en el costo de fabricación |
| **B** | Diseño desde cero | Cobro **independiente** |
| **C** | Ingeniería inversa | Cobro **independiente** |

Mapeo con la RFQ persistida:

| `quotes.rfq_type` / tipo ingeniería | Cobro |
|---|---|
| `solo_fabricacion` (plano del cliente) | A — incluido |
| `solo_fabricacion` + manufacturabilidad | A — incluido, salvo pacto de Ventas |
| `diseno_fabricacion`, `diseno_solamente`, `diseno_nuevo`, `modificacion` | B — independiente |
| `reverse_engineering` | C — independiente |

---

# Tipo de cobro

Campo oficial `billing_type` (no persistido):

| Código | Uso |
|---|---|
| `incluido` | No aparece como línea de diseño; va en el precio de pieza (cobro A) |
| `tarifa_fija` | Monto cerrado de ingeniería (típico cobro B/C) |
| `por_hora` | Horas × costo hora (típico B/C y reverse engineering) |

---

# Campos oficiales

| Campo | Hoy en código | Destino |
|---|---|---|
| Horas estimadas | ⬜ | Cabecera de solicitud y/o RFQ |
| Horas reales | ✅ `engineering_hours` → `hours_logged` | Ya alimenta KPI de horas |
| Costo hora | ⬜ | Tarifa interna / de venta |
| Costo total ingeniería | ⬜ | Estimadas o reales × tarifa, o tarifa fija |
| Tipo de cobro | ⬜ | `incluido` \| `tarifa_fija` \| `por_hora` |

La cotización sigue usando `quote_items.estimated_cost` (costo de partida, no separado diseño vs máquina).

KPI **Horas estimadas vs reales** no se puede calcular hasta persistir estimadas (ADR-042).

---

# Reglas

1. Captura de horas: máximo 24 h por evento; no en `pendiente`, `liberado` ni `cancelado`.
2. Datos `is_demo` no son costo real.
3. `diseno_solamente` es venta de diseño (cobro B): pedido comercial sí; **no** OP de piso (ADR-035).
4. No inventar tarifas. El monto lo pone Ventas cuando exista el campo o, hoy, en partidas/notas de la RFQ.
