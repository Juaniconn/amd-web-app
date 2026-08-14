# Resumen ejecutivo — Fase 2 CRM

**Para:** Dirección General, AMD México  
**Fecha:** 13 de agosto de 2026  
**Estado:** Completada

---

## Qué se construyó

AMD Operations ya permite administrar la cartera de clientes de forma digital:

- Alta, consulta, edición y archivo de empresas.
- Varios contactos por cliente, con un contacto principal.
- Historial de quién cambió qué.
- Distinción clara entre datos **DEMO** y datos reales.

La plataforma sigue siendo interna. Se entra con usuario y contraseña. Ventas puede operar el CRM; Dirección puede consultarlo; Compras, Producción, Calidad y Almacén no ven el módulo.

---

## Qué valor aporta a AMD México

Hoy AMD no tiene ERP. El CRM es el primer registro maestro compartido:

- Una sola ficha por cliente (RFC, ciudad, tipo, estado).
- Contactos de compras, calidad o ingeniería en el mismo lugar.
- Base lista para cotizar sin volver a capturar al cliente.

Eso reduce retrabajo cuando arranque cotizaciones (Fase 3).

---

## Qué procesos impacta

| Proceso | Impacto actual |
|---|---|
| RFQ / ventas | El cliente ya existe como entrada del flujo. Aún no hay cotización en el sistema. |
| Producción, compras, calidad, entregas, facturación | Sin cambio operativo. El maestro de clientes ya está disponible para cuando esos módulos existan. |

---

## Qué riesgos existen

- El seed de demostración, si se vuelve a ejecutar, puede borrar contactos agregados a clientes DEMO.
- Aún no hay cotizaciones, pedidos ni números de venta. El dashboard no muestra dinero operativo.
- La documentación de Cloudflare (R2, Workers) es de diseño; **no hay hosting Cloudflare en producción**.
- Los tests automáticos cubren reglas, no el flujo completo de un usuario.

Ninguno de estos riesgos impide usar el CRM con un operador a la vez.

---

## Qué sigue después

**Fase 3 — Cotizaciones:** partidas, precios, margen, estados y, más adelante, archivos (planos, PDF) en almacenamiento de objetos.

Hasta que eso exista, el flujo «cliente → cotización → pedido → producción» no puede cerrarse en el sistema.

---

## Lectura relacionada

- [[roadmap]]
- [[crm]]
- [[phase-2-audit]]
- [[Proceso RFQ]]
