# Changelog — Fase 4 Ingeniería y Diseño

Fecha: 2026-08-14  
Alcance: RFQ con tipo/ingeniería, solicitudes de ingeniería, archivos CAD, estados, horas, permisos, gate de conversión, origen de pedido.

## Funcionalidades

- Tipo de RFQ, flag Requiere Ingeniería, tipo y estado de ingeniería en cotizaciones.
- Módulo `/engineering`: alta, ficha, edición, cancelación, asignación, aprobación, liberación.
- 1 RFQ → 0..1 solicitud activa (ADR-033). Auto-creación al guardar RFQ que requiere diseño.
- Archivos PDF/DWG/DXF/STEP/STP/IGES/PNG/JPG/ZIP (máx. 50 MB).
- Horas de ingeniería y KPIs (abiertas, vencidas, aprobados, rechazados, liberados, horas, tiempo promedio).
- Rol RBAC Ingeniería y permisos `engineering:*`.
- Convertir a pedido exige `Liberado` si la RFQ requiere ingeniería (ADR-034).
- `orders.origin` = RFQ directa \| RFQ + Ingeniería (ADR-035).

## Entidades

`engineering_requests`, `engineering_hours`. Columnas nuevas en `quotes` y `orders`. Extensión de `documents`, `activity_logs`.

## Migraciones

- `0003_engineering`.

## Fuera de alcance

Visor CAD, PDM, portal del cliente, CAM, UI de pedidos, órdenes de producción, R2.
