# PROMPT MAESTRO — AMD OPERATIONS MVP

## 1. CONTEXTO DEL PROYECTO

Quiero que construyas una aplicación web interna para mi empresa:

**AMD México / AMD Automatización**

Empresa ubicada en **Ciudad Juárez, Chihuahua, México**, dedicada principalmente a manufactura y servicios industriales B2B para empresas y maquiladoras.

Servicios principales:

- Maquinado CNC
- Torneado
- Corte láser
- Doblado / Press Brake
- Wire EDM
- Fresado convencional
- Rectificado
- Inyección de plástico
- Router CNC
- Soldadura
- Ensamble
- Fabricación de piezas personalizadas
- Proyectos industriales

AMD trabaja principalmente con clientes industriales y maquiladoras. Los pedidos pueden ir desde trabajos pequeños hasta proyectos de más de $50,000 USD.

Actualmente AMD **NO tiene un ERP implementado**.

### RESTRICCIÓN IMPORTANTE

NO asumas que AMD tiene ERPNext.

NO conectes la aplicación con ERPNext.

NO diseñes el sistema dependiendo de ERPNext.

NO propongas una migración a ERPNext.

La aplicación debe ser un sistema independiente, con su propia base de datos y arquitectura.

El objetivo es construir una plataforma interna llamada:

# AMD OPERATIONS

Esta plataforma será el centro operativo de AMD.

---

# 0. ESTADO DE IMPLEMENTACIÓN

**Fecha de este estado:** 2026-08-13  
**Fase actual:** ninguna en desarrollo. Fase 2 CRM está **✅ Completada**. Siguiente fase autorizada: **Fase 3 — Cotizaciones**.

Este bloque describe lo que **existe en el código**. El resto del documento (el prompt maestro) sigue siendo la visión del producto; no se reescribe.

Leyenda: ✅ Completado · 🔄 En progreso · ⬜ Pendiente

## Alcance real hoy

| Área | Estado | Evidencia en código |
|---|---|---|
| Fundación (app, auth, RBAC, layout, usuarios, roles, dashboard inicial) | ✅ Completado | Fase 1, commit `33187cb` |
| CRM: clientes, contactos, ficha, historial | ✅ Completado | `src/features/customers`, `src/db/schema/crm.ts`, `activity.ts` |
| Cotizaciones / RFQ | ⬜ Pendiente | Sin tablas, rutas ni acciones |
| Pedidos | ⬜ Pendiente | Sidebar deshabilitado |
| Producción y máquinas | ⬜ Pendiente | — |
| Inventario | ⬜ Pendiente | — |
| Compras y proveedores | ⬜ Pendiente | — |
| Calidad y entregas | ⬜ Pendiente | — |
| Reportes / Centro de Operaciones | ⬜ Pendiente | Dashboard solo KPIs de fundación + clientes activos |
| Documentos / R2 / Workers / D1 / KV | ⬜ Pendiente | No hay `wrangler`, ni credenciales R2 en código |

## Módulos de negocio

| Módulo | Spec | Estado |
|---|---|---|
| §7 Clientes | Este documento | ✅ Completado (Fase 2) |
| §8 Contactos | Este documento | ✅ Completado (Fase 2) |
| §9–12 Cotizaciones | Este documento | ⬜ Pendiente |
| §13–14 Pedidos | Este documento | ⬜ Pendiente |
| §15–18 Producción | Este documento | ⬜ Pendiente |
| §19–22 Inventario | Este documento | ⬜ Pendiente |
| §23–26 Compras | Este documento | ⬜ Pendiente |
| §27 Calidad | Este documento | ⬜ Pendiente |
| §28 Entregas | Este documento | ⬜ Pendiente |
| §29–30 Costos / finanzas | Este documento | ⬜ Pendiente |
| §32 Documentos | Este documento | ⬜ Pendiente |
| §33 Usuarios | Este documento | ✅ Completado (Fase 1) |
| §34 Auditoría | Este documento | ✅ Parcial: `activity_logs` en CRM; no hay log global de todo el sistema |
| §35 Notificaciones | Este documento | ⬜ Pendiente |
| §36 Búsqueda global | Este documento | ⬜ Pendiente |
| §51 Centro de Operaciones | Este documento | ⬜ Pendiente |

## Dependencias entre módulos

```
Fase 1 Fundación ✅
    └── Fase 2 CRM ✅
            └── Fase 3 Cotizaciones ⬜
                    └── Fase 4 Pedidos ⬜
                            ├── Fase 5 Producción ⬜
                            ├── Fase 6 Inventario ⬜
                            └── Fase 7 Compras ⬜
                                    └── Fase 8 Calidad y entregas ⬜
                                            └── Fase 9 Reportes ⬜
```

## Criterio de éxito del MVP (§54)

Solo el paso 1 («Crear cliente») está implementado. Los pasos 2–22 permanecen ⬜.

## Dónde leer el detalle

- Roadmap: [[roadmap]]
- Módulo CRM: [[crm]]
- Changelog: [[phase-2]]
- Auditoría: [[phase-2-audit]]
- Resumen Dirección: [[phase-2-summary]]

---


# 2. OBJETIVO PRINCIPAL

Quiero una aplicación web que permita controlar de manera centralizada:

- Clientes
- Contactos
- Cotizaciones
- Pedidos
- Órdenes de producción
- Materiales
- Inventario
- Compras
- Proveedores
- Máquinas
- Producción
- Calidad
- Entregas
- Costos
- Rentabilidad
- Documentos
- Usuarios
- Actividad de la empresa

La aplicación debe permitir conocer en cualquier momento:

> ¿Qué estamos vendiendo?

> ¿Qué pedidos tenemos?

> ¿Qué estamos produciendo?

> ¿Qué está atrasado?

> ¿Qué material necesitamos?

> ¿Qué tenemos que comprar?

> ¿Qué máquinas están ocupadas?

> ¿Qué pedidos están por entregarse?

> ¿Cuánto estamos vendiendo?

> ¿Cuánto nos está costando?

> ¿Cuánto estamos ganando?

---

# 3. PRINCIPIO FUNDAMENTAL

No quiero un ERP genérico.

Quiero un sistema diseñado específicamente alrededor de los procesos reales de una empresa de manufactura como AMD.

La aplicación debe priorizar:

1. Simplicidad
2. Velocidad
3. Trazabilidad
4. Información centralizada
5. Automatización
6. Facilidad de uso
7. Escalabilidad

No construyas funciones innecesarias.

Primero construye un MVP sólido.

---

# 4. FLUJO PRINCIPAL DEL NEGOCIO

El flujo principal debe ser:

CLIENTE

↓

COTIZACIÓN

↓

COTIZACIÓN APROBADA

↓

PEDIDO

↓

ORDEN DE PRODUCCIÓN

↓

REVISIÓN DE MATERIAL

↓

RESERVA DE MATERIAL

↓

COMPRA DE MATERIAL SI ES NECESARIO

↓

RECEPCIÓN DE MATERIAL

↓

PRODUCCIÓN

↓

CALIDAD

↓

PEDIDO LISTO

↓

ENTREGA

↓

PEDIDO CERRADO

Este flujo debe estar conectado.

No quiero módulos aislados.

---

# 5. DASHBOARD PRINCIPAL

El Dashboard será la pantalla principal de AMD Operations.

Debe mostrar información en tiempo real desde la base de datos.

## KPIs principales

### Ventas

- Ventas de hoy
- Ventas del mes
- Ventas del año
- Número de pedidos
- Ticket promedio

### Operaciones

- Pedidos activos
- Pedidos pendientes
- Pedidos atrasados
- Órdenes de producción activas
- Órdenes próximas a vencer
- Producción completada

### Inventario

- Materiales disponibles
- Materiales reservados
- Materiales críticos
- Materiales por comprar
- Valor estimado del inventario

### Compras

- Órdenes de compra pendientes
- Compras del mes
- Material pendiente de recepción

### Producción

- Máquinas ocupadas
- Máquinas disponibles
- Máquinas en mantenimiento
- Órdenes en producción

### Finanzas operativas

- Ventas
- Costos estimados
- Utilidad estimada
- Cuentas por cobrar
- Compras pendientes

---

# 6. EJEMPLO DEL DASHBOARD

Debe poder mostrar algo parecido a:

VENTAS HOY
$18,450

PEDIDOS
12

PENDIENTES
5

PRODUCCIÓN
7

MATERIAL POR COMPRAR
3

COMPRAS PENDIENTES
4

MÁQUINAS OCUPADAS
8 / 17

ENTREGAS PRÓXIMAS
3

Debajo debe existir una sección:

## REQUIERE ATENCIÓN

Ejemplos:

🔴 Pedido atrasado

🟠 Material insuficiente

🟡 Orden de compra pendiente

🟡 Entrega próxima

🔴 Máquina detenida

---

# 7. MÓDULO CLIENTES

> **Estado 2026-08-13:** ✅ Implementado (Fase 2). Cotizaciones, pedidos, producción, facturación, pagos y documentos en la ficha son placeholders. Ver [[crm]].

Crear módulo:

# Clientes

Campos:

- ID
- Nombre de empresa
- Nombre comercial
- RFC
- Contacto principal
- Teléfono
- Email
- Dirección
- Ciudad
- Estado
- País
- Tipo de cliente
- Estado
- Notas
- Fecha de creación

Cada cliente debe tener una vista detallada.

## Dentro del cliente

Mostrar:

- Información general
- Contactos
- Cotizaciones
- Pedidos
- Órdenes de producción
- Facturación / ventas
- Pagos
- Documentos
- Notas
- Historial de actividad

Debe ser posible navegar:

Cliente → Cotización → Pedido → Producción.

---

# 8. MÓDULO CONTACTOS

> **Estado 2026-08-13:** ✅ Implementado (Fase 2). Ver [[crm]].

Un cliente puede tener varios contactos.

Campos:

- Nombre
- Cargo
- Email
- Teléfono
- WhatsApp
- Departamento
- Contacto principal
- Notas

---

# 9. MÓDULO COTIZACIONES

Crear:

# Cotizaciones

Cada cotización debe tener:

- Número automático
- Cliente
- Contacto
- Fecha
- Fecha de vencimiento
- Responsable
- Moneda
- Condiciones de pago
- Tiempo de entrega
- Estado
- Notas
- Archivos

Estados:

- Borrador
- Enviada
- En revisión
- Aprobada
- Rechazada
- Expirada
- Convertida en pedido

---

# 10. PARTIDAS DE COTIZACIÓN

Cada cotización puede tener múltiples partidas.

Campos:

- Descripción
- Número de parte
- Cantidad
- Unidad
- Precio unitario
- Descuento
- Impuesto
- Total
- Costo estimado
- Margen
- Utilidad estimada

El sistema debe calcular:

Subtotal

Impuestos

Total

Costo estimado

Utilidad estimada

Margen %

---

# 11. ARCHIVOS DE COTIZACIÓN

Las cotizaciones pueden tener:

- PDF
- Excel
- Word
- DXF
- DWG
- STEP
- STL
- Imágenes
- Planos
- Especificaciones

El sistema debe permitir asociar archivos al cliente, cotización, pedido u orden de producción.

---

# 12. CONVERSIÓN DE COTIZACIÓN A PEDIDO

Cuando una cotización sea aprobada debe existir un botón:

# CONVERTIR EN PEDIDO

Esto debe crear automáticamente un pedido utilizando la información de la cotización.

No duplicar manualmente la información.

Debe conservarse la relación:

Cotización #XXX

↓

Pedido #XXX

---

# 13. MÓDULO PEDIDOS

Crear:

# Pedidos

Cada pedido debe contener:

- Número de pedido AMD
- Cliente
- PO del cliente
- Cotización relacionada
- Fecha
- Fecha prometida
- Prioridad
- Responsable
- Moneda
- Total
- Estado
- Notas
- Archivos

Estados:

1. Nuevo
2. Confirmado
3. Pendiente de material
4. En producción
5. Calidad
6. Listo para entrega
7. Entregado
8. Cerrado
9. Cancelado

---

# 14. VISTA DEL PEDIDO

Cuando abra un pedido quiero poder ver:

## Información general

Cliente

PO

Fecha

Fecha de entrega

Responsable

Estado

## Productos

Partes

Cantidades

Precios

## Producción

Órdenes de producción relacionadas

## Material

Material requerido

Material reservado

Material faltante

## Compras

Órdenes de compra relacionadas

## Calidad

Inspecciones

## Entrega

Estado de entrega

## Documentos

Todos los archivos asociados.

## Historial

Toda actividad realizada sobre el pedido.

---

# 15. MÓDULO PRODUCCIÓN

Crear:

# Órdenes de Producción

Cada orden debe contener:

- Número
- Pedido relacionado
- Cliente
- Número de parte
- Cantidad
- Fecha de inicio
- Fecha prometida
- Prioridad
- Responsable
- Máquina
- Operador
- Estado
- Tiempo estimado
- Tiempo real
- Material requerido
- Material consumido
- Notas
- Archivos

Estados:

- Pendiente
- Preparación
- En producción
- Pausada
- Calidad
- Terminada
- Cancelada

---

# 16. PROCESOS DE PRODUCCIÓN

Una pieza puede requerir múltiples procesos.

Ejemplo:

1. CNC
2. Desbarbado
3. Soldadura
4. Pintura
5. Inspección
6. Empaque

La aplicación debe permitir crear una ruta de producción.

Ejemplo:

PEDIDO

↓

OP-001

↓

CNC

↓

SOLDADURA

↓

PINTURA

↓

CALIDAD

↓

TERMINADO

---

# 17. CENTROS DE TRABAJO Y MÁQUINAS

AMD actualmente cuenta con equipos como:

### CNC VMC

- VMC #1
- VMC #2
- VMC #3
- VMC #4
- VMC #5

### Tornos

- Torno #1
- Torno #2

### Láser

- Láser #1
- Láser #2

### Otros

- Press Brake
- Wire EDM
- Fresadoras manuales
- Surface Grinder
- Injection Molding
- Router CNC
- Soldadura
- Ensamble

No inventes características técnicas de las máquinas.

Permite que el administrador las configure.

---

# 18. ESTADOS DE MÁQUINAS

Cada máquina debe tener:

- Disponible
- En producción
- Ocupada
- Mantenimiento
- Fuera de servicio

Dashboard visual:

🟢 Disponible

🔵 Producción

🟡 Mantenimiento

🔴 Fuera de servicio

---

# 19. INVENTARIO

Crear:

# Inventario

El sistema debe manejar principalmente materia prima, consumibles y productos.

Cada material debe tener:

- SKU
- Nombre
- Categoría
- Tipo
- Material
- Dimensiones
- Unidad
- Existencia
- Reservado
- Disponible
- Stock mínimo
- Stock máximo
- Ubicación
- Proveedor principal
- Costo promedio
- Estado

---

# 20. ESTADOS DE INVENTARIO

Calcular automáticamente:

Disponible = Existencia - Reservado

Si Disponible <= Stock mínimo:

⚠️ MATERIAL CRÍTICO

Si Disponible <= 0:

🔴 SIN EXISTENCIA

---

# 21. MOVIMIENTOS DE INVENTARIO

Registrar:

- Entrada
- Salida
- Reserva
- Liberación
- Ajuste
- Transferencia
- Consumo de producción
- Recepción de compra

Cada movimiento debe registrar:

- Fecha
- Usuario
- Material
- Cantidad
- Tipo
- Motivo
- Documento relacionado

Nunca modificar inventario silenciosamente.

Todo cambio debe generar un movimiento.

---

# 22. RESERVA DE MATERIAL

Cuando una orden de producción requiera material:

El sistema debe comprobar inventario.

Ejemplo:

Material requerido:

20 piezas

Disponible:

12 piezas

Resultado:

🔴 Faltan 8 piezas

El sistema debe permitir generar una solicitud de compra.

---

# 23. MÓDULO COMPRAS

Crear:

# Compras

Flujo:

Solicitud de compra

↓

Orden de compra

↓

Enviada al proveedor

↓

Confirmada

↓

Parcialmente recibida

↓

Recibida

↓

Cerrada

---

# 24. ÓRDENES DE COMPRA

Cada OC debe tener:

- Número
- Proveedor
- Fecha
- Fecha esperada
- Responsable
- Estado
- Moneda
- Condiciones
- Items
- Subtotal
- Impuestos
- Total
- Notas
- Archivos

---

# 25. RECEPCIÓN DE MATERIAL

Cuando llegue material:

Usuario abre OC.

Selecciona:

# RECIBIR MATERIAL

Indica:

Cantidad recibida.

El sistema automáticamente:

1. Actualiza inventario.
2. Crea movimiento de entrada.
3. Actualiza la OC.
4. Actualiza material disponible.
5. Actualiza las órdenes de producción afectadas.

---

# 26. PROVEEDORES

Crear módulo:

# Proveedores

Datos:

- Empresa
- RFC
- Contacto
- Email
- Teléfono
- Dirección
- Materiales suministrados
- Condiciones de pago
- Tiempo de entrega
- Notas
- Estado

Historial:

- Compras
- Órdenes de compra
- Recepciones
- Costos
- Incidencias

---

# 27. CALIDAD

Crear módulo básico:

# Calidad

Una orden puede tener inspecciones.

Campos:

- Orden
- Número de parte
- Inspector
- Fecha
- Cantidad inspeccionada
- Cantidad aprobada
- Cantidad rechazada
- Resultado
- Notas
- Archivos
- Fotografías

Resultados:

- Aprobado
- Aprobado con observaciones
- Rechazado

---

# 28. ENTREGAS

Crear:

# Entregas

Cada entrega:

- Pedido
- Cliente
- Fecha
- Responsable
- Transportista
- Número de guía
- Cantidad
- Estado
- Evidencia
- Notas

Estados:

- Pendiente
- Preparando
- Enviado
- Entregado
- Incidencia

---

# 29. COSTOS Y RENTABILIDAD

El sistema debe diferenciar:

## Precio de venta

vs.

## Costo estimado

vs.

## Costo real

Permitir controlar:

- Material
- Mano de obra
- Tiempo máquina
- Procesos externos
- Envío
- Otros costos

Calcular:

Utilidad estimada

Utilidad real

Margen %

Esto debe poder verse por:

- Cotización
- Pedido
- Cliente
- Proyecto

---

# 30. FINANZAS OPERATIVAS

NO crear un sistema contable fiscal completo.

El objetivo es control operativo.

Debe permitir registrar:

- Venta
- Pago
- Saldo
- Compra
- Pago a proveedor
- Cuenta por cobrar
- Cuenta por pagar

La contabilidad fiscal permanecerá fuera de AMD Operations.

---

# 31. PROYECTOS

Algunos trabajos pueden ser proyectos completos.

Crear:

# Proyectos

Un proyecto puede contener:

- Cliente
- Cotizaciones
- Pedidos
- Órdenes de producción
- Compras
- Materiales
- Entregas
- Documentos
- Costos
- Utilidad

---

# 32. DOCUMENTOS

Crear un sistema central de documentos.

Los archivos pueden estar relacionados con:

- Cliente
- Cotización
- Pedido
- Producción
- Compra
- Proveedor
- Calidad
- Proyecto

Tipos:

PDF

Excel

Word

DXF

DWG

STEP

STL

PNG

JPG

etc.

---

# 33. USUARIOS

Crear autenticación.

Roles iniciales:

### Administrador

Acceso completo.

### Dirección

Dashboard, ventas, producción, compras, inventario, costos y reportes.

### Ventas

Clientes, cotizaciones y pedidos.

### Compras

Proveedores, compras e inventario.

### Producción

Órdenes de producción, máquinas y materiales.

### Calidad

Inspecciones y producción.

### Almacén

Inventario, entradas, salidas y recepción.

Cada usuario debe tener permisos adecuados.

---

# 34. AUDITORÍA

Toda operación importante debe registrar:

- Usuario
- Fecha
- Acción
- Registro afectado
- Valor anterior
- Valor nuevo

Ejemplo:

"Juan cambió el estado del pedido AMD-00182 de Producción a Calidad."

---

# 35. NOTIFICACIONES

Crear sistema de alertas.

Ejemplos:

⚠️ Material debajo del mínimo.

🔴 Pedido atrasado.

🟡 Entrega próxima.

⚠️ Orden de compra retrasada.

🔴 Máquina fuera de servicio.

⚠️ Cotización próxima a vencer.

---

# 36. BÚSQUEDA GLOBAL

Debe existir una búsqueda global.

Buscar:

- Cliente
- Cotización
- Pedido
- PO
- Orden de producción
- Material
- SKU
- Proveedor
- Orden de compra
- Máquina

---

# 37. FILTROS

Todos los módulos deben tener:

- Búsqueda
- Filtros
- Ordenamiento
- Paginación
- Estados
- Fechas
- Exportación cuando sea útil

---

# 38. DISEÑO

Quiero una interfaz profesional B2B industrial.

No quiero que parezca una plantilla genérica.

Debe sentirse como software empresarial moderno.

Sidebar:

Dashboard

Clientes

Cotizaciones

Pedidos

Producción

Inventario

Compras

Proveedores

Máquinas

Calidad

Entregas

Proyectos

Reportes

Configuración

---

# 39. EXPERIENCIA DE USUARIO

Prioriza:

- Pocos clics
- Información clara
- Tablas profesionales
- Estados visuales
- Acciones rápidas
- Formularios simples
- Dashboard útil

Cada registro debe tener una página de detalle.

Ejemplo:

Pedido #AMD-2026-00182

Debe mostrar toda la información relacionada sin tener que buscarla manualmente en otros módulos.

---

# 40. BASE DE DATOS

Diseña una base de datos relacional correctamente normalizada.

Como mínimo considera entidades:

users

roles

permissions

customers

contacts

quotes

quote\_items

orders

order\_items

production\_orders

production\_operations

work\_centers

machines

materials

inventory

inventory\_movements

material\_reservations

suppliers

purchase\_requests

purchase\_orders

purchase\_order\_items

receipts

quality\_inspections

deliveries

projects

documents

payments

costs

notifications

activity\_logs

Configura correctamente:

- Primary keys
- Foreign keys
- Índices
- timestamps
- relaciones
- constraints

No dupliques información innecesariamente.

---

# 41. REGLAS DE NEGOCIO IMPORTANTES

### Regla 1

Una cotización aprobada puede convertirse en pedido.

### Regla 2

Un pedido puede generar una o varias órdenes de producción.

### Regla 3

Una orden de producción puede requerir varios materiales.

### Regla 4

El material puede reservarse para una orden.

### Regla 5

Si el material disponible es insuficiente, debe aparecer una alerta.

### Regla 6

Una compra recibida actualiza automáticamente el inventario.

### Regla 7

Cada movimiento de inventario debe quedar registrado.

### Regla 8

Un pedido no debe poder cerrarse si existen procesos críticos pendientes.

### Regla 9

Una orden de producción terminada debe pasar por calidad cuando el pedido lo requiera.

### Regla 10

Los cambios importantes deben quedar en auditoría.

---

# 42. DATOS DEMO

No quiero una aplicación vacía.

Crea datos de demostración realistas para AMD.

Crear:

- 10 clientes
- 10 proveedores
- 20 materiales
- 15 máquinas
- 15 cotizaciones
- 12 pedidos
- 8 órdenes de producción
- 10 órdenes de compra
- movimientos de inventario
- entregas
- inspecciones

Usa nombres genéricos de clientes como:

Cliente Industrial A

Cliente Industrial B

Maquiladora A

Maquiladora B

No inventes que estas empresas son clientes reales de AMD.

---

# 43. MÉTRICAS

El Dashboard debe poder calcular:

Ventas

Pedidos

Pedidos atrasados

Producción

Material crítico

Compras

Inventario

Máquinas

Utilidad

Margen

Entregas

---

# 44. RESPONSIVE

Debe funcionar correctamente en:

Desktop

Laptop

Tablet

No es necesario priorizar móvil pequeño en el MVP.

El uso principal será en computadora.

---

# 45. SEGURIDAD

Implementa:

- Login
- Password hashing
- Sesiones seguras
- Roles
- Permisos
- Validación de inputs
- Protección de endpoints
- Manejo de errores
- Variables de entorno
- No exponer secretos

Nunca colocar contraseñas o API keys directamente en el código.

---

# 46. ARQUITECTURA

Construye la aplicación de forma modular.

Quiero que posteriormente sea posible agregar:

- Reportes avanzados
- Power BI
- Automatizaciones
- IA
- Integraciones
- Facturación
- APIs
- Aplicación móvil

sin tener que reconstruir el sistema.

---

# 47. REGLA PARA CLAUDE

No intentes construir todos los módulos de una sola vez.

Construye el sistema por fases.

## FASE 1 — FUNDACIÓN ✅ Completado

Crear:

- Proyecto
- Base de datos
- Autenticación
- Layout
- Sidebar
- Dashboard inicial
- Usuarios
- Roles

Primero asegúrate de que la aplicación corre correctamente.

---

## FASE 2 — CRM ✅ Completado

Crear:

- Clientes
- Contactos
- Vista de cliente
- Historial

---

## FASE 3 — COTIZACIONES ⬜ Pendiente

Crear:

- Cotizaciones
- Items
- Costos
- Margen
- Estados
- Archivos
- Conversión a pedido

---

## FASE 4 — PEDIDOS ⬜ Pendiente

Crear:

- Pedidos
- Items
- Estados
- Fechas
- Prioridades
- Vista completa del pedido

---

## FASE 5 — PRODUCCIÓN ⬜ Pendiente

Crear:

- Órdenes de producción
- Operaciones
- Máquinas
- Estados
- Avance
- Tiempos

---

## FASE 6 — INVENTARIO ⬜ Pendiente

Crear:

- Materiales
- Existencias
- Reservas
- Movimientos
- Stock mínimo
- Alertas

---

## FASE 7 — COMPRAS ⬜ Pendiente

Crear:

- Proveedores
- Solicitudes
- Órdenes de compra
- Recepciones
- Actualización automática de inventario

---

## FASE 8 — CALIDAD Y ENTREGAS ⬜ Pendiente

Crear:

- Inspecciones
- Resultados
- Entregas
- Evidencias

---

## FASE 9 — REPORTES ⬜ Pendiente

Crear:

- Ventas
- Pedidos
- Producción
- Inventario
- Compras
- Rentabilidad

---

# 48. ORDEN DE PRIORIDAD

Si tienes que elegir entre construir una función bonita o una función importante:

Prioriza:

1. Funcionamiento
2. Base de datos correcta
3. Relaciones correctas
4. Flujo operativo
5. Dashboard
6. UX
7. Diseño visual
8. Funciones secundarias

---

# 49. REGLA CONTRA SOBREINGENIERÍA

No agregues:

- Funciones que no fueron solicitadas
- Integraciones innecesarias
- Microservicios innecesarios
- Complejidad innecesaria
- IA innecesaria
- Automatizaciones innecesarias

Quiero un MVP mantenible.

---

# 50. REGLA CONTRA DATOS FALSOS

Nunca presentes datos demo como información real de AMD.

Distingue claramente:

DEMO

vs.

DATOS REALES

---

# 51. DASHBOARD OPERATIVO

Además del Dashboard general, crea una vista:

# CENTRO DE OPERACIONES

Debe responder visualmente:

### PEDIDOS

Qué pedidos requieren atención.

### PRODUCCIÓN

Qué se está fabricando.

### MÁQUINAS

Qué máquinas están ocupadas.

### MATERIAL

Qué materiales están faltando.

### COMPRAS

Qué tenemos que comprar.

### ENTREGAS

Qué debemos entregar próximamente.

Esta pantalla debe ser especialmente útil para Dirección / Operaciones.

---

# 52. EJEMPLO DE CENTRO DE OPERACIONES

PEDIDOS

🟢 AMD-00180 — En producción

🟡 AMD-00181 — Material pendiente

🔴 AMD-00182 — Atrasado

🟢 AMD-00183 — Calidad

---

MÁQUINAS

VMC #1 — Producción

VMC #2 — Disponible

VMC #3 — Producción

Láser #1 — Mantenimiento

---

MATERIALES

Aluminio 6061 — ⚠️ Comprar

Acero A36 — 🟢 OK

Acero inoxidable — 🔴 Sin existencia

---

ENTREGAS

AMD-00180 — Mañana

AMD-00181 — 13 Ago

AMD-00183 — 15 Ago

---

# 53. ESCALABILIDAD

Aunque esto sea un MVP, diseña la arquitectura pensando que posteriormente puede convertirse en el sistema operativo interno completo de AMD.

Pero NO construyas ahora las funciones futuras.

Deja la arquitectura preparada.

---

# 54. CRITERIOS DE ÉXITO DEL MVP

Consideraré que el MVP funciona cuando pueda realizar este flujo completamente:

> **Progreso 2026-08-13:** solo el paso 1 (crear cliente) está ✅. Pasos 2–22 permanecen ⬜. El MVP aún no está cerrado.

1. Crear cliente.
2. Crear cotización.
3. Agregar piezas.
4. Calcular precio.
5. Aprobar cotización.
6. Convertirla en pedido.
7. Crear orden de producción.
8. Seleccionar máquina.
9. Definir material requerido.
10. Revisar inventario.
11. Reservar material.
12. Detectar faltante.
13. Crear orden de compra.
14. Recibir material.
15. Actualizar inventario.
16. Continuar producción.
17. Pasar a calidad.
18. Aprobar calidad.
19. Marcar pedido listo.
20. Registrar entrega.
21. Cerrar pedido.
22. Ver todo reflejado en Dashboard.

Si este flujo funciona correctamente, el MVP cumple su objetivo.

---

# 55. IMPORTANTE: NO TERMINES EN UN PROTOTIPO VISUAL

No quiero solamente:

- Mockups
- Tarjetas
- Botones falsos
- Datos hardcodeados

Quiero una aplicación funcional.

Los formularios deben guardar información.

Los cambios deben persistir.

Las relaciones deben funcionar.

El Dashboard debe obtener datos de la base de datos.

Los estados deben cambiar realmente.

Los movimientos de inventario deben modificar existencias.

Las órdenes de compra deben actualizar inventario al recibir material.

---

# 56. DESARROLLO CON CLAUDE FREE

Estoy utilizando Claude Free.

Por eso:

NO intentes generar todo el proyecto de una sola vez.

Trabaja incrementalmente.

Al terminar cada fase:

1. Verifica que compile.
2. Verifica que la base de datos funcione.
3. Verifica las relaciones.
4. Corrige errores.
5. No rompas funcionalidades anteriores.
6. Resume brevemente lo construido.
7. Indica cuál es la siguiente fase.

No cambies la arquitectura sin una razón importante.

No reinventes componentes que ya funcionan.

---

# 57. PRIMERA INSTRUCCIÓN

Comienza únicamente con:

## FASE 1 — FUNDACIÓN ✅ Completado

Primero analiza este documento.

Después:

1. Propón la arquitectura técnica.
2. Propón el esquema inicial de base de datos.
3. Define la estructura de carpetas.
4. Define las tecnologías.
5. Define cómo se manejará autenticación y permisos.
6. Define el layout.
7. Define el Dashboard inicial.
8. Implementa la Fase 1.
9. Ejecuta pruebas.
10. Corrige cualquier error.

NO avances a la Fase 2 hasta que la Fase 1 esté funcionando.

No me hagas preguntas innecesarias.

Si falta un detalle menor, toma una decisión razonable y documenta la decisión.

Si existe una decisión arquitectónica importante que pueda afectar todo el proyecto, explícala antes de implementarla.

---

# 58. VISIÓN FINAL

AMD Operations debe convertirse eventualmente en el centro operativo digital de AMD México.

La visión es:

```
                AMD OPERATIONS

                     │
      ┌──────────────┼──────────────┐
      │              │              │
   VENTAS         OPERACIONES     INVENTARIO
      │              │              │
 Cotizaciones     Producción       Material
 Clientes         Máquinas         Compras
 Pedidos          Calidad          Proveedores
      │              │              │
      └──────────────┼──────────────┘
                     │
                 DASHBOARD
                     │
             DIRECCIÓN AMD

```

Toda la información importante de la empresa debe terminar conectada.

El sistema debe ayudar a Dirección a responder rápidamente:

> ¿Qué está pasando hoy en AMD?

> ¿Qué dinero estamos generando?

> ¿Qué pedidos están en riesgo?

> ¿Qué debemos producir?

> ¿Qué material debemos comprar?

> ¿Qué máquinas están disponibles?

> ¿Qué tenemos que entregar?

> ¿Dónde estamos ganando o perdiendo dinero?

Construye el MVP con esta visión.

# FIN DEL PROMPT