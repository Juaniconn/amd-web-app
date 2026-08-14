# Proceso Ingeniería

Última actualización: 2026-08-14.  
Fase 4 **implementada** (ADR-031 a ADR-035). Código: `src/features/engineering`, `src/server/services/engineering.ts`.

Ver [[Flujo Ingenieria]], [[Tipos de Proyecto]], [[Estados Ingenieria]], [[Roles Ingenieria]], [[KPI Ingenieria]], [[Archivos Ingenieria]], [[Origen Orden Produccion]], [[Ingenieria Executive Summary]], [[rfq]], [[Proceso Producción]].

---

# Objetivo

Gestionar el trabajo de **diseño y manufacturabilidad** cuando AMD debe crear, modificar o validar un plano **antes** de fabricar.

No sustituye a la RFQ (precios) ni a la OP (piso). Separa diseñar de cotizar y de producir.

---

# Escenarios

## A — El cliente requiere diseño

```
Cliente → CRM → RFQ → Ingeniería → Diseño CAD → Revisión
    → Aprobación cliente → Cotización final → Pedido (origen rfq_ingenieria) → Producción
```

Ingeniería es **obligatoria** antes de pedido/OP. El precio final puede depender del diseño.

## B — El cliente entrega diseño

```
Cliente → CRM → RFQ → plano adjunto → Cotización → Pedido (origen rfq_directa) → Producción
```

Ingeniería es **opcional**. Puede abrirse solo para validación de manufacturabilidad (`requires_engineering = true` en una RFQ `solo_fabricacion`).

---

# Responsables

| Actor | En el sistema |
|---|---|
| Ingeniero Diseño / Supervisor | Rol RBAC `ingenieria`: todos los `engineering:*` |
| Ventas | `quotes:*` + `engineering:read/create/approve` |
| Cliente | Externo; no hay portal. La aprobación la registra Ventas o Ingeniería |
| Producción | `engineering:read` (consulta plano / validación) |
| Calidad | `engineering:read` |
| Dirección | `engineering:read` |
| Administrador | todos |

Detalle: [[Roles Ingenieria]].

---

# Entradas

- Cliente (`customers`) ✅
- RFQ / cotización (`quotes`) ✅ — tipo RFQ, requiere ingeniería, tipo ingeniería
- Tipo de proyecto ([[Tipos de Proyecto]])
- Plano del cliente (escenario B) o brief (escenario A)
- Archivos en la solicitud ([[Archivos Ingenieria]])

---

# Salidas

- Solicitud numerada `ING-YYYY-NNNNN` (seed demo: `DEMO_ING_00N`)
- Revisiones de plano / CAD en `documents`
- Horas de ingeniería
- Aprobación del cliente (acto interno)
- Liberación (`released_at`, `released_by`) hacia cotización final y/o Producción
- Al convertir: pedido con `origin` y `engineering_request_id`

---

# Estados

Pendiente → Asignado → Diseñando → Revisión Interna → Esperando Cliente → Correcciones → Aprobado → Liberado. Cancelado desde no terminales.

Atajo manufacturabilidad: Asignado → Revisión Interna (sin ciclo largo de Diseñando).

Detalle: [[Estados Ingenieria]].

---

# Reglas de negocio

1. **Obligatoria u opcional (ADR-031):** si AMD diseña (A) o se abrió validación, no hay pedido hasta `Liberado` (ADR-034). Si el cliente trae plano y no se pide ingeniería, se cotiza y convierte como Fase 3.
2. 1 RFQ → 0 o 1 solicitud activa (ADR-033).
3. Producción (Fase 5) consume el plano **liberado** o, en B puro, el adjunto de cotización ([[Origen Orden Produccion]]).
4. Las horas se capturan en `engineering_hours` (máx. 24 h por captura). El costo de cotización aún no separa diseño vs máquina.
5. Cambios del cliente tras `Aprobado` vuelven a `Correcciones`. No hay PDM.
6. El cliente no es usuario; Ventas o Ingeniería registra la aprobación (`engineering:approve`).
7. Datos `is_demo` no son proyectos reales.
8. Archivar solo `pendiente` o `cancelado`. `Liberado` es inmutable.

---

# KPI

Se calculan en `/engineering` y, resumidos, en el dashboard. [[KPI Ingenieria]].

---

# Integración con RFQ

- Tipo de RFQ y flag Requiere Ingeniería en el formulario de cotización.
- Auto-creación de solicitud al guardar una RFQ que requiere ingeniería.
- Convertir a pedido exige `Liberado` si `requires_engineering`.

Ver [[Proceso RFQ]].

---

# Integración con Producción

- OP no implementada. El pedido ya trae origen.
- Rutas A/B/C de fabricación ([[Rutas de Fabricacion]]) son de **piso**, no de CAD.
- `diseno_solamente` no debe generar OP en Fase 5.

---

# Pendiente Validación AMD México

Ver la sección en [[Flujo Ingenieria]] (software CAD, quién diseña/aprueba, versiones, cobro de horas, cambios de cliente).
