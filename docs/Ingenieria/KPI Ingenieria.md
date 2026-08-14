# KPI Ingeniería

Última actualización: 2026-08-14.  
Set oficial: ADR-042. Código: `getEngineeringDashboardStats`.

Se calculan en `/engineering`. El dashboard general (`/dashboard`) muestra un **subconjunto** (abiertas, vencidas, liberados) si el usuario tiene `engineering:read`.

No confundir con KPI de piso ([[KPI Produccion]]) ni con cotizaciones abiertas. No se muestran ceros fingidos: si no hay solicitudes, el número es 0 real.

---

## KPI oficiales (Dirección)

| KPI | Definición de negocio | Hoy |
|---|---|---|
| Cumplimiento liberación de diseño | % de solicitudes Liberadas en o antes de `due_date` | ⬜ No se calcula (datos parciales: sí hay `due_date` y `released_at`) |
| Horas estimadas vs reales | Estimadas / `hours_logged` | ⬜ Faltan horas estimadas (ADR-039) |
| Errores de ingeniería | Incidentes de diseño que llegan a piso o al cliente | ⬜ Sin entidad |
| Retrabajos de ingeniería | Ciclos `correcciones` o ECO por error AMD | Parcial: existe estado `correcciones`, no hay KPI |
| Diseños liberados | `status = liberado` (acumulado) | ✅ `/engineering` y `/dashboard` |
| Diseños aprobados | `approved_at` en el mes calendario | ✅ `/engineering` (no en dashboard general) |
| Diseños rechazados | Solicitud cancelada **o** rechazo de cliente | Parcial: se cuenta `cancelado`. El rechazo a `correcciones` no suma |

---

## KPI operativos adicionales (sí se calculan)

Útiles para el módulo; no sustituyen al set oficial.

### Solicitudes abiertas

Conteo cuyo estado no es `aprobado`, `liberado` ni `cancelado`. En `/dashboard` y `/engineering`.

### Solicitudes vencidas

Abiertas con `due_date < ahora`. En `/dashboard` y `/engineering`.

### Tiempo promedio de diseño

Promedio en días de (`released_at` o `approved_at` − `created_at`) en solicitudes que ya tienen una de esas fechas. Solo `/engineering`.

### Horas ingeniería (reales)

Suma de `hours_logged` en solicitudes no archivadas. Solo `/engineering`. Alimenta costeo futuro.

---

## Relación con Dirección

El tablero ejecutivo de piso (ADR-030 / ADR-043) lista ventas, cotizaciones, órdenes, entregas, material crítico y compras — **no** sustituye a estos KPI de diseño.

Dirección con `engineering:read` ya ve abiertas / vencidas / liberados en `/dashboard`. El resto oficial requiere incremento (cumplimiento, estimadas vs reales, errores, retrabajos) o entrar a `/engineering` (aprobados, rechazados, horas, tiempo promedio).
