# RFQ / Cotizaciones

# Objetivo

Gestionar solicitudes de cotización (RFQ), partidas, costos, margen, estados, archivos, tipo (fabricación vs diseño) y conversión a pedido mínimo.

# Alcance

**Implementado (Fase 3 + 4) ✅:**

- Cotizaciones (`quotes`) — la RFQ es la cotización en `borrador` (ADR-024)
- Tipo RFQ, Requiere Ingeniería, tipo y estado de ingeniería
- Partidas (`quote_items`) con subtotal, IVA (default 16 %), total, costo, utilidad y margen
- Estados: Borrador, En revisión, Enviada, Aprobada, Rechazada, Expirada, Convertida
- Archivos (`documents` + storage local, ADR-022)
- Conversión a pedido mínimo con origen (ADR-023, ADR-034, ADR-035)
- Historial en `activity_logs`
- KPIs de cotizaciones e ingeniería en el listado RFQ
- Listado de cotizaciones en la ficha de cliente

**No implementado:**

- Correo al marcar enviada
- PDF generado
- R2 en runtime
- Vista `/orders`
- Orden de producción al convertir
- Flag cliente estratégico en CRM (definición ADR-043)
- Línea de costeo de ingeniería (ADR-039)

# Flujo de negocio

Definido en [[Proceso RFQ]]. No duplicar el proceso aquí.

# Entidades

`quotes`, `quote_items`, `documents`, `orders`, `order_items`. Relación 0..1 con `engineering_requests`.

# Permisos

| Permiso | Quién |
|---|---|
| `quotes:read` | Administrador, Dirección, Ventas |
| `quotes:write` | Administrador, Ventas |

# APIs

Server Actions en `src/server/actions/quotes.ts`. Descarga: `GET /api/documents/[id]`.

# Pantallas

`/quotes`, `/quotes/new`, `/quotes/[id]`, `/quotes/[id]/edit`

# Dependencias

Requiere [[crm]]. ADR-022, ADR-023, ADR-024, ADR-034, ADR-035. Pedidos UI diferida (ADR-026). Ingeniería [[engineering]]. La OP es Fase 5 y **no** se crea al convertir (ADR-025).
