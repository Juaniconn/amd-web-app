# Inventario

# Objetivo

Materiales, existencias, reservas, movimientos y alertas de stock.

# Alcance

**No implementado.** Fase 6.  
No hay tablas `materials`, `inventory`, `inventory_movements`, `material_reservations`.  
`/inventory` deshabilitado.

# Flujo de negocio

Diseñado (ADR-009: ningún cambio silencioso de existencias). No ejecutable.

# Entidades

Ninguna.

# Permisos

No hay `inventory:*`. El rol Almacén solo tiene `dashboard:read`.

# APIs

Ninguna.

# Pantallas

Ninguna.

# Estados

Diseñados: disponible = existencia − reservado; crítico / sin existencia.

# Relaciones

Pendientes de producción y compras.

# Riesgos

No aplica.

# Dependencias

Fase 1. Se consume desde producción y compras.
