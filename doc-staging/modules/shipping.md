# Entregas / Shipping

# Objetivo

Registrar entregas de pedidos: guía, transportista, evidencia, estado.

# Alcance

**No implementado.** Fase **9** vigente (ADR-032). En BUSINESS_SPEC §47 iba junto con calidad.  
No hay tabla `deliveries`. `/deliveries` deshabilitado.

# Flujo de negocio

Diseñado. No ejecutable.

# Entidades

Ninguna.

# Permisos

Ninguno específico.

# APIs

Ninguna.

# Pantallas

Placeholder en dashboard: «Entregas próximas · Fase 8».

# Estados

Diseñados: Pendiente, Preparando, Enviado, Entregado, Incidencia.

# Relaciones

Pendientes de pedido y cliente (el cliente ya existe en Fase 2).

# Riesgos

No aplica.

# Dependencias

Pedido mínimo (ADR-023) + OP terminada/liberada ([[production]], [[Proceso Calidad]]). Cliente ([[crm]]) ya disponible. UI de pedidos diferida.
