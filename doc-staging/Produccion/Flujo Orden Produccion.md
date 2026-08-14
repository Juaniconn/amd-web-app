# Flujo Orden de Producción

Última actualización: 2026-08-13.  
Diseño de **Fase 5**. **Ninguna etapa posterior al pedido mínimo está implementada.** En escenario A, Ingeniería `Liberado` es entrada (ADR-031).

Ver [[Proceso Producción]], [[Proceso Ingenieria]], [[Estados Produccion]], [[Rutas de Fabricacion]], [[Centros de Trabajo]], [[Maquinas]], [[Operadores y Roles]], [[Pendiente Validacion Direccion]], ADR-023, ADR-025, ADR-027, ADR-028, ADR-029, ADR-031.

---

## Cadena vigente

```
RFQ
    ↓
Ingeniería
    ↓
Planeación
    ↓
Centro de Trabajo
    ↓
Máquina
    ↓
Operador
    ↓
Producción
    ↓
Calidad
    ↓
Entrega
```

Puente comercial ya persistido (no es un módulo nuevo):

```
RFQ aprobada ✅ → convertir → pedido mínimo orders.status = nuevo ✅ → OP ⬜
```

Trazabilidad de datos hoy:

```
customers ✅ → quotes ✅ → orders ✅ → production_orders ⬜
                                         → work_centers ⬜ → machines ⬜ → operador ⬜
```

La cadena anterior (material → centro → programación) se absorbe en **Ingeniería** (módulo Fase 4, CAD/liberación) y **Planeación** (piso, Fase 5). Material sigue siendo futuro (Inventario Fase 6).

Rutas semilla (qué centros, en qué orden): [[Rutas de Fabricacion]].

- **A** Pieza maquinada: RFQ → Ingeniería → CNC → Calidad → Entrega
- **B** Gabinete metálico: RFQ → Ingeniería → Láser → Press Brake → Soldadura → Calidad → Entrega
- **C** Pieza Wire EDM: RFQ → Ingeniería → CNC → Wire EDM → Calidad → Entrega

Otras rutas: el administrador las configura. Press Brake = máquina del centro Doblado.

---

## 1. RFQ

**Existe.**

- Alta `/quotes/new`: la RFQ es la cotización en `borrador` (ADR-024).
- Planos y specs: `documents` de la cotización.
- Partidas: descripción, número de parte, cantidad.
- Compromiso comercial: `aprobada` → **Convertir en pedido** → `convertida` + `orders` `AMD-YYYY-NNNNN`.
- **No** crea OP, no elige centro ni máquina (`convertQuoteToOrder`).

Sin conversión no hay fabricación en el sistema (ADR-025). Detalle: [[Proceso RFQ]].

---

## 2. Ingeniería

**No existe** como módulo ni como rol RBAC.

Diseño: revisar manufacturabilidad de lo cotizado y definir **ruta** (qué centros, en qué orden) antes de programar piso.

Entradas previstas:

- Plano / CAD de la RFQ
- Material y cantidad de la partida
- Capacidades de [[Centros de Trabajo]] (CNC metales vs Router no metales vs Láser vs 3D, etc.)

Salidas previstas (ninguna persistida):

- Ruta elegida (A, B, C o una configurable)
- Secuencia de centros de esa ruta
- Notas de proceso, fixtures
- Lista de material requerido (texto o SKU cuando exista Inventario)

No hay usuarios «Ingeniería» en RBAC. La **programación** posterior la hace el Supervisor de Producción (ADR-030). El paso de manufacturabilidad sigue siendo de proceso; Dirección no asignó un rol Ingeniería en esta validación.

---

## 3. Planeación

**No existe.** Sustituye/amplía la etapa que antes se llamaba solo «Programación».

Diseño, en orden:

1. Crear OP(s) desde el pedido (una o varias; Regla 2). Estado inicial `Pendiente`.
2. Liberar (`Liberada`) — permiso **Autorizar Producción**.
3. Comprobar material → si falta, `Esperando Material`. **Liberar Material** cuando Inventario exista.
4. Elegir centro según la ruta, máquina **Activa** y operador (**usuario registrado**). Permiso **Programar Máquinas** — **Supervisor de Producción**.
5. Asignar ventana, prioridad 1–4 y fecha prometida. Estado `Programada`. Calcular monitoreo En tiempo / En riesgo / Retrasada.

`quotes.lead_time` es texto. El pedido mínimo no tiene `promised_date`. **ADR-030 exige fecha prometida** como criterio 1 de prioridad: hay que persistirla en la OP.

Prioridad de la OP (aprobada): 1 Urgente · 2 Compromiso inmediato · 3 Programada · 4 Producción normal. La asignan Dirección, Ventas o Supervisor.

Monitoreo de atraso (además del estado de OP): **En tiempo / En riesgo / Retrasada**. Factores: material pendiente, máquina saturada, operador no asignado, retrabajo, cambio de prioridad.

---

## 4. Centro de Trabajo

**No existe en BD.** Catálogo semilla: [[Centros de Trabajo]].

Diseño: cada operación de la OP apunta a un centro. El centro restringe el tipo de máquina.

Ejemplos de asignación (reglas de negocio, no código):

| Trabajo | Centro |
|---|---|
| Maquinado aluminio/acero/inox | CNC |
| Eje, buje, rosca | Tornos |
| Corte de lámina metálica | Láser |
| Gabinete / bracket doblado | Doblado |
| Herramental / molde / geometría compleja | Wire EDM |
| Acrílico / MDF / placa no metálica | Router CNC |
| Acabado dimensional | Rectificado |
| Pieza plástica, corrida pequeña | Moldeo |
| Prototipo rápido / fixture 3D | Prototipado (Ultimaker S5) |
| Unión metálica | Soldadura |
| Subensamble | Ensamble |
| Inspección | Calidad |

No hay matriz persistida. Administración podrá ampliar centros (desbarbado, pintura, empaque).

---

## 5. Máquina

**No existe en BD.** Inventario: [[Maquinas]] (15 equipos conocidos).

Diseño: la operación programada apunta a una máquina **del centro elegido**. Estados de máquina §18 (Disponible, En producción, Ocupada, Mantenimiento, Fuera de servicio) no están persistidos.

Un Press Brake, un EDM, un router, una rectificadora, un inyector y una S5 son cuellos de botella de un solo recurso; no hay datos de cola.

---

## 6. Operador

**No existe** la asignación usuario↔OP.

Diseño: la operación tiene operador responsable. Puestos: [[Operadores y Roles]]. Matriz de habilidades **pendiente**.

RBAC hoy: el rol Producción no ve `/production`. Registrar avance exigirá `production:*` en la implementación.

El operador no cambia precios ni estados de cotización.

---

## 7. Producción

**No existe.**

Diseño: estado `En Producción`. El operador registra **horas máquina** (máquina, operador, orden, operación, inicio, fin, tiempo) y **horas hombre** (operador, orden, operación, inicio, fin, tiempo).

Tiempos estimado vs real (BUSINESS_SPEC §15) alimentan [[KPI Produccion]]. Setup: ⬜ no hay minutos levantados.

Ruta de varias operaciones: al terminar una, la siguiente operación (otro centro/máquina/operador) pasa a programable.

---

## 8. Calidad

**No existe.** Fase 7. [[Proceso Calidad]].

Diseño: última operación de fabricación → estado OP `Calidad`. **Liberar Calidad:** Inspector de Calidad (alternativa: Supervisor). → `Terminada`.

El pedido mínimo no tiene flag «requiere inspección»; el diseño asume que sí pasa por Calidad.

---

## 9. Entrega

**No existe.** Fase 8. [[Proceso Entregas]].

Diseño: OP `Terminada` → embarque → `Entregada` con permiso **Cerrar Orden**. Transportista y guía no existen.

---

## Responsable por etapa (diseño)

| Etapa | Permiso / quién | ¿Existe? |
|---|---|---|
| RFQ / convertir | `quotes:write` (Ventas) | Sí |
| Ingeniería | Proceso; rol no asignado en ADR-030 | No |
| Autorizar Producción | Permiso de negocio | No |
| Programar Máquinas | Supervisor de Producción | No |
| Prioridad 1–4 | Dirección, Ventas, Supervisor | No |
| Liberar Calidad | Inspector (alt. Supervisor) | No |
| Cerrar Orden | Tras liberación / Entregas | No |

No se asumen personas. Detalle: [[Operadores y Roles]].

---

## Modelo operativo (ADR-030)

Aprobado: programación (Supervisor), prioridades 1–4, monitoreo En tiempo / En riesgo / Retrasada, captura de tiempos, liberación Calidad.

Registro: [[Pendiente Validacion Direccion]].
