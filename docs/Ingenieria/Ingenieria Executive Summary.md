# Resumen ejecutivo — Ingeniería y Diseño

**Para:** Dirección General, AMD México  
**Fecha:** 2026-08-14  
**Estado:** Fase 4 vigente — **implementada** en AMD Operations. Decisiones de Dirección (CAD, puesto, aprobaciones, nomenclatura, cobro, ECO, DFM, KPI) **documentadas** (ADR-036–042). Parte de esas decisiones **aún no está en código**.

---

## Por qué existe Ingeniería

AMD México no solo maquina un plano ajeno. Una parte del negocio **diseña o rediseña** la pieza (o reconstruye el CAD) y otra parte **fabrica**.

Hasta Fase 3 el sistema solo modelaba:

Cliente → RFQ → (pedido) → Producción.

Eso describe el caso «el cliente ya trajo el DXF». No describe «AMD tiene que diseñar, revisar, que el cliente firme, y recién entonces cotizar en firme y fabricar».

---

## Qué problemas resuelve

- Distinguir **fabricar** vs **diseñar**.
- No mandar a CNC un plano sin revisión ni sello de manufactura.
- Poder ver **horas reales** de ingeniería.
- Trazabilidad: cliente → RFQ → solicitud → plano Liberado → pedido (origen) → OP.

---

## Qué hay hoy en el sistema

- Módulo `/engineering` con solicitudes, estados, archivos CAD, horas reales y KPIs parciales.
- La RFQ indica tipo y si requiere ingeniería.
- Convertir a pedido **exige Liberado** cuando AMD diseña o validó el plano.
- El pedido nace con origen **RFQ directa** o **RFQ + Ingeniería**, listo para Fase 5.
- Liberado = **Aprobado para manufactura**.

Lo que **no** es este módulo: ni CAM embebido, ni PDM, ni portal del cliente, ni OEE, ni OP, ni ECO persistido, ni costeo completo (horas estimadas / tarifa).

---

## Decisiones de Dirección (2026-08-14)

| Tema | Decisión |
|---|---|
| CAD | SolidWorks; CAM Mastercam y Fusion 360; 2D AutoCAD |
| Puesto | Ingeniero de Diseño y Manufactura / Programador CNC |
| Firma interna | Líder de Ingeniería + Gerente de Operaciones |
| Firma cliente | Cliente, Ingeniería cliente, Calidad cliente — canal Ventas Técnicas |
| Versiones | `AMD-PART-XXXX_REV-A/B/C`; solo Liberado a piso |
| Cobro | A incluido / B diseño desde cero independiente / C inversa independiente |
| Cambios | ECO/ECN |
| DFM | Ingeniería + CAM + Jefe de Taller |

---

## Cómo impacta RFQ y Producción

- **Flujo A:** la conversión a pedido espera al diseño aprobado y liberado.
- **Flujo B:** la RFQ cotiza con el plano del cliente. Ingeniería solo si hay que validar.
- Producción (Fase 5) recibe planos/modelos/CAM **Liberados** o, en B, el adjunto de la RFQ. El modelo de piso (ADR-030/043) **no se reabre**.

---

## Listo para Fase 5

**Sí, condicionado.** El pedido ya trae origen y, si aplica, el id de la solicitud liberada. Falta OP, fecha prometida, DFM firmado por taller, nomenclatura validada en código y ECO. Eso no impide **iniciar** Producción usando `liberado` como sello de manufactura.

Auditoría: [[Auditoria Fase 4 Ingenieria]].
