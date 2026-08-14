# Proceso Producción

Última actualización: 2026-08-13.

# Objetivo

Convertir un pedido confirmado en órdenes de producción, asignar máquina y registrar avance.

# Flujo General

```
Pedido ⬜ → Orden de producción ⬜ → Operaciones ⬜ → Calidad ⬜ → Terminado ⬜
```

**Hoy:** el proceso no corre en AMD Operations. El cliente que recibirá la pieza ya puede existir en el CRM.

# Responsables

Diseñados: Producción, operador, Dirección.  
En el sistema, el rol Producción solo entra al dashboard.

# Entradas

Diseñadas: pedido, número de parte, cantidad, fecha, máquina, material.  
Ninguna está persistida.

# Salidas

Ninguna.

# Estados

Diseñados (Pendiente, Preparación, En producción, Pausada, Calidad, Terminada, Cancelada). No persistidos.

# Reglas de negocio

Definidas en Business Spec §§15–16 y 41. No ejecutables.

# KPI relacionados

Placeholders en dashboard: «Órdenes de producción · Fase 5», «Máquinas ocupadas · Fase 5».

Ver [[production]].
