# Tipos de Proyecto (Ingeniería)

Última actualización: 2026-08-14.  
Catálogo semilla persistido como enum `quote_engineering_type` / `project_type`. El administrador **no** puede ampliarlo aún (haría falta migración).

Ver [[Proceso Ingenieria]], [[Flujo Ingenieria]].

---

## Diseño nuevo

El cliente no entrega plano usable. AMD crea el CAD desde brief, muestra o especificación.

Escenario A. Ingeniería **obligatoria** antes de cotización final y OP.

---

## Modificación

El cliente (o AMD) parte de un diseño existente y pide cambios (cotas, material, features).

Puede nacer de una RFQ nueva o de un plano ya liberado (cambio de ingeniería = [[ECO ECN]], nueva `REV`).

---

## Reverse engineering

Se parte de una pieza física o de un plano incompleto para reconstruir CAD.

Horas de ingeniería suelen ser altas; cobro **independiente** (escenario cobro C, ADR-039). Tipo tarifa fija o por hora. Campos de costeo: [[Costeo Ingenieria]].

---

## Optimización

Rediseño para fabricabilidad, costo o desempeño, sin cambiar la función de negocio del cliente.

Solapa con validación de manufactura; se documenta como tipo propio para reportes.

---

## Validación de manufacturabilidad

El cliente **sí** trae plano (escenario flujo B, cobro A). Ingeniería no diseña de cero: DFM (ADR-041) confirma que AMD puede fabricarlo (centros, tolerancias, material, CAM).

Puede ser el único paso de ingeniería en B. Si falla, puede convertirse en Modificación o Diseño nuevo.

---

## Prototipo

Pieza o ensamble de verificación (CNC, 3D Ultimaker S5, lámina, etc.) antes de producción de volumen.

Puede usar el centro Prototipado ([[Centros de Trabajo]]) **después** de `Liberado`. El prototipo de piso es Producción; el CAD del prototipo es Ingeniería.

---

No inventar tipos por industria (automotriz, médico, etc.) hasta que Dirección los pida.
