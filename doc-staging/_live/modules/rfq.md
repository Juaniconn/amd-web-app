# RFQ / Cotizaciones

# Objetivo

Gestionar solicitudes de cotización (RFQ), partidas, costos, margen, estados, archivos y conversión a pedido mínimo.

# Alcance

**Implementado (Fase 3) ✅:**

- Cotizaciones (`quotes`) — la RFQ es la cotización en `borrador` (ADR-024)
- Partidas (`quote_items`) con subtotal, IVA (default 16 %), total, costo, utilidad y margen
- Estados: Borrador, En revisión, Enviada, Aprobada, Rechazada, Expirada, Convertida
- Archivos (`documents` + storage local, ADR-022)
- Conversión a pedido mínimo (`orders` / `order_items`, ADR-023)
- Historial en `activity_logs`
- KPIs de cotizaciones en dashboard
- Listado de cotizaciones en la ficha de cliente

**No implementado:**

- Correo al marcar enviada
- PDF generado
- R2 en runtime
- Vista `/orders`
- Orden de producción al convertir

# Flujo de negocio

Definido en [[Proceso RFQ]]. No duplicar el proceso aquí.

# Entidades

`quotes`, `quote_items`, `documents`, `orders`, `order_items`

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

Requiere [[crm]]. ADR-022, ADR-023, ADR-024. La vista completa de pedidos es Fase 4.
