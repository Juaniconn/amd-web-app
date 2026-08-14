# Resumen ejecutivo — Ingeniería y Diseño

**Para:** Dirección General, AMD México  
**Fecha:** 2026-08-14  
**Estado:** Fase 4 vigente — **implementada** en AMD Operations.

---

## Por qué existe Ingeniería

AMD México no solo maquina un plano ajeno. Una parte del negocio **diseña o rediseña** la pieza (o reconstruye el CAD) y otra parte **fabrica**.

Hasta Fase 3 el sistema solo modelaba:

Cliente → RFQ → (pedido) → Producción.

Eso describe el caso «el cliente ya trajo el DXF». No describe «AMD tiene que diseñar, revisar, que el cliente firme, y recién entonces cotizar en firme y fabricar».

---

## Qué problemas resuelve

- Distinguir **fabricar** vs **diseñar**.
- No mandar a CNC un plano sin revisión ni firma del cliente.
- Poder ver **horas de ingeniería**.
- Dejar trazabilidad: cliente → RFQ → solicitud de ingeniería → plano liberado → pedido (origen) → OP.

---

## Qué hay hoy en el sistema

- Módulo `/engineering` con solicitudes, estados, archivos CAD, horas y KPIs.
- La RFQ indica tipo y si requiere ingeniería.
- Convertir a pedido **exige Liberado** cuando AMD diseña o validó el plano.
- El pedido nace con origen **RFQ directa** o **RFQ + Ingeniería**, listo para Fase 5.

Lo que **no** es este módulo: ni CAM de máquina, ni PDM completo, ni portal del cliente, ni OEE, ni órdenes de producción.

---

## Cómo impacta RFQ

- **Escenario A:** la conversión a pedido espera al diseño aprobado y liberado.
- **Escenario B:** la RFQ sigue cotizando con el plano del cliente. Ingeniería solo si hay que validar.

---

## Cómo impacta Producción

Producción (Fase 5) recibe un plano **liberado** o, en B, el adjunto de la RFQ. El modelo de piso ya aprobado (quién programa, prioridades, horas máquina) **no se reabre**. Ingeniería no programa VMC ni press brake.

---

## Decisión registrada

Ingeniería es etapa **obligatoria cuando AMD diseña** y **opcional cuando el cliente entrega plano** (ADR-031). Cardinalidad 1 RFQ → 0..1 solicitud (ADR-033). Gate Liberado (ADR-034). Origen de pedido (ADR-035).

---

## Pendiente Validación AMD México

Preguntas abiertas. No inventar respuestas. Detalle en [[Flujo Ingenieria]].

- Software CAD utilizado
- Quién diseña actualmente
- Quién aprueba diseños internamente vs frente al cliente
- Cómo se almacenan revisiones (hoy: archivos en la solicitud, sin PDM)
- Cómo se cobran horas de ingeniería
- Cómo se gestionan cambios del cliente después de aprobado
