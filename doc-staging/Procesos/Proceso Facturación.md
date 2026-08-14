# Proceso Facturación

Última actualización: 2026-08-13.

# Objetivo

Control operativo de venta, saldo y cobro. **No** es contabilidad fiscal (Business Spec §30).

# Flujo General

```
Pedido cerrado ⬜ → Registro de venta ⬜ → Pago ⬜ → Saldo ⬜
```

**Hoy:** no implementado. La ficha de cliente reserva espacio «Facturación / ventas» y «Pagos» como pendientes, sin cifras.

# Responsables

Diseñados: Dirección, Ventas. Sin módulo ni permisos `billing:*`.

# Entradas

Ninguna persistida. El cliente (RFC, razón social) ya vive en el CRM y será entrada futura.

# Salidas

Ninguna.

# Estados

No definidos en código.

# Reglas de negocio

La contabilidad fiscal permanece fuera de AMD Operations. No hay CFDI ni integración SAT.

# KPI relacionados

Ninguno real. El dashboard no muestra ventas ni cuentas por cobrar.

Ver [[crm]] (maestro de cliente) y Business Spec §§29–30.
