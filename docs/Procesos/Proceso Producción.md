# Proceso Producción

Última actualización: 2026-08-14.  
**Numeración vigente:** este módulo es **Fase 5** (ADR-032). El texto de diseño de piso que dice «Fase 4» en ADRs 025–030 es histórico de cuando Producción era la siguiente fase.  
Fuente de diseño: BUSINESS_SPEC §§15–18 y 41, ADR-025, ADR-026 (numeración reemplazada), **ADR-030**, **ADR-031**, **ADR-035**, **ADR-038**, **ADR-043**.  
Fuente de estado real: código en `src/` (no hay módulo de producción). Pedido mínimo sí trae `origin`.

Este proceso **no corre en AMD Operations**. Las reglas de negocio de piso **sí están aprobadas**. Ingeniería ya está implementada; **no implementar piso todavía**.

Ver [[Estados Produccion]], [[Flujo Orden Produccion]], [[Rutas de Fabricacion]], [[Centros de Trabajo]], [[Maquinas]], [[Operadores y Roles]], [[KPI Produccion]], [[Pendiente Validacion Direccion]], [[production]], [[Proceso Ingenieria]].

---

# Objetivo

Convertir un pedido comercial (originado en una RFQ convertida) en una o varias **órdenes de producción**, asignar centro de trabajo y máquina, registrar avance y dejar el producto listo para calidad y entrega.

Hoy: una cotización convertida ya crea `orders` + `order_items` en `nuevo` (ADR-023). **No** se crea OP.

---

# Flujo General

```
RFQ Aprobada ✅
    → Ingeniería (si aplica) ✅
    → Conversión a pedido mínimo ✅   (orders.status = nuevo, origin rfq_directa | rfq_ingenieria)
        → Planeación / OP ⬜
                → Centro de trabajo ⬜
                    → Máquina ⬜
                        → Operador ⬜
                            → Producción ⬜
                                → Calidad ⬜
                                    → Entrega ⬜
```

Detalle de cada etapa: [[Flujo Orden Produccion]].  
Rutas semilla A/B/C: [[Rutas de Fabricacion]].

---

# Responsables

## En el sistema (hoy)

| Rol RBAC | Permisos reales | Qué puede hacer en este proceso |
|---|---|---|
| Administrador | todos los del catálogo | Nada de producción: el módulo no existe |
| Dirección | `dashboard:read`, `quotes:read`, `customers:read` | Consulta CRM/RFQ. No ve OP |
| Ventas | `customers:*`, `quotes:*` | Convierte RFQ a pedido mínimo. No crea OP |
| Producción | `dashboard:read` + `engineering:read` | Entra al dashboard. Consulta planos. No ve `/production` |
| Calidad | `dashboard:read` | Igual |
| Almacén | `dashboard:read` | Igual |
| Compras | `dashboard:read` | Igual |

No existen permisos `production:*`, `orders:*`, `quality:*`. Tampoco Autorizar Producción, Liberar Material, Programar Máquinas, Liberar Calidad ni Cerrar Orden.

## En la operación de planta (aprobado por Dirección, ADR-030)

| Puesto | Responsabilidad aprobada |
|---|---|
| Supervisor de Producción | Programar: asignar órdenes, máquinas, operadores; balancear carga; ajustar prioridades |
| Dirección General | Priorizar (con Ventas y Supervisor); **autorizar compras urgentes** |
| Ventas | Priorizar (con Dirección y Supervisor) |
| Inspector de Calidad | Liberar producto terminado (principal) |
| Supervisor de Producción | Liberar producto (alternativa si no hay inspector) |
| Operadores | Ejecutar OP asignada; registrar horas máquina/hombre (inicio/fin) |
| Gerente de Operaciones | Compras urgentes **en el futuro**; no existe en RBAC |

Permisos de negocio (aún no en catálogo): [[Operadores y Roles]]. Usuarios registrados; no personas concretas.

---

# Entradas

## Ya persistidas (Fase 3)

- Cliente (`customers.id`) y contacto opcional
- Cotización `convertida` (`quotes.id`, número `COT-YYYY-NNNNN`)
- Pedido mínimo (`orders.id`, número `AMD-YYYY-NNNNN`, estado `nuevo`)
- Partidas comerciales: descripción, número de parte, cantidad, unidad, precios (`order_items`; copiadas de `quote_items` **sin** costo estimado)
- Archivos de la cotización (`documents` con `entity_type = quote`)
- Tiempo de entrega cotizado: texto libre `quotes.lead_time` (no es fecha de piso)

## Diseñadas, no persistidas

- Número de OP
- Centro de trabajo y máquina
- Operador
- Fecha prometida de piso — la fija el **Gerente de Producción / Planeación** (ADR-043). Criterio 1 de prioridad (ADR-030). **No persistida.**
- Prioridad 1–4 (Urgente / Compromiso inmediato / Programada / Producción normal)
- Monitoreo de atraso: En tiempo / En riesgo / Retrasada
- Ruta de operaciones (plantilla A/B/C o ruta configurable)
- Máquina (ficha administrable: nombre, marca, modelo, año, centro, responsable usuario, horas/turno, capacidad, activo, fechas)
- Material requerido / reservado / consumido
- Tiempo estimado y tiempo real
- Archivos de la OP (planos de piso, fotos)

---

# Salidas

## Hoy

Ninguna entidad de producción. Convertir RFQ no emite OP.

## Diseñadas (Fase 5)

- Orden(es) de producción ligadas al pedido
- Estado de piso visible para Producción y Dirección
- Avance y tiempos (cuando se registren)
- Señal de «listo para calidad» y, después, «listo para entrega»

No hay PDF, etiqueta ni reporte de piso en el sistema.

---

# Estados

Estados operativos de la OP (diseño Fase 5; **no** están en PostgreSQL):

| Estado | Intención |
|---|---|
| Pendiente | OP creada; aún no liberada a piso |
| Liberada | Autorizada para programar |
| Programada | Centro/máquina y ventana asignados |
| En Producción | Fabricándose |
| Pausada | Interrumpida con motivo |
| Esperando Material | Bloqueada por faltante (Inventario/Compras aún no existen) |
| Calidad | En inspección |
| Terminada | Fabricación concluida; pendiente de entrega logística |
| Entregada | Liberada a Entregas / cliente |
| Cancelada | No se fabrica |

Máquina de transiciones: [[Estados Produccion]].

BUSINESS_SPEC §15 listaba un conjunto más corto (Pendiente, Preparación, En producción, Pausada, Calidad, Terminada, Cancelada). El conjunto de esta fase **amplía** ese diseño; no está implementado.

El pedido comercial solo admite `nuevo`. No sigue los estados de la OP.

---

# Prioridad (aprobada)

| Nivel | Nombre |
|---|---|
| 1 | Urgente |
| 2 | Compromiso inmediato |
| 3 | Programada |
| 4 | Producción normal |

Criterios de ordenación: (1) fecha prometida, (2) cliente estratégico, (3) disponibilidad de material, (4) capacidad instalada, (5) urgencias aprobadas.

Quién puede cambiar prioridad: Dirección General, Ventas, Supervisor de Producción.

---

# Monitoreo de retrasos (aprobado)

Además del estado de OP:

| Monitoreo | Uso |
|---|---|
| En tiempo | Dentro de fecha prometida |
| En riesgo | Factores de atraso sin vencer aún |
| Retrasada | Incumple fecha prometida |

Factores: material pendiente, máquina saturada, operador no asignado, retrabajo, cambio de prioridad.

Causas a registrar: material faltante, cambio de prioridad, sobrecarga de máquina, error de programación, retrabajo, espera de aprobación cliente.

Impacto económico (orden Dirección): retrasos de entrega → compras urgentes → tiempo muerto → retrabajos → falta de material.

---

# Captura de tiempos (aprobada)

**Horas máquina:** máquina, operador, orden, operación, inicio, fin, tiempo consumido.  
**Horas hombre:** operador, orden, operación, inicio, fin, tiempo consumido.

No OEE en el módulo de Producción (ADR-030).

---

# Liberación y cierre de OP (aprobado)

```
Producción → Calidad → Liberación física → Cierre administrativo → Entrega
```

| Cierre | Responsable | Permiso de negocio (diseño) |
|---|---|---|
| **Físico** (producto conforme) | Inspector de Calidad | Liberar Calidad |
| **Administrativo** (cerrar la orden) | Supervisor de Producción | Cerrar Orden |

Alternativa de liberación de producto si no hay inspector: Supervisor de Producción (ADR-030). El cierre administrativo **no** lo hace Calidad (ADR-043).

Producción (Fase 5) **solo** puede usar planos, modelos y programas CAM en estado **Liberado / Aprobado para manufactura** (ADR-038). Origen `rfq_ingenieria` exige solicitud `liberado`. Origen `rfq_directa` usa adjuntos de RFQ.

---

# Tiempos muertos oficiales (ADR-043)

Catálogo de pausa de OP (no persistido):

| Código operativo | Motivo |
|---|---|
| Falla mecánica | Máquina caída |
| Setup | Preparación |
| Falta de material | Insumo |
| Espera de calidad | Inspección |
| Falta de operador | Recurso humano |
| Espera de programa | CAM / Mastercam / Fusion 360 no Liberado |
| Espera de plano | Paquete de ingeniería no Liberado |

---

# Fecha prometida y cliente estratégico

**Fecha prometida:** Gerente de Producción / Planeación. Criterio 1 de prioridad.

**Cliente estratégico** (criterio 2; flag CRM ⬜): alto volumen, buen historial de pago, sector estratégico, potencial de crecimiento.

---

# Reglas de Negocio

Tomadas de BUSINESS_SPEC §41 y del código de RFQ. Solo las de RFQ/pedido son ejecutables hoy.

| # | Regla | ¿Ejecutable hoy? |
|---|---|---|
| 1 | Cotización aprobada puede convertirse en pedido | ✅ `convertQuoteToOrder` |
| 2 | Un pedido puede generar una o varias OP | ⬜ |
| 3 | Una OP puede requerir varios materiales | ⬜ (Inventario no existe) |
| 4 | El material puede reservarse para una OP | ⬜ |
| 5 | Si el disponible es insuficiente, alerta de faltante | ⬜ |
| 9 | OP terminada pasa por calidad cuando el pedido lo requiera | ⬜ (Calidad no existe) |
| 10 | Cambios importantes en auditoría | ✅ parcial en cotización/pedido; ⬜ en OP |

Reglas adicionales de diseño (ADR-025), no código:

1. No crear OP desde RFQ `aprobada` sin conversión. El disparador es `convertida`.
2. La OP referencia `orders.id`; no sustituye al pedido comercial.
3. No asignar máquina que no pertenezca al centro de trabajo de la operación.
4. Cancelar una OP no borra el pedido ni la cotización.
5. Datos `is_demo = true` no son producción real de AMD.
6. No inventar capacidades técnicas de máquinas (BUSINESS_SPEC §17).

---

# Centros de Trabajo

Diseñados para AMD México (Ciudad Juárez). Catálogo: [[Centros de Trabajo]].

| Centro | Existe en BD | Existe en UI |
|---|---|---|
| CNC | No | No |
| Tornos | No | No |
| Láser | No | No |
| Doblado | No | No |
| Wire EDM | No | No |
| Router CNC | No | No |
| Rectificado | No | No |
| Moldeo | No | No |
| Prototipado | No | No |
| Soldadura | No | No |
| Ensamble | No | No |
| Calidad | No | No |

`/production` y `/machines` están en el sidebar deshabilitados (`src/lib/navigation.ts`, aún etiquetados «Fase 5»).

---

# KPI

Ningún KPI de producción se calcula. El dashboard muestra placeholders sin cifra:

- «Órdenes de producción · Fase 5» (etiqueta de código; la fase vigente es 4)
- «Máquinas ocupadas · Fase 5»

Métricas objetivo: [[KPI Produccion]].

---

# Integración con RFQ

Ver [[Proceso RFQ]] y [[rfq]].

Hoy:

```
Cliente CRM
    → /quotes/new (RFQ = quotes.borrador)
    → … → aprobada
    → Convertir en pedido
    → orders + order_items (nuevo)
    → OP ⬜
```

- Ventas convierte; Producción no opera cotizaciones (`quotes:*` no está en el rol Producción).
- Las partidas de piso deberán nacer de `order_items` (descripción, `part_number`, cantidad, unidad).
- Los planos vigentes, si hubo ingeniería, viven en documentos de la **solicitud Liberada**, no en un adjunto suelto de WhatsApp. Si origen `rfq_directa`, sí en la cotización.
- `quotes.lead_time` es texto; no programa la OP.

Diseño (ADR-025): al existir el módulo de Producción, la conversión (o un paso inmediato sobre el pedido recién creado) emite OP, **después** de Ingeniería `Liberado` en escenario A (ADR-031). **Ese paso no está implementado.**

---

# Integración futura con Inventario

Módulo [[inventory]] — ⬜ Fase 5 vigente. No hay `materials`, existencias, reservas ni movimientos.

Cuando exista (BUSINESS_SPEC §§19–22, ADR-009):

1. La OP declara material requerido.
2. El sistema calcula Disponible = Existencia − Reservado.
3. Si alcanza: reserva ligada a la OP (no movimiento silencioso).
4. Si no alcanza: faltante visible y estado `Esperando Material`.
5. Al fabricar: movimiento de **consumo de producción**.
6. Cancelar/liberar OP: movimiento de **liberación** de reserva.

Fase 5 **no** implementa inventario. Puede capturar «material requerido» como texto o lista no valorizada solo si la implementación lo decide; no hay existencias que descontar.

---

# Integración futura con Compras

Módulo [[purchasing]] — ⬜ Fase 6 vigente. No hay proveedores ni OC.

Cuando exista (BUSINESS_SPEC §§23–25):

1. El faltante de una OP puede generar solicitud de compra.
2. La recepción actualiza inventario y «las órdenes de producción afectadas» (§25 punto 5).
3. La OP puede salir de `Esperando Material` cuando el disponible cubra la reserva.

Fase 5 **no** crea solicitudes de compra.

---

# Relación con Pedidos (no es esta fase)

`/orders` deshabilitado. El pedido no tiene PO del cliente, fecha prometida, prioridad ni estados más allá de `nuevo` (BUSINESS_SPEC §§13–14).

Producción se ancla a ese registro mínimo. No se construye la vista completa de pedidos en Fase 5 (ADR-026: UI de Pedidos diferida).

---

# Modelo operativo validado (ADR-030)

Dirección General aprobó el modelo el 2026-08-13. Registro: [[Pendiente Validacion Direccion]].

**No hay código.** El diseño técnico de Fase 5 debe implementar estas reglas de piso, no reabrirlas. Catálogos 2026-08-14: ADR-043 (fecha prometida, cliente estratégico, tiempos muertos, retrabajos, material crítico, compras urgentes, cierre OP). Ingeniería entrega el sello Liberado (ADR-038).

