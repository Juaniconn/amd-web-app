# Centros de Trabajo

Última actualización: 2026-08-13.  
Fuente: inventario operativo confirmado por Dirección (2026-08-13), BUSINESS_SPEC §§1 y 17, contexto AMD México (Ciudad Juárez).  
**No hay tabla `work_centers` ni pantallas.** Semilla de configuración para Fase 4. No se inventan marcas, potencias, recorridos, software CAM ni tiempos de setup.

Ver [[Maquinas]], [[Flujo Orden Produccion]], [[Operadores y Roles]], [[KPI Produccion]], [[Proceso Producción]].

---

## Estado en el sistema

| Pregunta | Respuesta |
|---|---|
| ¿Existen centros en PostgreSQL? | No |
| ¿Existe `/production`? | No (sidebar deshabilitado) |
| ¿Quién los configura hoy? | Nadie. Administración deberá poder crear/editar centros (BUSINESS_SPEC §17) |

---

## Catálogo semilla (Fase 4)

| Centro | Máquinas conocidas | Cantidad |
|---|---|---|
| CNC | CNC verticales | 5 |
| Tornos | Tornos CNC | 2 |
| Láser | Corte láser | 2 |
| Doblado | Press Brake | 1 |
| Wire EDM | Wire EDM | 1 |
| Router CNC | Router CNC | 1 |
| Rectificado | Surface Grinder | 1 |
| Moldeo | Inyección de plástico | 1 |
| Prototipado | Impresora 3D Ultimaker S5 | 1 |
| Soldadura | Estaciones no numeradas | ⬜ Pendiente de levantamiento |
| Ensamble | Estaciones no numeradas | ⬜ Pendiente de levantamiento |
| Calidad | Instrumentos no listados | ⬜ Pendiente de levantamiento |

Cambio respecto al catálogo anterior: Router CNC, Rectificado, Moldeo y Prototipado tienen **centro propio**. Press Brake cuelga de **Doblado**, no de un centro llamado Press Brake.

AMD México fabrica bajo pedido (prototipos y bajo/medio volumen) para maquiladoras e industria: maquinado CNC, corte láser, doblado, soldadura, fabricación metálica, Wire EDM, ensamble.

---

## CNC

### Objetivo

Maquinado en centros verticales (VMC) de piezas metálicas, prototipos y corridas de producción.

### Descripción

Centro principal de capacidad documentada. Cinco CNC verticales. Trabajo típico: piezas para maquila, prototipos y producción de bajo/medio volumen en aluminio, acero y acero inoxidable.

### Máquinas asociadas

5 CNC verticales. Nombres de piso conocidos en BUSINESS_SPEC §17: VMC #1 a VMC #5. Marca, modelo, control y recorrido: **pendiente de levantamiento**.

### Capacidades

- Maquinado de aluminio
- Acero
- Acero inoxidable
- Prototipos
- Producción

### Tipos de trabajo

- Piezas maquinadas bajo pedido
- Prototipos metálicos
- Producción de bajo y medio volumen
- Operaciones de una ruta que incluye otros centros (p. ej. láser → CNC → ensamble)

### Restricciones

- Sin husillo, mesa, recorrido ni CAM en el sistema.
- No mezclar con Router CNC (placas no metálicas), Rectificado ni Moldeo: son centros distintos.
- Fresadoras manuales (mencionadas en §17) no tienen cantidad ni centro propio. **Pendiente.**

### Dependencias

- Material (placa/barra) → Inventario (Fase 5), no existe.
- Herramientas/insertos: no hay catálogo de tooling.
- Calidad posterior si la OP lo requiere.
- Ingeniería/planeación para definir la ruta. No hay módulo de ingeniería.

### Responsable sugerido

Operador CNC / Supervisor de Producción. RBAC hoy: rol **Producción** (`dashboard:read` únicamente).

---

## Tornos

### Objetivo

Torneado CNC de piezas de revolución.

### Descripción

Dos tornos CNC. Complementa al centro CNC cuando la geometría es cilíndrica.

### Máquinas asociadas

2 tornos CNC. Identificadores de piso en §17: Torno #1, Torno #2. Marca/modelo/diámetro máximo: **pendiente**.

### Capacidades

- Piezas cilíndricas
- Ejes
- Bujes
- Roscas

### Tipos de trabajo

- Ejes, bujes y piezas de revolución bajo pedido
- Roscas (el tipo de rosca y norma no está documentado)

### Restricciones

- No hay dato de si son solo CNC (inventario confirmado: «Tornos CNC») vs convencionales adicionales.
- Sin distancia entre puntos, plato ni contrapunto.

### Dependencias

- Barra / material → Inventario ⬜
- Herramientas de torneado: no catalogadas
- Puede preceder o seguir a CNC, rectificado o ensamble según la ruta (no hay rutas persistidas)

### Responsable sugerido

Operador Torno / Supervisor de Producción.

---

## Láser

### Objetivo

Corte de lámina metálica.

### Descripción

Dos equipos de corte láser. Alimenta doblado, soldadura y ensamble en fabricación metálica (gabinetes, brackets, piezas de lámina).

### Máquinas asociadas

2 equipos. §17: Láser #1, Láser #2. Fuente (CO₂/fibra), potencia, área y espesor máximo: **pendiente**.

### Capacidades

- Acero
- Inoxidable
- Aluminio
- Corte de lámina

### Tipos de trabajo

- Corte de lámina para fabricación metálica
- Piezas planas que luego se doblan o sueldan
- Prototipos y series cortas de lámina

### Restricciones

- No cortar acrílico/MDF aquí: eso es Router CNC, salvo que planta confirme lo contrario (**no confirmado**).
- Sin espesores máximos por material.

### Dependencias

- Lámina en inventario ⬜
- Anidado/programas de corte: no hay CAM en el sistema
- Centro Doblado con frecuencia aguas abajo

### Responsable sugerido

Operador Láser / Supervisor de Producción.

---

## Doblado

### Objetivo

Doblado de lámina (press brake).

### Descripción

Un Press Brake. Centro de fabricación metálica junto con Láser y Soldadura. Antes se documentó como centro «Press Brake»; el nombre vigente es **Doblado**.

### Máquinas asociadas

1 Press Brake. Tonelaje, largo de cama y utillaje: **pendiente**.

### Capacidades

- Doblado de lámina
- Fabricación de gabinetes
- Fabricación de brackets

### Tipos de trabajo

- Gabinetes y brackets a partir de lámina cortada
- Piezas de fabricación metálica bajo pedido

### Restricciones

- Un solo equipo: cuello de botella potencial; no hay datos de carga.
- Sin radios, espesores ni utillaje en el sistema.

### Dependencias

- Pieza cortada (Láser u otro) con frecuencia
- Soldadura / ensamble aguas abajo, según ruta
- Lámina e inventario ⬜

### Responsable sugerido

Supervisor de Producción. No hay rol RBAC «Operador Press Brake».

---

## Wire EDM

### Objetivo

Electroerosión por hilo de alta precisión.

### Descripción

Un equipo Wire EDM. Trabajos de herramental, moldes y geometrías que el CNC vertical no resuelve igual.

### Máquinas asociadas

1 Wire EDM. Recorrido, diámetro de hilo y materiales: **pendiente**.

### Capacidades

- Alta precisión
- Herramentales
- Moldes
- Geometrías complejas

### Tipos de trabajo

- Insertos / herramentales
- Cavidades o contornos de molde
- Piezas de geometría compleja de alta precisión

### Restricciones

- Un solo equipo. Tolerancias numéricas **no** están levantadas (no inventar ±).
- Relación con Moldeo (moldes) es de negocio, no hay FK ni flujo en código.

### Dependencias

- Material conductor / pieza premaquinada: no modelado
- Puede recibir trabajo desde CNC

### Responsable sugerido

Supervisor de Producción.

---

## Router CNC

### Objetivo

Corte de placas y materiales no metálicos.

### Descripción

Un Router CNC. **No** forma parte del centro CNC (metales). Centro propio.

### Máquinas asociadas

1 Router CNC. Marca, área de corte y husillo: **pendiente**.

### Capacidades

- Corte de placas
- Acrílico
- MDF
- Materiales no metálicos

### Tipos de trabajo

- Placas y paneles no metálicos
- Piezas de acrílico o MDF para prototipo, fixture o producto

### Restricciones

- No asumir corte de acero en este centro.
- Lista de materiales no metálicos más allá de acrílico y MDF: **pendiente**.

### Dependencias

- Placa / acrílico / MDF → Inventario ⬜
- Distinto tooling que CNC vertical

### Responsable sugerido

Supervisor de Producción. No hay rol «Operador Router» en RBAC.

---

## Rectificado

### Objetivo

Acabados de precisión y ajustes dimensionales.

### Descripción

Una Surface Grinder. Centro propio; no se agrupa con CNC.

### Máquinas asociadas

1 Surface Grinder. Mesa, piedra y tolerancias: **pendiente**.

### Capacidades

- Acabados de precisión
- Ajustes dimensionales

### Tipos de trabajo

- Acabado posterior a CNC o torno
- Ajuste dimensional de piezas que lo requieran

### Restricciones

- Un equipo. Capacidad de pieza (tamaño máximo) no levantada.

### Dependencias

- Pieza premaquinada (CNC / Tornos) con frecuencia
- Calidad para validar cota

### Responsable sugerido

Supervisor de Producción.

---

## Moldeo

### Objetivo

Inyección de piezas plásticas en corridas pequeñas.

### Descripción

Una máquina de inyección. Centro propio; no cuelga de Ensamble ni de CNC.

### Máquinas asociadas

1 equipo de inyección de plástico. Marca, tonelaje, cierre y materiales de resina: **pendiente**.

### Capacidades

- Producción de piezas plásticas
- Corridas pequeñas

### Tipos de trabajo

- Piezas plásticas de bajo/medio volumen
- Corridas pequeñas (tamaño de lote no cuantificado)

### Restricciones

- Un equipo. Moldes: el centro Wire EDM menciona moldes; no hay maestro de moldes.
- Resinas y temperaturas: no documentadas.

### Dependencias

- Resina / masterbatch → Inventario ⬜
- Molde (interno o de cliente): **pendiente de levantamiento**
- Wire EDM / CNC pueden fabricar herramental; no hay flujo persistido

### Responsable sugerido

Supervisor de Producción.

---

## Prototipado

### Objetivo

Prototipos rápidos, fixtures y herramentales ligeros por impresión 3D.

### Descripción

Una Ultimaker S5. Único equipo del inventario con **modelo confirmado**. Centro propio; no es CNC ni Router.

### Máquinas asociadas

1 impresora 3D **Ultimaker S5**.

### Capacidades

- Prototipos rápidos
- Fixtures
- Herramentales ligeros

### Tipos de trabajo

- Prototipos para cliente o ingeniería interna
- Fixtures de piso
- Herramental ligero (no sustituye Wire EDM / acero para moldes de producción)

### Restricciones

- Un equipo. Filamentos, volumen de impresión y perfiles: **pendiente**.
- No usar este centro para producción metálica.

### Dependencias

- Archivo 3D (STL u otro): hoy los adjuntos viven en la **cotización**, no en una OP.
- Filamento → Inventario ⬜
- Ingeniería para decidir si el prototipo es 3D, CNC o láser. Módulo ingeniería no existe.

### Responsable sugerido

Supervisor de Producción / Ingeniería (puesto de planta; no hay rol RBAC Ingeniería).

---

## Soldadura

### Objetivo

Unir componentes metálicos en la ruta de fabricación.

### Descripción

Capacidad de planta confirmada (BUSINESS_SPEC §1 y §17). **No hay máquinas numeradas** en el inventario de 2026-08-13.

### Máquinas asociadas

⬜ Pendiente: estaciones, procesos (MIG/TIG/etc.), cantidad.

### Capacidades

- Soldadura (servicio de AMD México)
- Fabricación metálica (a nivel empresa)

### Tipos de trabajo

- Ensamble soldado de lámina, brackets, gabinetes
- Paso de ruta típico después de láser/doblado o CNC

### Restricciones

- Sin inventario de estaciones no se puede programar carga.
- Certificaciones de soldador: no levantadas.

### Dependencias

- Piezas cortadas/dobladas/maquinadas
- Consumibles → Inventario ⬜
- Calidad / inspección visual o dimensional: no modelada

### Responsable sugerido

Supervisor de Producción. No existe rol «Operador Soldadura».

---

## Ensamble

### Objetivo

Ensamble de piezas y subconjuntos antes de calidad/entrega.

### Descripción

Capacidad de planta (§1, §17). Sin estaciones numeradas en el inventario de máquinas.

### Máquinas asociadas

⬜ Pendiente: mesas, estaciones, torque, kits.

### Capacidades

- Ensamble
- Cierre de ruta de fabricación bajo pedido

### Tipos de trabajo

- Subensambles y producto listo para inspección
- Integración de piezas CNC, lámina, plástico o impresas

### Restricciones

- Sin layout de estaciones. Moldeo ya no se asocia aquí.

### Dependencias

- Componentes de otros centros
- Inventario de herrajes ⬜
- Calidad aguas abajo

### Responsable sugerido

Supervisor de Producción.

---

## Calidad

### Objetivo

Inspección (primera pieza, en proceso, final). No fabrica. Ver [[Proceso Calidad]].

### Descripción

Centro de liberación, no de arranque de viruta. Sin instrumentos listados en el inventario de máquinas.

### Máquinas asociadas

⬜ Pendiente: CMM, durómetros, calibradores, etc. **No se inventa metrología.**

### Capacidades

- Inspección (BUSINESS_SPEC §27, no implementado)

### Tipos de trabajo

- Primera pieza, en proceso, final
- Liberación o rechazo hacia OP `Terminada` o retrabajo

### Restricciones

- Sin `quality_inspections`. Rol Calidad: solo `dashboard:read`.

### Dependencias

- OP en estado `Calidad`
- Plano de la RFQ (`documents` de cotización)

### Responsable sugerido

Inspector de Calidad. RBAC: rol **Calidad**.

---

## Nota de configuración

Este listado es **semilla**, no catálogo cerrado. Administración debe poder agregar centros (p. ej. desbarbado, pintura, empaque del ejemplo §16) sin migración de negocio aparte.

Las **máquinas** de cada centro son fichas administrables (crear, editar, desactivar, eliminar): [[Maquinas]], ADR-027. El responsable de una máquina es un usuario registrado.

Rutas que usan estos centros: [[Rutas de Fabricacion]].

Modelo operativo de piso **validado por Dirección** (ADR-030): [[Pendiente Validacion Direccion]].  
Datos técnicos de máquina aún por capturar en UI: [[Maquinas#Información pendiente de levantamiento]].
