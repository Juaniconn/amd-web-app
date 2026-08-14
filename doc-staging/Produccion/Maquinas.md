# Máquinas

Última actualización: 2026-08-13.  
Fuente: inventario operativo confirmado por Dirección (2026-08-13) + BUSINESS_SPEC §17.  
**No hay tabla `machines`.** Las máquinas serán **configurables por el administrador** (crear, editar, desactivar, eliminar). El inventario de 15 equipos es semilla, no un catálogo fijo en código. No se inventan marcas ni horas de turno vacías.

Ver [[Centros de Trabajo]], [[KPI Produccion]], [[Flujo Orden Produccion]], [[Rutas de Fabricacion]], [[production]], ADR-027.

---

## Estado en el sistema

| Pregunta | Respuesta |
|---|---|
| ¿Existen máquinas en PostgreSQL? | No |
| ¿Existe `/machines`? | No (sidebar deshabilitado; el código aún dice «Fase 5») |
| ¿Estados de máquina (§18)? | Diseño: Disponible, En producción, Ocupada, Mantenimiento, Fuera de servicio. No persistidos |
| ¿Seed §42 (15 máquinas demo)? | No sembrado. El conteo conocido de planta suma **15** equipos (ver abajo) |

---

## Máquinas configurables (decisión de negocio)

**No implementado.** Diseño obligatorio de Fase 4 (ADR-027).

### Acciones del administrador

| Acción | Efecto diseñado |
|---|---|
| Crear | Alta de ficha; Fecha Alta = ahora; Activo = sí |
| Editar | Cambia atributos; auditoría cuando exista entidad máquina |
| Desactivar | Activo → Inactivo; Fecha Baja; no se programa en OP nuevas; historial intacto |
| Eliminar | Dirección pidió poder eliminar. **Recomendación:** rechazar si hay operaciones históricas; usar desactivar. No hay código |

Quien administra el catálogo: rol **Administrador**.

### Atributos de ficha

| Atributo | Obligatorio en diseño | Notas |
|---|---|---|
| Nombre | Sí | Etiqueta de piso (p. ej. VMC #1). Editable |
| Marca | No | Vacío hasta captura. No inventar |
| Modelo | No | Ultimaker S5 es el único modelo confirmado en semilla |
| Año | No | Vacío hasta captura |
| Centro de Trabajo | Sí | FK al centro; restringe programación |
| Responsable | No | **Usuario registrado** (`users.id`), no nombre libre |
| Horas por Turno | No | Denominador de utilización. Captura de horas trabajadas: ADR-030 |
| Capacidad | No | Lo que planta capture; no inventar piezas/hora |
| Observaciones | No | Libre |
| Activo / Inactivo | Sí | Default Activo al crear |
| Fecha Alta | Sí | Al crear |
| Fecha Baja | Si inactiva | Vacía mientras Activo |

Estados de piso §18 (Disponible, En producción, Ocupada, Mantenimiento, Fuera de servicio) son **distintos** de Activo/Inactivo. Una máquina Activa puede estar en Mantenimiento.

Solo se programan máquinas **Activas** del centro de la operación (permiso **Programar Máquinas**).

---

## Resumen de inventario conocido

| Tipo | Cantidad | Centro | Modelo confirmado |
|---|---|---|---|
| CNC verticales | 5 | CNC | ⬜ No |
| Tornos CNC | 2 | Tornos | ⬜ No |
| Corte láser | 2 | Láser | ⬜ No |
| Press Brake | 1 | Doblado | ⬜ No |
| Wire EDM | 1 | Wire EDM | ⬜ No |
| Router CNC | 1 | Router CNC | ⬜ No |
| Surface Grinder | 1 | Rectificado | ⬜ No |
| Inyección de plástico | 1 | Moldeo | ⬜ No |
| Impresora 3D | 1 | Prototipado | **Ultimaker S5** |

**Total equipos de este inventario: 15.**

Equipo de planta **sin cantidad** en este inventario: fresadoras manuales, estaciones de soldadura, estaciones de ensamble, metrología. No se cuentan en los 15.

Campos que se repiten en cada ficha:

- **Tiempo estimado de preparación:** ⬜ pendiente (no hay minutos de setup por tipo).
- **Requerimientos de operador:** puesto sugerido; sin matriz de habilidades ni certificaciones.
- **Indicadores de utilización:** diseño de KPI; **ningún % real**. Ver [[KPI Produccion]].

---

## CNC verticales

| Campo | Valor |
|---|---|
| Tipo | CNC vertical (VMC) |
| Cantidad | **5** |
| Centro asociado | [[Centros de Trabajo#CNC]] |
| Capacidades | Maquinado de aluminio; acero; acero inoxidable; prototipos; producción |
| Procesos compatibles | Maquinado CNC; prototipos metálicos; producción bajo/medio volumen |
| Tiempo estimado de preparación | ⬜ Pendiente de levantamiento |
| Requerimientos de operador | Operador CNC. Competencia por máquina, CAM y utillaje: ⬜ pendiente |
| Indicadores de utilización | Utilización %, horas disponibles, horas trabajadas, tiempo muerto, OEE futuro. Hoy: no medibles |

Identificadores de piso en §17: VMC #1 … VMC #5. Marca, control, recorrido, RPM: **no documentados**.

---

## Tornos CNC

| Campo | Valor |
|---|---|
| Tipo | Torno CNC |
| Cantidad | **2** |
| Centro asociado | [[Centros de Trabajo#Tornos]] |
| Capacidades | Piezas cilíndricas; ejes; bujes; roscas |
| Procesos compatibles | Torneado; roscado (norma/paso ⬜ pendiente) |
| Tiempo estimado de preparación | ⬜ Pendiente |
| Requerimientos de operador | Operador Torno |
| Indicadores de utilización | Igual que el resto de máquinas; no medibles hoy |

§17: Torno #1, Torno #2. Diámetro máximo y distancia entre puntos: ⬜ pendiente.

---

## Corte láser

| Campo | Valor |
|---|---|
| Tipo | Corte láser |
| Cantidad | **2** |
| Centro asociado | [[Centros de Trabajo#Láser]] |
| Capacidades | Acero; inoxidable; aluminio; corte de lámina |
| Procesos compatibles | Corte de lámina; alimentación a doblado/soldadura/ensamble |
| Tiempo estimado de preparación | ⬜ Pendiente |
| Requerimientos de operador | Operador Láser |
| Indicadores de utilización | No medibles hoy |

§17: Láser #1, Láser #2. Potencia, fuente, área, espesor máximo: ⬜ pendiente.

---

## Press Brake

| Campo | Valor |
|---|---|
| Tipo | Press Brake / dobladora |
| Cantidad | **1** |
| Centro asociado | [[Centros de Trabajo#Doblado]] |
| Capacidades | Doblado de lámina; fabricación de gabinetes; fabricación de brackets |
| Procesos compatibles | Doblado; fabricación metálica de lámina |
| Tiempo estimado de preparación | ⬜ Pendiente (cambios de utillaje no cronometrados) |
| Requerimientos de operador | Supervisor / operador de doblado (no hay rol RBAC específico) |
| Indicadores de utilización | Crítico por ser único equipo; sin datos de carga |

Tonelaje y largo de cama: ⬜ pendiente.

---

## Wire EDM

| Campo | Valor |
|---|---|
| Tipo | Wire EDM |
| Cantidad | **1** |
| Centro asociado | [[Centros de Trabajo#Wire EDM]] |
| Capacidades | Alta precisión; herramentales; moldes; geometrías complejas |
| Procesos compatibles | Electroerosión por hilo; herramental; apoyo a moldes |
| Tiempo estimado de preparación | ⬜ Pendiente |
| Requerimientos de operador | Supervisor / operador EDM (no hay rol RBAC específico) |
| Indicadores de utilización | Un solo equipo; no medible hoy |

Recorrido, hilo, materiales: ⬜ pendiente. No inventar tolerancias.

---

## Router CNC

| Campo | Valor |
|---|---|
| Tipo | Router CNC |
| Cantidad | **1** |
| Centro asociado | [[Centros de Trabajo#Router CNC]] |
| Capacidades | Corte de placas; acrílico; MDF; materiales no metálicos |
| Procesos compatibles | Corte de no metales; placas; prototipos no metálicos |
| Tiempo estimado de preparación | ⬜ Pendiente |
| Requerimientos de operador | ⬜ Pendiente (no hay puesto nombrado) |
| Indicadores de utilización | No medibles hoy |

Área de corte y husillo: ⬜ pendiente. **No** asociar al centro CNC.

---

## Surface Grinder

| Campo | Valor |
|---|---|
| Tipo | Rectificadora de superficies |
| Cantidad | **1** |
| Centro asociado | [[Centros de Trabajo#Rectificado]] |
| Capacidades | Acabados de precisión; ajustes dimensionales |
| Procesos compatibles | Rectificado; acabado posterior a CNC/torno |
| Tiempo estimado de preparación | ⬜ Pendiente |
| Requerimientos de operador | ⬜ Pendiente |
| Indicadores de utilización | No medibles hoy |

Tamaño de mesa y grano de piedra: ⬜ pendiente.

---

## Inyección de plástico

| Campo | Valor |
|---|---|
| Tipo | Inyección / moldeo |
| Cantidad | **1** |
| Centro asociado | [[Centros de Trabajo#Moldeo]] |
| Capacidades | Producción de piezas plásticas; corridas pequeñas |
| Procesos compatibles | Inyección; corridas cortas (tamaño de lote no cuantificado) |
| Tiempo estimado de preparación | ⬜ Pendiente (cambio de molde no cronometrado) |
| Requerimientos de operador | ⬜ Pendiente |
| Indicadores de utilización | No medibles hoy |

Tonelaje, resinas y maestro de moldes: ⬜ pendiente.

---

## Impresora 3D

| Campo | Valor |
|---|---|
| Tipo | Impresora 3D FDM (confirmado por modelo) |
| Cantidad | **1** |
| Centro asociado | [[Centros de Trabajo#Prototipado]] |
| Modelo | **Ultimaker S5** |
| Capacidades | Prototipos rápidos; fixtures; herramentales ligeros |
| Procesos compatibles | Prototipado aditivo; fixtures de piso; herramental ligero |
| Tiempo estimado de preparación | ⬜ Pendiente |
| Requerimientos de operador | ⬜ Pendiente (Ingeniería / Producción; no hay rol RBAC Ingeniería) |
| Indicadores de utilización | Horas de impresión vs disponibles: no capturadas |

Filamentos, perfiles y volumen usado en planta: ⬜ pendiente. No copiar especificaciones de folleto del fabricante como si fueran datos de AMD.

---

## Equipo de planta sin ficha numerada

| Recurso | Notas |
|---|---|
| Fresadoras manuales | §17. Cantidad desconocida. Centro: ⬜ pendiente |
| Soldadura | Capacidad de planta. Estaciones: ⬜ pendiente. Centro: Soldadura |
| Ensamble | Capacidad de planta. Estaciones: ⬜ pendiente. Centro: Ensamble |
| Metrología | Sin instrumentos listados. Centro: Calidad |

---

## Estados de máquina (diseño §18, no implementados)

- Disponible
- En producción
- Ocupada
- Mantenimiento
- Fuera de servicio

Dashboard visual diseñado: 🟢 Disponible · 🔵 Producción · 🟡 Mantenimiento · 🔴 Fuera de servicio.

El dashboard actual **no** muestra estos estados. Placeholder: «Máquinas ocupadas · Fase 5».

---

## Relación con la OP

Diseño: cada operación de la ruta apunta a un **centro** y, cuando aplique, a una **máquina** y un **operador**. Hoy no hay OP ni FK.

No calcular utilización hasta haber horas reales. Ver [[Flujo Orden Produccion]].

---

## Información pendiente de levantamiento

No completar estas celdas con supuestos. Obtenerlas de planta AMD México.

### Producción

- Marca, modelo y año de cada CNC, torno, láser, press brake, EDM, router, rectificadora e inyectora (solo Ultimaker S5 está confirmada).
- Nombre de piso definitivo (hoy VMC #1… y Láser #1… vienen de §17).
- Control numérico y software CAM por equipo.
- Recorrido / diámetro / tonelaje / área de corte / espesor máximo por material.
- Minutos de setup (preparación) por tipo de trabajo, no un número genérico inventado.
- Turnos y horas disponibles reales (1, 2 o 3 turnos; días laborables).
- Matriz operador ↔ máquina (quién puede correr qué).
- Rutas: semilla A/B/C en [[Rutas de Fabricacion]]; el resto las crea el administrador.
- Cantidad de estaciones de soldadura y ensamble; procesos de soldadura (MIG/TIG/otro).
- Fresadoras manuales: cantidad y si son un centro o accesorio de CNC.
- Maestro de moldes para inyección (propios vs de cliente).
- Filamentos y materiales 3D realmente usados.
- Instrumentos de calidad (para el centro Calidad).
- Fecha prometida de piso (el pedido mínimo no la tiene).
- Flag «requiere inspección» por pedido/OP.

### Inventario (Fase 5)

- SKU de lámina (acero, inox, aluminio), barra, resina, acrílico, MDF, filamento, consumibles de soldadura e insertos.
- Unidades, dimensiones, stock mínimo, ubicación, proveedor principal.
- Material típico por centro (qué descuenta CNC vs láser vs moldeo vs prototipado).
- Herramental y fixtures: ¿inventario o cargo directo?

### Compras (Fase 6)

- Proveedores de materia prima por familia (lámina, barra, resina, no metales).
- Lead time real de placa y barra (hoy `quotes.lead_time` es texto de cotización).
- Comprar vs transformar internamente (p. ej. molde EDM vs molde de tercero).

### Mantenimiento

- No hay módulo de mantenimiento en el roadmap de software.
- Pendiente: plan preventivo, responsable, historial, MTBF/MTTR, contrato de servicio Ultimaker y del resto.
- Estado «Mantenimiento» de máquina (§18) no se puede operar sin estas fechas.
- Tiempo muerto hoy no se registra; hace falta código de paro (setup, falta material, falla, espera calidad).
