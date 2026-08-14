# Auditoría técnica — Fase 3 RFQ

Fecha: 2026-08-13  
Tipo: implementación + alineación documental. Verificar con `npm test`, `typecheck`, `lint`, `build`, `db:migrate`, `db:seed`, `db:verify`.

## Entregado

Cotizaciones persistidas, cálculo de dinero en servidor, RBAC `quotes:*`, archivos locales, conversión a pedido mínimo, KPIs de cotizaciones, ficha de cliente con listado real.

## Deuda cerrada en esta fase

- F2-01: snapshot Drizzle `0001_snapshot.json` materializado antes de `0002_quotes`.

## Deuda heredada (no bloqueante)

F2-02 tests de persistencia CRM, F2-04 seed DELETE de contactos demo, F2-07 redirect silencioso sin permiso.

## Defecto encontrado en smoke test (corregido)

`expireOverdueQuotes` pasaba un `Date` al driver `postgres` vía `sql\`\``. Rutas `/dashboard`, `/quotes`, ficha de cotización y ficha de cliente devolvían 500. Corregido con `lt` / `isNotNull`.

## Riesgos residuales

- Archivos locales no se comparten entre PCs de la LAN.
- Snapshot/journal deben permanecer UTF-8 sin BOM.
- `orders` existe sin UI; Fase 4 debe extender el esquema, no crear una tabla paralela.
- Documentos de `customer` / `order` están en el enum pero la API responde 403.
- README raíz puede quedar desfasado si no se actualiza con cada fase.

## Cloudflare

Sin `wrangler`, sin R2 runtime. ADR-002 y ADR-006 siguen siendo diseño de producción, no configuración del repo.
