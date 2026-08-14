# Proceso RFQ

Última actualización: 2026-08-13 (Fase 2 CRM).

# Objetivo

Recibir una solicitud de cotización, asociarla a un cliente y producir una cotización formal.

# Flujo General

```
Cliente (maestro CRM) ✅
    → Solicitud / RFQ ⬜
    → Cotización ⬜
    → Revisión / envío ⬜
    → Aprobación o rechazo ⬜
    → Conversión a pedido ⬜
```

**Hoy en el sistema:** solo existe el primer recuadro. Un vendedor puede crear o abrir el cliente y sus contactos. No puede capturar la RFQ ni la cotización.

# Responsables

| Rol | Hoy | Cuando exista Fase 3 |
|---|---|---|
| Ventas | Crea y mantiene cliente/contactos | Captura y da seguimiento a la cotización |
| Dirección | Consulta clientes | Consulta cotizaciones y márgenes |
| Administrador | Todo lo anterior | Todo lo anterior |

# Entradas

**Disponibles ahora:**

- Cliente (`customers`)
- Contacto (`contacts`), incluido el principal
- Notas e historial del cliente

**Aún no existen:** planos, cantidades, número de parte, archivos (R2).

# Salidas

Ninguna de cotización. Salida actual del tramo implementado: ficha de cliente persistida.

# Estados

Cliente: `activo` / `inactivo` / archivado.  
Estados de cotización: diseñados, no persistidos (Borrador, Enviada, En revisión, Aprobada, Rechazada, Expirada, Convertida).

# Reglas de negocio

1. Una cotización futura debe apuntar a un `customers.id` existente y no archivado.
2. El contacto de la cotización debería ser un `contacts.id` del mismo cliente.
3. No se muestran importes inventados en el dashboard.
4. Los clientes `is_demo = true` no son clientes reales de AMD.

# KPI relacionados

- Clientes activos (implementado en dashboard).
- Cotizaciones enviadas / vencidas / convertidas: no existen.

Ver [[crm]] y [[rfq]].
