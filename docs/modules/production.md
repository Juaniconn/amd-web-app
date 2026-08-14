# Producción

# Objetivo

Órdenes de producción, operaciones, centros de trabajo, máquinas, avance y tiempos.

# Alcance

**No implementado en código.** Fase **5** vigente (ADR-032). Documentación de piso lista y modelo validado (ADR-030). Ingeniería (Fase 4) **ya está implementada**; este módulo puede arrancar encima de `orders.origin`.

No hay tablas `production_orders`, `production_operations`, `work_centers`, `machines`.  
`/production` y `/machines` están en el sidebar **deshabilitados** (etiqueta «Fase 5», coincidente con el plan).

Diseño listo en [[Proceso Producción]], [[Centros de Trabajo]], [[Maquinas]], [[Rutas de Fabricacion]], [[Estados Produccion]], [[Flujo Orden Produccion]], [[Operadores y Roles]], [[KPI Produccion]], [[Pendiente Validacion Direccion]] (✅ validado ADR-030), [[Produccion Executive Summary]].

Entrada de ingeniería: [[Proceso Ingenieria]], [[Control Documental]]. En escenario A la OP espera plano `Liberado` = Aprobado para manufactura (ADR-031, ADR-038).

# Flujo de negocio

Diseñado; no ejecutable. ADR-025: la OP nace del pedido mínimo. Cadena: RFQ → **Ingeniería** (A obligatoria / B opcional) → Planeación → Centro → Máquina → Operador → Producción → Calidad → Entrega.

Hoy `convertQuoteToOrder` no emite OP. Sí graba `orders.origin` y `engineering_request_id`.

# Entidades

Ninguna persistida de producción.

Entrada comercial ya persistida: `orders`, `order_items` (estado `nuevo`; `origin` = `rfq_directa` \| `rfq_ingenieria`).

Entidades previstas en TECHNICAL_SPEC §10: `production_orders`, `production_operations`, `work_centers`, `machines`. No hay migración.

# Permisos

No hay `production:*` ni los cinco permisos operativos (Autorizar Producción, Liberar Material, Programar Máquinas, Liberar Calidad, Cerrar Orden). El rol Producción tiene `dashboard:read` y `engineering:read`. Ver ADR-029, ADR-043.

# APIs

Ninguna. Server Actions existentes de negocio: `customers.ts`, `quotes.ts`, auth. No hay `production.ts`.

# Pantallas

Ninguna. Placeholder en ficha de cliente: «Órdenes de producción · Fase 5». Placeholder en dashboard: mismas etiquetas.

# Estados

Diseñados en [[Estados Produccion]]. No persistidos. No confundir con `quote_status` ni con `order_status = nuevo`.

# Relaciones

```
customers ✅ → quotes ✅ → orders ✅ → production_orders ⬜
                 ↘ engineering_requests ✅  (plano Liberado en escenario A)
production_orders ⬜ → work_centers / machines ⬜
production_orders ⬜ → material (inventario) ⬜
production_orders ⬜ → quality_inspections ⬜
production_orders ⬜ → deliveries ⬜
```

# Riesgos

- Numeración: un agente que solo lea BUSINESS_SPEC §47 implementará Pedidos UI. Debe leer ADR-032, ADR-026 (reemplazada en numeración) y [[roadmap]]. Ingeniería es Fase 4; este módulo es Fase 5.
- Inventar capacidades de máquina: prohibido (§17).
- Crear OP desde `aprobada` sin conversión: contradice ADR-025.
- Crear OP en escenario A sin plano `Liberado`: contradice ADR-031.
- Descontar inventario en Fase 5: no hay existencias; violaría ADR-009 si se simula.

# Dependencias

- Requiere [[crm]] y [[rfq]] (✅), pedido mínimo (ADR-023) e [[engineering]] (✅ Fase 4).
- Inventario ([[inventory]], Fase 6) para reservas y consumo.
- Compras ([[purchasing]], Fase 7) para faltantes.
- Calidad ([[quality]], Fase 8) y Entregas ([[shipping]], Fase 9).

ADR-025, ADR-026, ADR-027, ADR-028, ADR-029, ADR-030, ADR-038, ADR-043.
