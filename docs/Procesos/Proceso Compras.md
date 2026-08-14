# Proceso Compras

Última actualización: 2026-08-13.

# Objetivo

Cubrir faltantes de material: solicitud → orden de compra → recepción → inventario.

# Flujo General

```
Faltante ⬜ → Solicitud ⬜ → OC ⬜ → Recepción ⬜ → Inventario ⬜
```

**Hoy:** no implementado. El CRM no cambia este flujo.

# Responsables

Diseñados: Compras, Almacén. En el sistema solo tienen `dashboard:read`.

# Entradas

Ninguna persistida.

# Salidas

Ninguna.

# Estados

Diseñados en Business Spec §§23–25. No persistidos.

# Reglas de negocio

Una recepción debe generar movimiento de inventario (ADR-009). No ejecutable.

# KPI relacionados

Placeholders: «Material por comprar · Fase 6».

Ver [[purchasing]] e [[inventory]].
