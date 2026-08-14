# Changelog — Fase 3 Cotizaciones / RFQ

Fecha: 2026-08-13  
Alcance: cotizaciones, partidas, costos/margen, estados, archivos locales, conversión a pedido mínimo.

## Funcionalidades

- Listado, alta, ficha y edición de cotizaciones.
- Partidas con IVA, descuento, costo estimado, utilidad y margen.
- Máquina de estados RFQ.
- Archivos adjuntos (storage local, descarga autenticada).
- Conversión a pedido mínimo; `/orders` sigue deshabilitado.
- Seed de 15 cotizaciones DEMO.
- Permisos `quotes:read` / `quotes:write`.
- KPIs de cotizaciones en dashboard.

## Entidades

`quotes`, `quote_items`, `documents`, `orders`, `order_items`. Enums de estado, moneda, documentos y extensión de `activity_logs`.

## Migraciones

- Snapshot Drizzle `0001` materializado (deuda F2-01).
- `0002_quotes`.

## Fuera de alcance

Correo, PDF generado, R2 en producción, vista completa de pedidos, notificaciones, búsqueda global.

## Correcciones posteriores al cierre

- `expireOverdueQuotes` interpolaba un `Date` en SQL (`postgres` driver). Se cambió a operadores Drizzle `lt` / `isNotNull`. Dashboard, listado y fichas de cotización dejaron de devolver 500.
