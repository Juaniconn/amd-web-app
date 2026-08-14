# RFQ / Cotizaciones

# Objetivo

Gestionar cotizaciones, partidas, costos, margen y conversión a pedido.

# Alcance

**No implementado.** Fase 3.  
No existen tablas `quotes` / `quote_items`, ni rutas `/quotes`, ni acciones.

La ficha de cliente muestra un recuadro «Cotizaciones · Pendiente · Fase 3» sin datos.

# Flujo de negocio

Diseñado (Business Spec §§9–12), no ejecutable en el sistema:

Cliente (✅ existe) → Cotización ⬜ → Aprobación ⬜ → Pedido ⬜

# Entidades

Ninguna en PostgreSQL.

# Permisos

No hay `quotes:*`. Ventas tiene `customers:write` como preparación.

# APIs

Ninguna.

# Pantallas

`/quotes` está en el sidebar deshabilitado.

# Estados

Diseñados, no persistidos: Borrador, Enviada, En revisión, Aprobada, Rechazada, Expirada, Convertida en pedido.

# Relaciones

Cuando se implemente: `quotes.customer_id` → `customers.id` (Fase 2).  
Contacto de cotización debería apuntar a `contacts`.

# Riesgos

Empezar Fase 3 sin el snapshot Drizzle 0001 puede generar una migración conflictiva.

# Dependencias

Requiere [[crm]]. Bloquea [[production]] y pedidos. Archivos (R2) son parte del alcance de Fase 3 según el plan técnico; **R2 no está configurado**.
