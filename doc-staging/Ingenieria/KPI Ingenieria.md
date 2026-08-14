# KPI Ingeniería

Última actualización: 2026-08-14.

Se calculan en `/engineering` y, resumidos (abiertas / vencidas / liberados), en el dashboard general si el usuario tiene `engineering:read`.

Código: `getEngineeringDashboardStats`. No confundir con KPI de piso ([[KPI Produccion]]) ni con cotizaciones abiertas.

No se muestran ceros fingidos: si no hay solicitudes, el número es 0 real.

---

## Solicitudes abiertas

Conteo cuyo estado no es `aprobado`, `liberado` ni `cancelado`.

---

## Solicitudes vencidas

Abiertas con `due_date < ahora`.

---

## Tiempo promedio de diseño

Promedio en días de (`released_at` o `approved_at` − `created_at`) en solicitudes que ya tienen una de esas fechas.

---

## Horas ingeniería

Suma de `hours_logged` en solicitudes no archivadas.

Alimenta costeo futuro. Hoy el costo estimado de cotización no separa diseño vs máquina.

---

## Diseños aprobados

Solicitudes con `approved_at` en el mes calendario en curso.

---

## Diseños rechazados

Estado `cancelado`. Distinto de `correcciones` (sigue viva).

---

## Diseños liberados

Estado `liberado` (acumulado). El pedido convertido ligado se verá en Fase 5 vía `orders.engineering_request_id`.

---

## Relación con Dirección

El tablero ejecutivo de piso (ADR-030) no lista KPI de ingeniería. Dirección ya ve abiertas / vencidas / liberados en el dashboard de AMD Operations.
