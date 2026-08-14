# Proceso Ingeniería

Última actualización: 2026-08-14.  
Fase 4 **implementada** (ADR-031 a ADR-043). Código: `src/features/engineering`, `src/server/services/engineering.ts`.  
Decisiones de Dirección 2026-08-14 incorporadas: CAD oficial, puesto, aprobaciones, nomenclatura, cobro/costeo, ECO, DFM, KPI.

Ver [[Flujo Ingenieria]], [[Tipos de Proyecto]], [[Estados Ingenieria]], [[Roles Ingenieria]], [[KPI Ingenieria]], [[Archivos Ingenieria]], [[Control Documental]], [[Costeo Ingenieria]], [[ECO ECN]], [[Origen Orden Produccion]], [[Ingenieria Executive Summary]], [[rfq]], [[Proceso Producción]].

---

# Objetivo

Gestionar el trabajo de **diseño y manufacturabilidad** cuando AMD debe crear, modificar o validar un plano **antes** de fabricar.

No sustituye a la RFQ (precios) ni a la OP (piso). Separa diseñar de cotizar y de producir.

CAD/CAM se ejecuta **fuera** del ERP: SolidWorks, Mastercam, Fusion 360, AutoCAD (ADR-036). AMD Operations guarda la solicitud, estados, horas, archivos exportados y el sello **Liberado = Aprobado para manufactura**.

---

# Escenarios de flujo (quién diseña)

## A — El cliente requiere diseño

```
Cliente → CRM → RFQ → Ingeniería → Diseño CAD → DFM → Revisión
    → Aprobación cliente → Cotización final → Pedido (origen rfq_ingenieria) → Producción
```

Ingeniería es **obligatoria** antes de pedido/OP. El precio final puede depender del diseño. Cobro típico: **B** (independiente) o **C** si es inversa.

## B — El cliente entrega diseño

```
Cliente → CRM → RFQ → plano adjunto → Cotización → Pedido (origen rfq_directa) → Producción
```

Ingeniería es **opcional**. Puede abrirse solo para validación de manufacturabilidad (`requires_engineering = true` en una RFQ `solo_fabricacion`). Cobro típico: **A** (incluido en fabricación).

---

# Escenarios de cobro

Detalle: [[Costeo Ingenieria]], ADR-039.

| Cobro | Caso | Tratamiento |
|---|---|---|
| A | Cliente entrega diseño completo | Ingeniería incluida en fabricación |
| B | Diseño desde cero | Cobro independiente |
| C | Ingeniería inversa | Cobro independiente |

---

# Responsables

Puesto de proceso principal: **Ingeniero de Diseño y Manufactura / Programador CNC** (ADR-036).

| Actor | En el sistema |
|---|---|
| Ingeniero de Diseño y Manufactura / Programador CNC | Rol RBAC `ingenieria`: todos los `engineering:*` |
| Líder de Ingeniería | Mismo rol MVP; firma interna (ADR-037) |
| Gerente de Operaciones | No hay `role_id`; firma interna. Cubrir con Dirección u usuario combinado |
| Ejecutivo de Ventas Técnicas | `quotes:*` + `engineering:read/create/approve` — canal con el cliente |
| Cliente / Ingeniería cliente / Calidad cliente | Externos; no hay portal |
| Jefe de Taller | Rol `produccion`, `engineering:read` — participa DFM (consulta) |
| Calidad AMD | `engineering:read` |
| Dirección | `engineering:read` |
| Administrador | todos |

Detalle: [[Roles Ingenieria]].

---

# Entradas

- Cliente (`customers`) ✅
- RFQ / cotización (`quotes`) ✅ — tipo RFQ, requiere ingeniería, tipo ingeniería
- Tipo de proyecto ([[Tipos de Proyecto]])
- Plano del cliente (flujo B) o brief (flujo A)
- Archivos en la solicitud ([[Archivos Ingenieria]], nomenclatura [[Control Documental]])

---

# Salidas

- Solicitud numerada `ING-YYYY-NNNNN` (seed demo: `DEMO_ING_00N`)
- Revisiones de plano / CAD / CAM exportados en `documents`
- Horas reales de ingeniería (`engineering_hours`)
- Aprobación del cliente (acto interno vía Ventas Técnicas)
- Liberación (`released_at`, `released_by`) = **Aprobado para manufactura**
- Al convertir: pedido con `origin` y `engineering_request_id`

Pendiente de persistir: horas estimadas, costo hora, costo total, tipo de cobro, ECO, nomenclatura validada.

---

# Estados

Pendiente → Asignado → Diseñando → Revisión Interna (**incluye DFM**) → Esperando Cliente → Correcciones → Aprobado → Liberado. Cancelado desde no terminales.

Atajo manufacturabilidad: Asignado → Revisión Interna (sin ciclo largo de Diseñando).

Detalle: [[Estados Ingenieria]].

---

# Revisión DFM (obligatoria)

Participan: Ingeniería, Programación CAM (mismo puesto CAD/CAM) y Jefe de Taller.

Objetivo: validar que AMD puede fabricar y programar la pieza (centros, tolerancias, CAM). ADR-041.

En código el paso es `revision_interna`. No hay checklist ni firma del taller persistida.

---

# Control de versiones y liberación a Producción

Nomenclatura: `AMD-PART-XXXX_REV-A` … `REV-C` ([[Control Documental]]).

Solo el paquete **Liberado** (planos, modelos, programas CAM) baja a piso. `aprobado` no basta.

Cambios después de Liberado: [[ECO ECN]], no reabrir la solicitud.

---

# Reglas de negocio

1. **Obligatoria u opcional (ADR-031):** si AMD diseña (flujo A) o se abrió validación, no hay pedido hasta `Liberado` (ADR-034). Si el cliente trae plano y no se pide ingeniería, se cotiza y convierte como Fase 3.
2. 1 RFQ → 0 o 1 solicitud activa (ADR-033). ECO es hijo, no segunda RFQ.
3. Producción (Fase 5) consume el plano **liberado** o, en B puro, el adjunto de cotización ([[Origen Orden Produccion]]).
4. Horas reales en `engineering_hours` (máx. 24 h por captura). Costeo completo: [[Costeo Ingenieria]] (parcial en código).
5. Cambios del cliente tras `Aprobado` y antes de Liberado vuelven a `Correcciones`. Tras Liberado: ECO.
6. El cliente no es usuario; el Ejecutivo de Ventas Técnicas registra la aprobación (`engineering:approve`).
7. Datos `is_demo` no son proyectos reales.
8. Archivar solo `pendiente` o `cancelado`. `Liberado` es inmutable.
9. DFM antes de enviar a cliente o liberar a manufactura (regla de proceso; no hay gate extra en código).

---

# KPI

Oficiales Dirección: [[KPI Ingenieria]], ADR-042. Se calculan en `/engineering` (parcial) y, resumidos, en `/dashboard`.

---

# Integración con RFQ

- Tipo de RFQ y flag Requiere Ingeniería en el formulario de cotización.
- Auto-creación de solicitud al guardar una RFQ que requiere ingeniería.
- Convertir a pedido exige `Liberado` si `requires_engineering`.
- Cliente estratégico (definición ADR-043) aún no es campo de CRM; Ventas lo considera al cotizar.

Ver [[Proceso RFQ]].

---

# Integración con Producción

- OP no implementada. El pedido ya trae origen.
- Rutas A/B/C de fabricación ([[Rutas de Fabricacion]]) son de **piso**, no de CAD.
- `diseno_solamente` no debe generar OP en Fase 5.
- Tiempos muertos «Espera de programa» y «Espera de plano» (ADR-043) apuntan a este módulo: sin Liberado no hay programa/plano vigente.

---

# Decisiones ya validadas (cerrado)

Software CAD/CAM, puesto, aprobaciones, nomenclatura, cobro, costeo (campos), ECO, DFM, KPI: ADR-036 a ADR-042. No reabrir sin ADR.
