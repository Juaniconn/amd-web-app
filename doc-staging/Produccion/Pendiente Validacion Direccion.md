# Validación Dirección — Modelo Operativo Producción

Última actualización: 2026-08-14.  
Archivo: `Pendiente Validacion Direccion.md` (el nombre de archivo se conserva por los wikilinks existentes).

**Estado: Validado y aprobado por Dirección General, AMD México.**  
Aplicación: modelo operativo de **Producción** (ADR-030). Numeración vigente: Producción = **Fase 5** (ADR-032).  
**No implementado en código.** No reabrir estas reglas. Ingeniería (Fase 4) no cambia programación de piso.

Los responsables son **puestos** cubiertos por usuarios registrados con roles. No se asumen personas concretas.

Ver [[Proceso Producción]], [[Operadores y Roles]], [[KPI Produccion]], [[Flujo Orden Produccion]], ADR-030.

---

## Estado

| Ítem | Estado |
|---|---|
| Preguntas planteadas | ✅ |
| Validado y aprobado por Dirección AMD México | ✅ 2026-08-13 |
| Implementado en AMD Operations | ⬜ No hay módulo de producción |

---

## Programación de trabajos

**Responsable aprobado:** Supervisor de Producción.

Funciones:

- Asignar órdenes
- Asignar máquinas
- Asignar operadores
- Balancear carga
- Ajustar prioridades

Permiso de negocio: **Programar Máquinas**. Hoy no existe en el catálogo RBAC. El puesto Supervisor no es un `role_id`; se cubre con un usuario (típicamente rol Producción) al implementar.

---

## Priorización de órdenes

**Responsables aprobados:**

- Dirección General
- Ventas
- Supervisor de Producción

**Criterios (en este orden):**

1. Fecha prometida
2. Cliente estratégico
3. Disponibilidad de material
4. Capacidad instalada
5. Urgencias aprobadas

El pedido mínimo **no** tiene `promised_date` ni prioridad. El CRM **no** tiene flag «cliente estratégico». Inventario **no** existe. La implementación de Fase 4 debe persistir prioridad y fecha prometida en la OP; cliente estratégico y material son dependencias de CRM/Inventario o campos nuevos a diseñar.

---

## Niveles de prioridad

| Nivel | Nombre |
|---|---|
| 1 | Urgente |
| 2 | Compromiso inmediato |
| 3 | Programada |
| 4 | Producción normal |

Default sugerido al crear OP: **4 — Producción normal**, salvo que Dirección/Ventas/Supervisor asigne otro. No hay código.

---

## Control de retrasos

Estados de **monitoreo** (distintos de los estados de OP en [[Estados Produccion]]):

| Monitoreo | Significado |
|---|---|
| En tiempo | Cumple fecha prometida con holgura |
| En riesgo | Aún no vence; factores de atraso presentes |
| Retrasada | Fecha prometida incumplida o equivalente aprobado |

Factores de riesgo/atraso:

- Material pendiente
- Máquina saturada
- Operador no asignado
- Retrabajo
- Cambio de prioridad

Causas oficiales de retraso (para captura / análisis):

- Material faltante
- Cambio de prioridad
- Sobrecarga de máquina
- Error de programación
- Retrabajo
- Espera de aprobación cliente

---

## Registro de horas máquina

Captura por evento de operación (no la sesión web del usuario):

- Máquina
- Operador
- Orden
- Operación
- Hora inicio
- Hora fin
- Tiempo consumido

Alimenta utilización y KPI de horas máquina. Atributo de ficha **Horas por Turno** ([[Maquinas]]) es el denominador.

---

## Registro de horas hombre

Captura aparte de la máquina (mismo reloj de operación, dimensión operador):

- Operador
- Orden
- Operación
- Hora inicio
- Hora fin
- Tiempo consumido

No atribuir OEE de máquina a una persona. OEE **no** va en Fase 4.

---

## Compras urgentes

**Responsable aprobado:** Dirección General.  
**Futuro:** Gerente de Operaciones (puesto no existe en RBAC; no crearlo en Fase 4).

Módulo Compras ⬜ Fase 6. Hasta entonces la regla queda documentada; no hay OC.

---

## Liberación de producto terminado

**Responsable principal:** Inspector de Calidad.  
**Alternativa:** Supervisor de Producción.

Flujo aprobado:

```
Producción
    ↓
Calidad
    ↓
Liberación
    ↓
Entrega
```

Permiso **Liberar Calidad** → OP `Terminada`. Luego **Cerrar Orden** / Entregas. Ver [[Proceso Calidad]].

---

## Productividad (indicadores oficiales)

- Órdenes terminadas
- Órdenes retrasadas
- Horas máquina utilizadas
- Horas hombre utilizadas
- Cumplimiento de entrega
- Utilización por centro de trabajo

**No implementar OEE en Fase 4.**

---

## KPI Dirección General

Objetivo de tablero ejecutivo / diario. Ninguno de piso se calcula hoy.

- Ventas del día
- Cotizaciones abiertas *(existe en dashboard si `quotes:read`)*
- Cotizaciones ganadas *(aprox. `convertida`; no hay KPI «ganadas» con ese nombre)*
- Órdenes activas
- Órdenes retrasadas
- Entregas del día
- Material crítico
- Compras pendientes

Ventas del día, entregas, material crítico y compras pendientes dependen de Pedidos UI, Entregas, Inventario y Compras — aún ⬜.

---

## KPI Producción

- Órdenes en proceso
- Órdenes terminadas
- Carga CNC
- Carga Láser
- Carga Tornos
- Horas máquina

Carga de otros centros (Doblado, EDM, etc.) no está en esta lista oficial de Dirección; puede existir como detalle de planta sin ser KPI ejecutivo.

---

## KPI Calidad

- Inspecciones pendientes
- Rechazos
- No conformidades

Módulo Calidad ⬜ Fase 7. Definidos para no rediseñar el tablero después.

---

## Información requerida por Dirección

Lo que Dirección espera consultar (cuando existan datos reales; no ceros fingidos):

- Órdenes activas
- Órdenes retrasadas
- Utilización máquinas
- Producción diaria
- Entregas comprometidas
- Compras urgentes
- Material crítico

---

## Problemas operativos de mayor impacto económico

Orden de impacto aprobado por Dirección:

1. Retrasos de entrega
2. Compras urgentes
3. Tiempo muerto de máquina
4. Retrabajos
5. Falta de material

El diseño técnico de Fase 4 y fases siguientes debe hacer **visibles** estos cinco, no ocultarlos.

---

## Decisiones previas que siguen vigentes

- Máquinas administrables (ADR-027)
- Rutas A / B / C y configurables (ADR-028)
- Permisos vía usuarios y roles (ADR-029)
- OP anclada al pedido mínimo (ADR-025)

---

## Addendum Dirección 2026-08-14 (ADR-043)

No reabre ADR-030. Precisa catálogos y responsables.

**Fecha prometida:** Gerente de Producción / Planeación.

**Cliente estratégico:** alto volumen, buen historial de pago, sector estratégico, potencial de crecimiento. Flag CRM ⬜.

**Tiempos muertos:** Falla mecánica, Setup, Falta de material, Espera de calidad, Falta de operador, Espera de programa, Espera de plano.

**Retrabajos:** OP, parte, cantidad, scrap, causa raíz, horas hombre, horas máquina, liberación calidad.

**Material crítico:** Inconel, Titanio, aceros especiales, PEEK, proveedor único, lead time > 15 días.

**Compras urgentes:** riesgo de paro, cliente estratégico, penalización contractual, material defectuoso.

**Cierre de OP:** físico = Inspector de Calidad; administrativo = Supervisor de Producción.

**KPI Dirección:** ventas del día, cotizaciones abiertas, cotizaciones ganadas, órdenes activas, órdenes retrasadas, entregas del día, material crítico, compras pendientes.

Ingeniería (Fase 4) entrega el sello Liberado = Aprobado para manufactura (ADR-038). DFM de taller: ADR-041.
