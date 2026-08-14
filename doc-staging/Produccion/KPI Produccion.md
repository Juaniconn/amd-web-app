# KPI Producción

Última actualización: 2026-08-13.

**Ningún KPI de esta lista se calcula.** No hay OP, tiempos, centros ni operadores asignados en PostgreSQL.

El dashboard (`src/app/(dashboard)/dashboard/page.tsx`) muestra placeholders sin cifra:

- Órdenes de producción · etiqueta de código «Fase 5»
- Máquinas ocupadas · «Fase 5»

KPIs reales hoy: usuarios, roles, sesiones, clientes activos (`customers:read`), cotizaciones abiertas / por vencer / convertidas del mes (`quotes:read`). Ver [[dashboard]].

Definiciones oficiales = **ADR-030**. Prohibido pintar % o horas inventados. **No implementar OEE en Fase 4.**

Ver [[Pendiente Validacion Direccion]], [[Centros de Trabajo]], [[Maquinas]], [[Estados Produccion]], [[Operadores y Roles]].

---

## KPI oficiales — Dirección General

Ninguno de piso se calcula. El dashboard actual solo tiene fundación, clientes activos y cotizaciones (abiertas / por vencer / convertidas del mes).

| KPI aprobado | Dependencia | Hoy |
|---|---|---|
| Ventas del día | Pedidos / facturación | Placeholder «Ventas hoy · Fase 4» |
| Cotizaciones abiertas | `quotes` | ✅ si `quotes:read` |
| Cotizaciones ganadas | Aprox. `convertida` | Parcial (KPI «convertidas del mes», no «ganadas») |
| Órdenes activas | OP | ⬜ |
| Órdenes retrasadas | OP + fecha prometida + monitoreo Retrasada | ⬜ |
| Entregas del día | Entregas Fase 8 | Placeholder |
| Material crítico | Inventario Fase 5 | Placeholder |
| Compras pendientes | Compras Fase 6 | Placeholder |

Información que Dirección exige consultar: órdenes activas/retrasadas, utilización máquinas, producción diaria, entregas comprometidas, compras urgentes, material crítico.

---

## KPI oficiales — Producción

| KPI aprobado | Definición de diseño | Hoy |
|---|---|---|
| Órdenes en proceso | OP no terminales (`Terminada`/`Entregada`/`Cancelada` fuera) | ⬜ |
| Órdenes terminadas | OP a `Terminada` en el período | ⬜ |
| Carga CNC | OP/operaciones programadas o en curso en centro CNC | ⬜ |
| Carga Láser | Igual, centro Láser | ⬜ |
| Carga Tornos | Igual, centro Tornos | ⬜ |
| Horas máquina | Suma de (fin − inicio) capturados por máquina/orden/operación | ⬜ |

---

## KPI oficiales — Calidad

| KPI aprobado | Hoy |
|---|---|
| Inspecciones pendientes | ⬜ Fase 7 |
| Rechazos | ⬜ |
| No conformidades | ⬜ |

---

## Productividad (oficial)

- Órdenes terminadas
- Órdenes retrasadas
- Horas máquina utilizadas
- Horas hombre utilizadas
- Cumplimiento de entrega
- Utilización por centro de trabajo

Captura de tiempos: [[Pendiente Validacion Direccion]] (máquina y hombre: inicio, fin, orden, operación, operador).

---

## Nivel planta (órdenes)

### Órdenes activas

OP cuyo estado no es `Terminada`, `Entregada` ni `Cancelada`.

**Hoy:** no aplica. No mostrar `0` como si el taller estuviera vacío.

### Órdenes retrasadas

OP activas con fecha prometida de piso `< hoy`.

**Dependencia:** esa fecha no existe en `orders`. `quotes.lead_time` es texto.

### Órdenes terminadas

OP que pasaron a `Terminada` (o `Entregada`) en el período (semana / mes, zona planta Juárez).

No confundir con «Convertidas del mes» (cotizaciones, no piezas).

### Tiempo promedio de fabricación

Promedio de (fin real − inicio real) de OP terminadas. `orders.created_at` es la conversión de RFQ, no el ciclo de piso.

### Scrap

Cantidad rechazada / cantidad producida. Depende de [[Proceso Calidad]] e Inventario. Hoy no hay inspecciones.

---

## Nivel centro de trabajo

Agrupar las métricas siguientes por cada centro semilla (CNC, Tornos, Láser, Doblado, Wire EDM, Router CNC, Rectificado, Moldeo, Prototipado, Soldadura, Ensamble, Calidad).

| KPI | Definición | Hoy |
|---|---|---|
| Carga | OP en `Programada` + `En Producción` + `Pausada` (+ `Calidad` si el centro es Calidad) | No hay centros |
| Órdenes terminadas | Operaciones de ese centro cerradas en el período | No |
| Órdenes retrasadas | Operaciones vencidas de ese centro | No; sin fecha prometida |
| Horas disponibles | Turnos × equipos del centro − mantenimiento programado | Turnos ⬜ |
| Horas trabajadas | Suma de tiempo real en operaciones del centro | No hay clock-in de piso |
| Utilización % | Horas trabajadas / horas disponibles | No |
| Tiempo muerto | Horas en paro (setup, falla, espera material, espera calidad) | Códigos de paro ⬜ |
| OEE | **Fuera de Fase 4** (Dirección). No implementar | — |

Cuellos de un solo equipo (Doblado, Wire EDM, Router, Rectificado, Moldeo, Prototipado): la utilización del centro = la de esa máquina.

Calidad: «horas máquina» no aplica igual; medir órdenes inspeccionadas y tiempo de ciclo de inspección cuando exista el módulo.

---

## Nivel máquina

Misma familia de indicadores, por equipo (5 CNC, 2 tornos, 2 láser, 1 press brake, 1 EDM, 1 router, 1 rectificadora, 1 inyectora, 1 Ultimaker S5).

| KPI | Definición | Hoy |
|---|---|---|
| Estado | Disponible / En producción / Ocupada / Mantenimiento / Fuera de servicio (§18) | No persistido |
| Horas disponibles | Según turno y si no está fuera de servicio | ⬜ |
| Horas trabajadas | Tiempo real registrado en esa máquina | No |
| Utilización % | Trabajadas / disponibles | No |
| Tiempo muerto | Paros atribuidos a esa máquina | ⬜ |
| Órdenes terminadas | Operaciones cerradas en esa máquina | No |
| Órdenes retrasadas | Operaciones vencidas en esa máquina | No |
| OEE futuro | Igual que centro; no en el MVP de Fase 4 | — |

La Ultimaker S5 puede medir horas de impresión cuando se registren; no usar specs de folleto como meta de OEE.

Sin marca/modelo del resto de equipos, el KPI se agrupa por el identificador de piso (VMC #1…, Láser #1…) cuando Administración los configure.

---

## Nivel operador

No hay asignación usuario↔máquina. El rol Producción no opera piso.

| KPI | Definición | Hoy |
|---|---|---|
| Horas trabajadas | Tiempo real en operaciones donde es operador | No |
| Horas disponibles | Según su turno | Turnos y plantilla ⬜ |
| Utilización % | Trabajadas / disponibles | No |
| Órdenes terminadas | Operaciones que cerró en el período | No |
| Órdenes retrasadas | Operaciones suyas vencidas | No |
| Tiempo muerto | Paros en su turno (espera material vs inactividad) | ⬜ |
| OEE futuro | No atribuir OEE de máquina al operador en Fase 4 (mezcla habilidad y máquina) | — |

Matriz de habilidades (quién puede CNC vs láser vs S5): **pendiente**. Sin ella no se debe reportar «eficiencia de operador» como ranking.

---

## Horas máquina (planta)

Suma de tiempo real de todas las operaciones. BUSINESS_SPEC §15 y §29 (costo de tiempo máquina). No usar la sesión web del usuario.

---

## Producción semanal / mensual

OP o piezas a `Terminada` en la semana o mes calendario (`es-MX`). Desglosable por centro cuando existan operaciones.

---

## Relación con el Centro de Operaciones (§51)

BUSINESS_SPEC §51 pide máquinas ocupadas y OP en producción. **No está construido.** Fase 10 = Dashboard Ejecutivo. Hasta entonces estos KPI viven en Producción.

---

## Permisos

Lectura futura: Dirección y Producción. Ventas no, salvo ADR. Hoy Dirección no ve cifras de piso porque no existen.

---

## Modelo validado (ADR-030)

KPI oficiales y captura de tiempos: **aprobados**. Documento: [[Pendiente Validacion Direccion]].

Aún faltan datos de planta (turnos reales para denominador de utilización, códigos de paro). No inventar metas numéricas.

OEE y ranking de operadores: **no** en Fase 4.
