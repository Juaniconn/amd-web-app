# Flujo Ingeniería

Última actualización: 2026-08-14.  
Fase 4 **implementada**.

Ver [[Proceso Ingenieria]], [[Estados Ingenieria]], [[Tipos de Proyecto]], ADR-031, ADR-033, ADR-034.

---

## Cadena

```
Solicitud Ingeniería
    ↓
Asignación
    ↓
Diseño
    ↓
Revisión Interna
    ↓
Validación Manufactura
    ↓
Aprobación Cliente
    ↓
Liberación
    ↓
Producción
```

Puente comercial persistido:

```
RFQ ✅ → Ingeniería (si aplica) ✅ → pedido mínimo ✅ → OP ⬜
```

Este flujo **corre** en `/engineering`. En escenario B (plano del cliente) varios pasos pueden omitirse o reducirse a Validación Manufactura.

---

## 1. Solicitud Ingeniería

Nace desde RFQ/Ventas cuando:

- el cliente pide diseño nuevo, modificación, reverse engineering, prototipo; o
- el plano entregado no basta y hace falta validar manufactura.

Entidad: **Engineering Request** (`engineering_requests`).  
Estado inicial: `Pendiente`. Número `ING-YYYY-NNNNN`.

---

## 2. Asignación

Supervisor de Ingeniería asigna un **Ingeniero Diseño** (usuario registrado, rol `ingenieria` u otro).  
Estado: `Asignado`. Permiso `engineering:assign`.

---

## 3. Diseño

El ingeniero produce o modifica CAD. Horas de ingeniería se capturan (inicio/fin o total).  
Estado: `Diseñando`.  
Archivos: revisiones; almacenamiento de versiones ⬜ pendiente de validación.

---

## 4. Revisión interna

Supervisor (u otro ingeniero) revisa el diseño.  
Estado: `Revisión Interna`.  
Rechazo interno → `Correcciones` → `Diseñando`.

---

## 5. Validación de manufactura

Producción (y si aplica Calidad) confirma que se puede fabricar con centros/máquinas de AMD ([[Centros de Trabajo]]).  
No es una OP. No programa máquinas (eso es Fase 5, Supervisor de Producción, ADR-030).

---

## 6. Aprobación cliente

Se envía el plano al cliente (canal ⬜). Estado: `Esperando Cliente`.  
Acepta → `Aprobado`. Pide cambios → `Correcciones`.

No hay portal de cliente.

---

## 7. Liberación

Ingeniería marca `Liberado` (`engineering:release`). Ese paquete (plano + revisión) es el que puede:

- cerrar **cotización final** (escenario A);
- desbloquear **convertir a pedido**;
- alimentar **Producción** (Fase 5).

La liberación queda en `activity_logs` (`released`).

---

## 8. Producción

OP según ADR-025/030 y [[Rutas de Fabricacion]].  
Sin `Liberado` en escenario A, no hay pedido y por tanto no hay OP. Origen: [[Origen Orden Produccion]].

---

## Pendiente Validación AMD México

Marcado ⬜. No inventar respuestas.

- ¿Qué software CAD se usa en planta (SolidWorks, AutoCAD, Inventor, otro)?
- ¿Quién diseña hoy (puesto, personas se cubren con usuarios; no nombres en la spec)?
- ¿Quién aprueba diseños internamente vs frente al cliente?
- ¿Cómo se almacenan revisiones (carpetas, PDM, solo PDF en cotización)?
- ¿Cómo se controla la versión del plano que baja a piso?
- ¿Cómo se cobran las horas de ingeniería (partida de cotización, tarifa, incluido en pieza)?
- ¿Cómo se gestionan cambios del cliente después de aprobado (NCR de diseño, nueva RFQ, revision)?
