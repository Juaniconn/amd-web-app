# Flujo Ingeniería

Última actualización: 2026-08-14.  
Fase 4 **implementada**. Decisiones Dirección 2026-08-14: ADR-036 a ADR-042.

Ver [[Proceso Ingenieria]], [[Estados Ingenieria]], [[Tipos de Proyecto]], [[Control Documental]], [[Costeo Ingenieria]], [[ECO ECN]], ADR-031, ADR-033, ADR-034.

---

## Cadena

```
Solicitud Ingeniería
    ↓
Asignación
    ↓
Diseño (SolidWorks / AutoCAD)
    ↓
Revisión Interna + DFM
    (Ingeniería + CAM + Jefe de Taller)
    ↓
Aprobación interna
    (Líder de Ingeniería + Gerente de Operaciones)
    ↓
Envío al cliente
    (Ejecutivo de Ventas Técnicas)
    ↓
Aprobación Cliente
    (Cliente / Ingeniería cliente / Calidad cliente)
    ↓
Liberación = Aprobado para manufactura
    ↓
Producción  (planos, modelos, programas CAM Liberados)
```

Puente comercial persistido:

```
RFQ ✅ → Ingeniería (si aplica) ✅ → pedido mínimo ✅ → OP ⬜
```

Este flujo **corre** en `/engineering`. En escenario B (plano del cliente) varios pasos se reducen a DFM / validación de manufactura.

CAD/CAM **no** corre en el ERP. Herramientas: SolidWorks, Mastercam, Fusion 360, AutoCAD.

---

## 1. Solicitud Ingeniería

Nace desde RFQ/Ventas cuando:

- el cliente pide diseño nuevo, modificación, reverse engineering, prototipo; o
- el plano entregado no basta y hace falta validar manufactura.

Entidad: **Engineering Request** (`engineering_requests`).  
Estado inicial: `Pendiente`. Número `ING-YYYY-NNNNN`.

Cobro A/B/C: [[Costeo Ingenieria]].

---

## 2. Asignación

Se asigna al **Ingeniero de Diseño y Manufactura / Programador CNC** (usuario registrado, rol `ingenieria` u otro).  
Estado: `Asignado`. Permiso `engineering:assign`.

---

## 3. Diseño

El ingeniero produce o modifica CAD (SolidWorks / AutoCAD) y, cuando aplica, el enfoque CAM (Mastercam / Fusion 360).  
Horas reales se capturan. Horas estimadas: campo oficial, no persistido.  
Estado: `Diseñando`.  
Archivos: exportados con nomenclatura `AMD-PART-XXXX_REV-*` ([[Control Documental]]). PDM ⬜.

---

## 4. Revisión interna + DFM (obligatoria)

Estado: `Revisión Interna`.

Participan (ADR-041):

- Ingeniería
- Programación CAM (mismo puesto en planta)
- Jefe de Taller (consulta; rol `produccion`)

Rechazo interno → `Correcciones` → `Diseñando`.

Aprobación interna de proceso (ADR-037): Líder de Ingeniería y Gerente de Operaciones. En MVP no hay doble firma en BD.

---

## 5. Envío y aprobación del cliente

Canal: **Ejecutivo de Ventas Técnicas**. No hay portal.

Estado: `Esperando Cliente`.

Actores externos: Cliente, Ingeniería del cliente, Calidad del cliente.

Acepta → `Aprobado`. Pide cambios → `Correcciones`.

---

## 6. Liberación (Aprobado para manufactura)

Ingeniería marca `Liberado` (`engineering:release`). Equivale a **Aprobado para manufactura** (ADR-038).

Ese paquete (planos + modelos + programas CAM, revisión vigente) es el que puede:

- cerrar **cotización final** (flujo A);
- desbloquear **convertir a pedido**;
- alimentar **Producción** (Fase 5).

La liberación queda en `activity_logs` (`released`). Archivos congelados.

---

## 7. Producción

OP según ADR-025/030/043 y [[Rutas de Fabricacion]].  
Sin `Liberado` en flujo A, no hay pedido y por tanto no hay OP. Origen: [[Origen Orden Produccion]].  
Tiempos muertos de piso ligados a este flujo: Espera de programa, Espera de plano.

---

## 8. Cambio posterior (ECO / ECN)

Si el diseño ya está Liberado:

```
Solicitud cambio → Impacto → Costo → Tiempo → Aprobación cliente → Nueva revisión Liberada
```

Detalle: [[ECO ECN]]. No reabrir `liberado`.

---

## Decisiones validadas (cerrado)

Las preguntas que estaban abiertas en este archivo quedaron respondidas por Dirección (2026-08-14):

| Pregunta | Decisión |
|---|---|
| Software CAD | SolidWorks; CAM Mastercam y Fusion 360; 2D AutoCAD |
| Quién diseña | Ingeniero de Diseño y Manufactura / Programador CNC |
| Aprobación interna | Líder de Ingeniería + Gerente de Operaciones |
| Aprobación cliente | Cliente, Ingeniería cliente, Calidad cliente, canal Ventas Técnicas |
| Revisiones | `AMD-PART-XXXX_REV-A/B/C`; solo Liberado a piso |
| Cobro de horas | Incluido / independiente (A/B/C) + tipo tarifa; [[Costeo Ingenieria]] |
| Cambios post-aprobado | ECO/ECN |
