-- Migración 0021 — Nomenclatura de folios de número de parte (ADR-062)
--
-- CONTEXTO
-- La OT es la orden de trabajo comercial (`orders`, AMD-YYYY-NNNNN), que nace
-- al convertir una cotización. Cada número de parte de esa OT vive como una
-- fila en `production_orders`. Hasta ahora su folio usaba el prefijo `OT-`,
-- con lo que el mismo término nombraba dos entidades distintas: el dashboard
-- llegaba a mostrar "OT activas 0" y "Órdenes de trabajo activas 1" a la vez.
--
-- NOMENCLATURA NUEVA
--   OT (orders)             AMD-2026-00001
--   NP (production_orders)  NP-AMD-2026-00001-01
--
-- El folio conserva el número de la OT, así que la trazabilidad no se pierde:
-- NP-AMD-2026-00001-01 se lee como "número de parte 01 de la OT AMD-2026-00001".
--
-- ALCANCE
-- Solo se reescribe el prefijo `OT-`. Los folios históricos `OP-` NO se tocan
-- (ADR-047: el histórico se conserva). Migración idempotente: al segundo pase
-- no queda ningún folio `OT-` que reescribir.

-- 1) Reescribir folios con prefijo OT- a NP-
UPDATE production_orders
SET number = 'NP-' || substring(number from 4),
    updated_at = now()
WHERE number LIKE 'OT-%';

-- 2) Dejar rastro en el log de actividad de cada folio migrado
INSERT INTO activity_logs (
  id, action, entity_type, entity_id, summary, created_at
)
SELECT
  gen_random_uuid()::text,
  'updated'::activity_action,
  'production_order'::activity_entity_type,
  po.id,
  'Folio migrado a nomenclatura NP- (ADR-062)',
  now()
FROM production_orders po
WHERE po.number LIKE 'NP-%';
