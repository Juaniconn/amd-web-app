# ECO / ECN — Cambio de Ingeniería

Última actualización: 2026-08-14.  
ADR-040. Ver [[Control Documental]], [[Flujo Ingenieria]], [[Proceso Ingenieria]], [[Estados Ingenieria]].

**Diseño validado. Entidad no implementada** (`engineering_changes` no existe).

---

# Qué es

**ECO** (Engineering Change Order) / **ECN** (Engineering Change Notice): cambio controlado sobre un diseño ya avanzado o **Liberado**.

No es una segunda solicitud huérfana. No rompe ADR-033 (1 RFQ → 0..1 solicitud activa). El ECO es hijo de la solicitud / de la pieza.

---

# Flujo oficial

```
Solicitud de cambio
    ↓
Evaluación de impacto
    ↓
Costo
    ↓
Tiempo
    ↓
Aprobación del cliente
    ↓
Liberación de nueva revisión
    (AMD-PART-XXXX_REV-B, REV-C, …)
```

Canal de aprobación del cliente: Ejecutivo de Ventas Técnicas (ADR-037).

---

# Relación con la máquina actual

| Situación | Qué hacer hoy | Qué hará el ECO |
|---|---|---|
| Solicitud no liberada | Transición a `correcciones` | Opcional; correcciones cubren el MVP |
| Solicitud `liberado` | **No** se edita ni se suben archivos | Abrir ECO → nueva revisión → nuevo Liberado |
| Cambio de precio/alcance | Ventas duplica o edita RFQ si aún es borrador; si ya hay pedido, nueva RFQ | El ECO no sustituye la cotización |

Reabrir `liberado` está **prohibido**.

---

# Salida

- Nueva revisión nomenclada ([[Control Documental]]).
- Paquete anterior histórico (no borrar).
- Producción (Fase 5) usa **solo** la revisión Liberada más reciente.
- Si hay pedido/OP en curso: impacto de costo y tiempo debe ser visible para Ventas y Planeación (campos de ECO, no implementados).
