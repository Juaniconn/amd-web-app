# Resumen Ejecutivo

**Fecha:** 2026-08-14  
**Módulo:** Ingeniería y Diseño (Fase 4)  
**Tipo:** Auditoría post-implementación + cierre documental de Dirección AMD México  
**Código:** no se añadieron funcionalidades en esta pasada (salvo el arreglo previo del 500 de dashboard, digest `3831674674`).

El MVP de Ingeniería **está en producción local y es operable**: RFQ distingue fabricar vs diseñar, existe `/engineering`, la conversión a pedido exige `Liberado` cuando aplica, y el pedido nace con origen para Fase 5.

Las decisiones validadas por Dirección el 2026-08-14 (CAD, puesto, aprobaciones, nomenclatura, cobro, ECO, DFM, KPI, catálogos de piso) **quedaron en el vault y en ADR-036–043**. Varias **no están en PostgreSQL ni en la UI**. Eso no invalida el MVP; sí condiciona qué puede hacer Producción el día uno.

**Veredicto Fase 5:** **GO condicionado.** Se puede iniciar Producción anclada a `orders.origin` + paquete `liberado`. No se debe asumir ECO, nomenclatura validada, DFM firmado por taller ni costeo de ingeniería ya persistidos.

**Calificación global: 8 / 10** — módulo sólido para el alcance de software de Fase 4; el modelo operativo de Dirección es más amplio que el código.

---

## Alcance

Auditado contra `/docs`, código en `src/`, migración `0003_engineering`, catálogo RBAC, UI `/engineering` y `/dashboard`, RFQ y pedido mínimo.

Incluye el cierre de preguntas que estaban abiertas en [[Flujo Ingenieria]] y los catálogos de Producción/Calidad/Compras de ADR-043.

No incluye implementación de Fase 5 ni nuevas tablas.

---

## Funcionalidades Implementadas

| Área | Evidencia |
|---|---|
| RFQ tipo + flag ingeniería | `quotes.rfq_type`, `requires_engineering`, `engineering_type`, `engineering_status` |
| Auto-creación 1:1 RFQ → solicitud | ADR-033, unique `quote_id` where `deleted_at is null` |
| Máquina de estados | `pendiente` … `liberado` / `cancelado` (`src/lib/engineering/status.ts`) |
| UI | `/engineering`, alta, ficha, edición, filtros, documentos, horas |
| Archivos CAD/PDF | `documents.entity_type = engineering_request`, 50 MB, lock post-liberado |
| Horas reales | `engineering_hours` → `hours_logged` (máx. 24 h/captura) |
| Permisos `engineering:*` + rol `ingenieria` | `catalog.ts`; Ventas crea/aprueba; piso y calidad leen |
| Gate Liberado | `convertQuoteToOrder` → `ENGINEERING_NOT_RELEASED` |
| Origen de pedido | `orders.origin`, `engineering_request_id` |
| KPIs parciales | `/engineering` 7 métricas; `/dashboard` 3 |
| Nav | Ingeniería entre Cotizaciones y Pedidos |
| Ficha cliente / RFQ | Muestran solicitud ligada |
| Defecto dashboard Date-in-SQL | Corregido (`gte` en aprobadas del mes) |

---

## Funcionalidades Pendientes

Relativas al modelo validado por Dirección, **no** al MVP original de Fase 4:

1. Costeo: horas estimadas, costo hora, costo total, tipo de cobro (`incluido` / `tarifa_fija` / `por_hora`).
2. ECO/ECN persistido (`engineering_changes`) y nueva revisión tras Liberado.
3. Validación de nomenclatura `AMD-PART-XXXX_REV-*` y campos `part_number` / `revision` en `documents`.
4. Doble firma interna (Líder + Gerente de Operaciones) y registro del actor cliente.
5. Checklist / firma DFM del Jefe de Taller (hoy Producción solo `engineering:read`).
6. KPI oficiales: cumplimiento de liberación, horas est. vs reales, errores, retrabajos.
7. Flag CRM `cliente estratégico`.
8. Fecha prometida en pedido/OP (Gerente Producción / Planeación).
9. Catálogos de tiempos muertos, retrabajos de piso, material crítico, compras urgentes (Fases 5–7).
10. Visor CAD, PDM, portal cliente, OP — fuera de alcance consciente.

---

## Riesgos Críticos

Ninguno **bloqueante** para operar el MVP de Ingeniería ni para **diseñar** Fase 5.

El único P0 de runtime (dashboard 500 por `Date` en SQL) **ya está cerrado**.

---

## Riesgos Medios

| ID | Riesgo | Mitigación |
|---|---|---|
| F4-M1 | Piso usa un PDF de RFQ en lugar del paquete Liberado | ADR-038: Fase 5 debe leer `origin` + `engineering_request_id` |
| F4-M2 | Cambio de cliente tras Liberado no tiene ECO | No reabrir `liberado`; incremento ECO (ADR-040) |
| F4-M3 | `orders.engineering_request_id` sin FK | Añadir FK en Fase 5 al tocar `orders` |
| F4-M4 | Snapshot Drizzle `0003` ausente | Generar snapshot antes de la migración de Producción |
| F4-M5 | Un solo rol `ingenieria` para líder, diseñador y CAM | Aceptable en MVP; no inventar roles sin ADR |
| F4-M6 | DFM sin firma de taller | Regla de proceso; no hay gate en código |
| F4-M7 | Cobro A/B/C no está en la cotización | Ventas usa partidas/notas hasta persistir tarifa |
| F4-M8 | Archivos locales (ADR-022) no se comparten entre PCs | R2 sigue siendo el destino de producción |

---

## Riesgos Bajos

- `cancelado` en la solicitud se resume en RFQ como `pendiente` (no como rechazo comercial).
- Dashboard general no muestra aprobados/rechazados/horas (sí `/engineering`).
- `diseno_solamente` puede convertirse a pedido: correcto comercialmente; Fase 5 no debe crear OP.
- Tipos «optimización» y «prototipo» están en docs y no en el enum persistido.
- Documentos `customer` / `order` en el enum siguen 403 al descargar.
- Warning de lint preexistente en `login-form.tsx`.

---

## Deuda Técnica

| Ítem | Origen |
|---|---|
| Sin `meta/0003_snapshot.json` | Fase 4 |
| `engineering_request_id` sin FK | Fase 4 |
| Interpolación `sql\`\`` + Date (patrón) | Corregido en quotes e ingeniería; no repetir |
| Tests de persistencia CRM (F2-02) | Heredada |
| Storage local vs R2 | ADR-022 |

---

## Cambios Recomendados (no bloquean Fase 5)

1. Persistencia de costeo (ADR-039) para el KPI horas estimadas vs reales.
2. Campos `revision` + `part_number` en `documents` y validación opcional del patrón AMD-PART.
3. Entidad ECO hija de la solicitud.
4. Checklist DFM con permiso para Producción (Jefe de Taller).
5. Flag `strategic` en CRM.
6. Materializar snapshot `0003`.
7. FK de `orders.engineering_request_id`.
8. KPI cumplimiento = `released_at <= due_date` (los timestamps ya existen).

---

## Cambios Obligatorios (antes o al arrancar Fase 5)

1. **OP solo consume Liberado** si `origin = rfq_ingenieria` (regla de diseño, no código hoy).
2. **No crear OP** para `diseno_solamente`.
3. **No reabrir** solicitudes `liberado`.
4. **Fecha prometida** a cargo de Gerente Producción / Planeación (campo nuevo en OP).
5. Cierre de OP: físico = Calidad; administrativo = Supervisor Producción.
6. No interpolar `Date` en `sql\`\`` al escribir queries de piso.

Ninguno exige rehacer Ingeniería. Sí deben estar en el diseño técnico de Fase 5.

---

## Preparación para Producción

| Entrada que Fase 5 necesita | ¿Lista? |
|---|---|
| Pedido mínimo | ✅ |
| `orders.origin` | ✅ |
| `engineering_request_id` | ✅ (sin FK) |
| Paquete Liberado | ✅ (sin nomenclatura validada) |
| Plano del cliente (RFQ directa) | ✅ adjuntos de quote |
| Prioridad 1–4 / fecha prometida | ⬜ |
| Centros / máquinas / rutas | ⬜ docs ADR-027/028 |
| Material / compras | ⬜ |
| DFM de taller persistido | ⬜ |

**Listo para iniciar Fase 5:** sí, con las reglas de ADR-038 y ADR-043 como contrato.

---

## Estado General

Ingeniería MVP **cerrada en software**. Cierre documental de Dirección **hecho**. Hueco consciente entre proceso de planta y schema.

### Calificación

| Dimensión | Nota |
|---|---|
| Arquitectura | 8 / 10 |
| Base de Datos | 7 / 10 |
| Backend | 8 / 10 |
| Frontend | 8 / 10 |
| Permisos | 7 / 10 |
| Documentación | 9 / 10 |
| Escalabilidad | 7 / 10 |
| Preparación Fase 5 | 7 / 10 |
| **Calificación global** | **8 / 10** |

Arquitectura: monolito claro, ADRs, gate y origen. Resta ECO como hijo y costeo.  
Base de datos: schema limpio; faltan campos de Dirección y el snapshot/FK.  
Backend: máquina de estados y actions correctas; bug Date ya resuelto.  
Frontend: CRUD completo; dashboard ejecutivo y costeo no.  
Permisos: `engineering:*` bien cortado; no hay DFM de taller ni Gerente de Operaciones.  
Documentación: vault actualizado a ADR-043.  
Escalabilidad: 1:1 RFQ está bien para AMD; archivos locales no.  
Fase 5: contrato de datos suficiente para OP; catálogos de piso aún en papel.
