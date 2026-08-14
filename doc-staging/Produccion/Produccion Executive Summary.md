# Resumen ejecutivo — Módulo Producción

**Para:** Dirección General, AMD México  
**Fecha:** 2026-08-13  
**Estado:** Fase **5** — documentación de piso lista; **no implementar** hasta Ingeniería (Fase 4). El módulo **no está en operación** dentro de AMD Operations.

Documentos de detalle: [[Proceso Producción]], [[Flujo Orden Produccion]], [[roadmap]].

---

## Qué es el módulo Producción

Es el control de **piso de planta**: qué se fabrica, en qué máquina, en qué estado y para qué cliente.

No es el CRM ni la cotización. Esas piezas ya funcionan:

1. Se da de alta el cliente.
2. Se cotiza la RFQ (planos, partidas, precio, margen).
3. Si el cliente acepta, Ventas convierte la cotización en un **pedido interno** (número `AMD-…`).

Ahí se acaba el sistema **hoy**. Producción es el siguiente eslabón: convertir ese pedido en **órdenes de fabricación** visibles para Gerencia y para el taller.

---

## Qué problemas resuelve

Hoy esas preguntas de Dirección **no tienen respuesta en la plataforma**:

- ¿Qué estamos produciendo?
- ¿Qué máquinas están ocupadas?
- ¿Qué trabajo está parado por material?
- ¿Qué lote está en calidad?
- ¿Qué ya se puede entregar?

La planta sigue operando fuera del sistema (piso, Excel, WhatsApp). El riesgo no es técnico: es **pérdida de visibilidad** entre la venta cerrada y la entrega.

Producción, cuando se implemente, cierra esa brecha **sin** sustituir inventario, compras ni facturación (esas fases vienen después).

---

## Qué valor aporta a AMD México

AMD México (Ciudad Juárez) fabrica a maquila e industria: CNC, tornos, láser, press brake, Wire EDM, soldadura, ensamble, plástico, etc. Los trabajos van de piezas sueltas a proyectos grandes.

El valor de este módulo:

| Valor | Qué significa en operación |
|---|---|
| Trazabilidad | De la RFQ del cliente hasta la pieza en calidad/entrega |
| Una sola lista de trabajo | Órdenes de producción, no cotizaciones sueltas |
| Disciplina de piso | Estados claros: pendiente, programada, en máquina, parada, calidad, terminada |
| Base para material y compras | Mañana se sabrá qué OP espera placa o barra |
| Base para Dirección | KPIs reales, no estimaciones de pasillo |

Lo que **no** promete esta fase: existencias en almacén, órdenes de compra, CFDI, ni el tablero ejecutivo completo.

---

## Qué métricas permitirá medir

Cuando exista captura en planta (hoy **cero** de estas cifras en pantalla):

- Órdenes activas
- Órdenes retrasadas
- Horas máquina
- Utilización de máquinas
- Scrap
- Tiempo promedio de fabricación
- Carga por centro de trabajo
- Producción semanal
- Producción mensual

Definiciones: [[KPI Produccion]]. El dashboard actual **no** las muestra; solo deja el espacio para no inventar números.

---

## Qué hay que saber antes de implementar

- El pedido interno **ya se crea** al convertir la cotización. No hay que volver a capturar al cliente.
- Aún no hay pantallas de Pedidos ni de Producción; el menú las muestra apagadas.
- El rol «Producción» en el sistema hoy solo entra al inicio (dashboard). No ve el taller.
- Inventario y Compras no están; una OP podrá marcarse «esperando material» a mano, pero el sistema **no** descontará stock hasta esas fases.
- Planta documentada: **15 equipos** (5 CNC verticales, 2 tornos CNC, 2 láser, press brake, Wire EDM, router CNC, rectificadora, inyectora, Ultimaker S5). El único modelo confirmado es la S5. Faltan marcas, setups y turnos: ver [[Maquinas#Información pendiente de levantamiento]].

---

## Decisión de Dirección ya registrada

- Toda RFQ convertida alimenta una o más órdenes de producción (ADR-025), **después** de Ingeniería cuando el escenario A lo exige (ADR-031).
- Producción es la **Fase 5** del plan vigente (ADR-032). ADR-026 (Fase 4 = Producción) quedó reemplazada en numeración.
- Las máquinas las administra la plataforma (ADR-027). Las personas responsables son usuarios del sistema, no nombres fijos.
- Tres rutas iniciales (pieza maquinada, gabinete metálico, Wire EDM); el resto las configura el administrador (ADR-028).
- Prioridades 1–4, retrasos (En tiempo / En riesgo / Retrasada), horas máquina/hombre y KPI oficiales: **aprobados por Dirección** (ADR-030, [[Pendiente Validacion Direccion]]). Sin OEE en el módulo de Producción.

La implementación de software de piso **no ha empezado** y **no debe empezar** antes del diseño de Ingeniería. Esta carpeta deja el diseño de piso listo; no se reabre ADR-030.
