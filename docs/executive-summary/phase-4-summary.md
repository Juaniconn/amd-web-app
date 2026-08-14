# Resumen ejecutivo — Fase 4

**Fecha:** 2026-08-14  
**Módulo:** Ingeniería y Diseño  
**Auditoría:** [[Auditoria Fase 4 Ingenieria]]

AMD Operations ya distingue fabricar vs diseñar. Existe `/engineering` con solicitudes, estados, archivos CAD, horas reales y KPIs parciales. Convertir a pedido exige plano **Liberado** (Aprobado para manufactura) cuando aplica. El pedido nace con origen RFQ directa o RFQ + Ingeniería.

Dirección validó CAD (SolidWorks / Mastercam / Fusion 360 / AutoCAD), el puesto de Ingeniero de Diseño y Manufactura / Programador CNC, aprobaciones, nomenclatura `AMD-PART-XXXX_REV-*`, cobro A/B/C, ECO, DFM y KPI oficiales. Eso está en ADR-036–043. **No todo está en código.**

**Fase 5 — Producción:** se puede iniciar, condicionada a consumir solo el paquete Liberado y a no crear OP de `diseno_solamente`.

No se implementó visor CAD, portal de cliente ni órdenes de producción.
