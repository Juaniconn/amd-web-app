# Validación Dirección — Modelo Operativo Producción

Última actualización: 2026-08-14.  
Archivo: `Pendiente Validacion Direccion.md` (el nombre de archivo se conserva por los wikilinks existentes).

**Estado: Validado y aprobado por Dirección General, AMD México.**  
Aplicación: modelo operativo de **Producción** (ADR-030 + addendum ADR-043). Numeración vigente: Producción = **Fase 5** (ADR-032).  
**No implementado en código.** No reabrir ADR-030. Ingeniería (Fase 4) no cambia programación de piso.

Los responsables son **puestos** cubiertos por usuarios registrados con roles. No se asumen personas concretas.

Ver [[Proceso Producción]], [[Operadores y Roles]], [[KPI Produccion]], [[Flujo Orden Produccion]], ADR-030, ADR-043.

---

## Estado

| Ítem | Estado |
|---|---|
| Preguntas planteadas | ✅ |
| Validado y aprobado por Dirección AMD México | ✅ 2026-08-13; addendum ✅ 2026-08-14 |
| Implementado en AMD Operations | ⬜ No hay módulo de producción |

---

## Programación de trabajos

**Responsable aprobado:** Supervisor de Producción.

Funciones: asignar órdenes, máquinas, operadores; balancear carga; ajustar prioridades.

Permiso de negocio: **Programar Máquinas**. Hoy no existe en el catálogo RBAC.

---

## Priorización de órdenes

**Responsables:** Dirección General, Ventas, Supervisor de Producción.

**Criterios (en este orden):** (1) fecha prometida — la fija Gerente de Producción / Planeación (ADR-043), (2) cliente estratégico, (3) disponibilidad de material, (4) capacidad instalada, (5) urgencias aprobadas.

El pedido mínimo **no** tiene `promised_date` ni prioridad. El CRM **no** tiene flag «cliente estratégico».

---

## Niveles de prioridad

1 Urgente · 2 Compromiso inmediato · 3 Programada · 4 Producción normal.

---

## Control de retrasos

Monitoreo: En tiempo / En riesgo / Retrasada. Causas: material faltante, cambio de prioridad, sobrecarga de máquina, error de programación, retrabajo, espera de aprobación cliente.

---

## Horas máquina y horas hombre

Inicio/fin por máquina u operador, orden y operación. **No OEE.**

---

## Compras urgentes

**Autoriza:** Dirección General. **Futuro:** Gerente de Operaciones.

Condiciones (ADR-043): riesgo de paro, cliente estratégico, penalización contractual, material defectuoso.

---

## Liberación y cierre de OP

Cierre **físico:** Inspector de Calidad (alternativa: Supervisor).  
Cierre **administrativo:** Supervisor de Producción.

```
Producción → Calidad → Liberación física → Cierre administrativo → Entrega
```

---

## Tiempos muertos oficiales (ADR-043)

Falla mecánica · Setup · Falta de material · Espera de calidad · Falta de operador · Espera de programa · Espera de plano.

---

## Retrabajos

Registrar: OP, parte, cantidad, scrap, causa raíz, horas hombre, horas máquina, liberación calidad.

---

## Material crítico

Inconel, Titanio, aceros especiales, PEEK, proveedor único, lead time > 15 días.

---

## Cliente estratégico

Alto volumen, buen historial de pago, sector estratégico, potencial de crecimiento.

---

## KPI Dirección General

Ventas del día · Cotizaciones abiertas · Cotizaciones ganadas · Órdenes activas · Órdenes retrasadas · Entregas del día · Material crítico · Compras pendientes.

Hoy solo cotizaciones abiertas (y convertidas del mes) son reales.

---

## KPI Producción

Órdenes en proceso · terminadas · Carga CNC / Láser / Tornos · Horas máquina.

---

## KPI Calidad

Inspecciones pendientes · Rechazos · No conformidades.

---

## Problemas de mayor impacto económico

1. Retrasos de entrega · 2. Compras urgentes · 3. Tiempo muerto · 4. Retrabajos · 5. Falta de material.

---

## Addendum Dirección 2026-08-14 (ADR-043)

No reabre ADR-030. Precisa catálogos y responsables listados arriba. Ingeniería entrega Liberado = Aprobado para manufactura (ADR-038). DFM de taller: ADR-041.

Decisiones previas vigentes: ADR-025, ADR-027, ADR-028, ADR-029, ADR-030.
