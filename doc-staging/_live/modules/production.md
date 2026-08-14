# Producción

# Objetivo

Órdenes de producción, operaciones, máquinas, avance y tiempos.

# Alcance

**No implementado.** Fase 5.  
No hay tablas `production_orders`, `production_operations`, `work_centers`, `machines`.  
`/production` y `/machines` están en el sidebar deshabilitados.

# Flujo de negocio

Diseñado. No ejecutable. Requiere el módulo Pedidos (Fase 4). La conversión RFQ ya puede persistir un pedido mínimo; este módulo no lo consume.

# Entidades

Ninguna.

# Permisos

No hay `production:*`. El rol Producción solo tiene `dashboard:read`.

# APIs

Ninguna.

# Pantallas

Ninguna. Placeholder en ficha de cliente: «Órdenes de producción · Fase 5».

# Estados

Diseñados en Business Spec §15. No persistidos.

# Relaciones

Pendientes de pedido, cliente, máquina y material.

# Riesgos

No aplica hasta Fase 5.

# Dependencias

[[crm]] (cliente), pedido mínimo de Fase 3 / vista de pedidos Fase 4, inventario (Fase 6) para reservas.
