# Compras

# Objetivo

Proveedores, solicitudes, órdenes de compra y recepciones que actualicen inventario.

# Alcance

**No implementado.** Fase 7.  
No hay `suppliers`, `purchase_requests`, `purchase_orders`, `receipts`.  
`/purchasing` y `/suppliers` deshabilitados.

# Flujo de negocio

Diseñado. No ejecutable.

# Entidades

Ninguna.

# Permisos

No hay `purchasing:*`. El rol Compras solo tiene `dashboard:read`.

# APIs

Ninguna.

# Pantallas

Ninguna.

# Estados

Diseñados en Business Spec §§23–24.

# Relaciones

Pendientes de inventario y, en el futuro, de cliente/pedido solo de forma indirecta.

# Riesgos

No aplica.

# Dependencias

Inventario (Fase 6). El maestro de clientes (Fase 2) no es requisito de compras.
