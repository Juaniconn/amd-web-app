# AMD OPERATIONS — ARCHITECTURE DECISIONS

## Propósito

Este documento registra las decisiones arquitectónicas importantes de AMD Operations.

Debe mantenerse actualizado durante todo el desarrollo.

Antes de cambiar una decisión arquitectónica existente, el agente debe:

1. Identificar la decisión afectada.
2. Explicar por qué debe cambiar.
3. Evaluar impacto en código, base de datos, infraestructura y seguridad.
4. Actualizar este documento.
5. Evitar romper funcionalidades existentes.

Este documento NO reemplaza:

- `AMD_OPERATIONS_BUSINESS_SPEC.md`
- `AMD_OPERATIONS_TECHNICAL_SPEC.md`

La jerarquía es:

1. BUSINESS_SPEC = qué debe hacer el sistema.
2. TECHNICAL_SPEC = cómo debe construirse.
3. ARCHITECTURE_DECISIONS = decisiones técnicas tomadas durante el desarrollo.

---

# ADR-001 — Arquitectura general

## Estado

Aceptada

## Decisión

AMD Operations será construido como un monolito modular.

La aplicación tendrá módulos internos claramente separados, pero no se dividirá prematuramente en microservicios.

## Razón

El objetivo es mantener:

- simplicidad
- velocidad de desarrollo
- facilidad de mantenimiento
- consistencia transaccional
- menor complejidad operacional

La arquitectura podrá evolucionar posteriormente si el crecimiento real del sistema lo justifica.

---

# ADR-002 — Cloudflare como infraestructura principal

## Estado

Aceptada

## Decisión

Cloudflare será la plataforma principal de infraestructura para AMD Operations.

La arquitectura deberá aprovechar, cuando corresponda:

- Cloudflare Workers
- Cloudflare Pages
- Cloudflare R2
- Cloudflare Queues
- Cloudflare KV
- Cloudflare Analytics

## Razón

Cloudflare será la capa principal para:

- hosting
- edge
- seguridad
- almacenamiento de archivos
- distribución
- servicios auxiliares

No se introducirán proveedores adicionales sin una razón técnica clara.

---

# ADR-003 — Base de datos

## Estado

Aceptada

## Decisión

PostgreSQL será la base de datos relacional principal de AMD Operations.

## Razón

AMD Operations necesita:

- relaciones complejas
- integridad referencial
- transacciones
- consultas relacionales
- reportes
- inventario
- producción
- compras
- costos

No utilizar una base de datos NoSQL como sustituto de PostgreSQL para el núcleo operativo.

---

# ADR-004 — ORM

## Estado

Aceptada

## Decisión

Utilizar Drizzle ORM para interactuar con PostgreSQL.

## Razón

Se busca:

- TypeScript end-to-end
- tipado fuerte
- migraciones controladas
- consultas explícitas
- bajo nivel de abstracción innecesario

---

# ADR-005 — Framework de aplicación

## Estado

Aceptada

## Decisión

Utilizar Next.js con TypeScript como framework principal.

## Razón

Permite mantener frontend y backend dentro de una arquitectura coherente.

Utilizar:

- App Router
- Server Components cuando corresponda
- Server Actions cuando sean apropiadas
- Route Handlers para APIs necesarias

---

# ADR-006 — Almacenamiento de archivos

## Estado

Aceptada

## Decisión

Cloudflare R2 será utilizado para almacenamiento de documentos y archivos.

Los documentos pueden incluir:

- PDF
- Excel
- Word
- DXF
- DWG
- STEP
- STL
- PNG
- JPG
- planos
- fotografías
- especificaciones

La base de datos almacenará metadatos y referencias al archivo.

No almacenar archivos pesados directamente en PostgreSQL.

---

# ADR-007 — Autenticación

## Estado

Aceptada

## Decisión

Utilizar Better Auth para autenticación.

El sistema tendrá:

- usuarios
- sesiones
- roles
- permisos

Nunca almacenar contraseñas en texto plano.

Nunca incluir secretos en el código fuente.

---

# ADR-008 — Autorización

## Estado

Aceptada

## Decisión

AMD Operations utilizará autorización basada en roles y permisos.

Roles iniciales:

- Administrador
- Dirección
- Ventas
- Compras
- Producción
- Calidad
- Almacén

Los permisos deben controlarse tanto en la interfaz como en el backend.

Ocultar un botón en la UI NO constituye una medida de seguridad suficiente.

---

# ADR-009 — Integridad del inventario

## Estado

Aceptada

## Decisión

Los cambios de inventario deben producir movimientos de inventario auditables.

Nunca modificar existencias de forma silenciosa.

Las operaciones deben registrar:

- material
- cantidad
- tipo de movimiento
- usuario
- fecha
- motivo
- documento relacionado

---

# ADR-010 — Auditoría

## Estado

Aceptada

## Decisión

Las operaciones críticas deben generar registros de auditoría.

Debe ser posible determinar:

- quién realizó una acción
- cuándo
- sobre qué registro
- qué cambió
- valor anterior
- valor nuevo

---

# ADR-011 — Datos demo

## Estado

Aceptada

## Decisión

Los datos de demostración deben estar claramente diferenciados de los datos reales.

Nunca utilizar empresas reales como clientes demo sin autorización.

Utilizar identificadores como:

- `DEMO_CLIENTE_001`
- `DEMO_PEDIDO_001`
- `DEMO_PROVEEDOR_001`

---

# ADR-012 — Separación entre negocio y arquitectura

## Estado

Aceptada

## Decisión

Los requisitos funcionales estarán definidos en:

`AMD_OPERATIONS_BUSINESS_SPEC.md`

Las decisiones técnicas generales estarán definidas en:

`AMD_OPERATIONS_TECHNICAL_SPEC.md`

Las decisiones arquitectónicas tomadas durante el desarrollo estarán registradas aquí.

Esto evita mezclar:

- reglas de negocio
- implementación
- decisiones históricas

---

# ADR-013 — No ERP externo

## Estado

Aceptada

## Decisión

AMD Operations será independiente de ERPNext, Odoo y otros ERP externos.

No diseñar la arquitectura alrededor de un ERP externo.

Las futuras integraciones deberán construirse como integraciones independientes cuando exista una necesidad real.

---

# ADR-014 — Evitar sobreingeniería

## Estado

Aceptada

## Decisión

No introducir tecnologías o patrones complejos sin una necesidad real.

Evitar prematuramente:

- microservicios
- Kubernetes
- CQRS
- Event Sourcing
- colas innecesarias
- sistemas distribuidos complejos

La complejidad debe justificarse por una necesidad real del sistema.

---

# ADR-015 — Desarrollo incremental

## Estado

Aceptada

## Decisión

AMD Operations será desarrollado por fases.

No intentar implementar todo el sistema simultáneamente.

Cada fase debe:

1. Implementarse.
2. Compilar.
3. Probarse.
4. Corregirse.
5. Validarse.
6. Mantener compatibilidad con lo existente.

---

# ADR-016 — Regla para cambios arquitectónicos

## Estado

Aceptada

## Decisión

Una decisión arquitectónica existente no debe cambiarse simplemente porque exista una alternativa técnicamente interesante.

Antes de cambiarla se debe evaluar:

- beneficio
- costo
- riesgo
- migración
- compatibilidad
- impacto en producción
- impacto en datos
- impacto en futuras fases

La decisión debe documentarse en este archivo.

---

# ADR-017 — Regla para el agente de IA

## Estado

Aceptada

## Decisión

Cursor/Grok debe leer antes de realizar cambios importantes:

1. `/docs/AMD_OPERATIONS_BUSINESS_SPEC.md`
2. `/docs/AMD_OPERATIONS_TECHNICAL_SPEC.md`
3. `/docs/ARCHITECTURE_DECISIONS.md`

El agente debe respetar los tres documentos.

Si existe una contradicción:

- BUSINESS_SPEC define el requerimiento de negocio.
- TECHNICAL_SPEC define la arquitectura técnica establecida.
- ARCHITECTURE_DECISIONS documenta decisiones concretas tomadas durante el desarrollo.

El agente NO debe cambiar una decisión arquitectónica importante silenciosamente.

---

# ADR-018 — PostgreSQL local de desarrollo

## Estado

Aceptada

## Contexto

Fase 1 requiere PostgreSQL real, migraciones reproducibles y persistencia verificable. El entorno de desarrollo no tenía Docker ni PostgreSQL de sistema instalado, y no hay sudo sin contraseña.

## Decisión

PostgreSQL sigue siendo la base de datos relacional principal (ADR-003).

Para desarrollo local se admite cualquiera de estas opciones, todas PostgreSQL:

1. PostgreSQL administrado externo vía `DATABASE_URL`.
2. `docker-compose.yml` con PostgreSQL 16.
3. PostgreSQL embebido (`npm run db:start`) para arrancar un servidor PostgreSQL real en el directorio `.data/` sin privilegios de sistema.

Producción usará PostgreSQL administrado. No se sustituye PostgreSQL por SQLite, PGlite ni un almacén NoSQL.

## Alternativas consideradas

- SQLite: rechazado; rompe ADR-003 y el modelo relacional objetivo.
- Pedir sudo para instalar el paquete del sistema: válido, pero no bloquea el desarrollo local.
- Neon/Supabase como default: innecesario para Fase 1 y Supabase está explícitamente fuera de alcance.

## Razón

Permite completar Fase 1 con integridad real de datos sin cambiar la arquitectura de producción.

## Consecuencias

El repositorio incluye `docker-compose.yml`, un script de PostgreSQL embebido y `.env.example`. `.data/` está en `.gitignore`.

## Fecha

2026-08-13

## Autor

AMD Operations / AI Engineering Agent

---

# ADR-019 — Acceso de autenticación en red local

## Estado

Aceptada

## Contexto

Better Auth usaba `BETTER_AUTH_URL=http://localhost:3000` como único origen de confianza. Desde otra PC en la LAN el navegador entra por `http://192.168.x.x:3000`. El origen no coincidía, la cookie/sesión no quedaba en ese host, o el cliente era redirigido a `localhost` en la otra máquina. El síntoma era quedarse en login sin error.

## Decisión

- Resolver `baseURL` de Better Auth según el `Host` de la petición, con allowlist de localhost, IPs privadas RFC1918 y hosts `*.local`.
- Aceptar orígenes de red local en `trustedOrigins`.
- Permitir hosts/orígenes extra por `BETTER_AUTH_ALLOWED_HOSTS` y `BETTER_AUTH_TRUSTED_ORIGINS`.
- Tras login exitoso, navegar a `/dashboard` en el origen actual, no a un URL absoluto de localhost.
- Escuchar en `0.0.0.0` en `next dev` y `next start`.

No se abre el origen a internet público (`*`). Cloudflare/HTTPS de producción se agregará como host permitido cuando exista el dominio.

## Fecha

2026-08-13

## Autor

AMD Operations / AI Engineering Agent

---

# ADR-020 — CRM de Fase 2

## Estado

Aceptada

## Contexto

La Fase 2 requiere clientes, contactos, ficha de cliente e historial, sin avanzar a cotizaciones ni archivos.

## Decisión

- Se crean las tablas `customers`, `contacts` y `activity_logs`.
- El historial del cliente usa `activity_logs` append-only (base de ADR-010).
- Clientes y contactos usan soft delete (`deleted_at`).
- El contacto principal es `contacts.is_primary`, con un único principal activo por cliente.
- Permisos: `customers:read` y `customers:write`. Dirección lee; Ventas lee y escribe; Administrador tiene ambos.
- Tipo de cliente: `industrial | maquiladora | comercial | otro`.
- Estado: `activo | inactivo`.
- TanStack Table queda aplazado; el listado usa la tabla shadcn existente con paginación en servidor.
- React Hook Form se usa en el formulario de cliente.
- Cloudflare R2, documentos y cotizaciones quedan fuera de esta fase.
- Los clientes demo se identifican con `is_demo` y códigos `DEMO_CLIENTE_00N`.

## Alternativas consideradas

- Duplicar el contacto principal en columnas de `customers`: rechazado por redundancia.
- Hard delete: rechazado para preservar historial y relaciones futuras.
- Instalar TanStack Table ahora: innecesario para el primer listado.

## Razón

Cumple el alcance de Fase 2 reutilizando auth, layout, RBAC y Server Actions de Fase 1.

## Impacto

- El maestro de clientes queda persistido en PostgreSQL y es dependencia de Fase 3.
- Dirección puede consultar la cartera; Ventas puede operarla; el resto de roles no ve el módulo.
- El listado no introduce TanStack Table; un cambio futuro de librería de tablas no rompe el esquema.
- `activity_logs` queda listo para reutilizarse en cotizaciones y pedidos (ADR-010).

## Consecuencias futuras

- Toda cotización deberá referenciar `customers.id` (y preferentemente `contacts.id`).
- El siguiente `drizzle-kit generate` debe contar con snapshot 0001; si no, puede reemitir el CRM.
- Re-seed de demo hace DELETE físico de contactos DEMO: no usar seed contra datos reales de esos códigos.
- Restaurar un cliente archivado no está implementado; hay que diseñarlo antes de usarlo en operación diaria.

## Fecha

2026-08-13

## Autor

AMD Operations / AI Engineering Agent

---

# ADR-021 — Estructura de documentación Obsidian

## Estado

Aceptada

## Fecha

2026-08-13

## Contexto

Tras completar Fase 2, el vault `docs/` solo tenía las tres specs maestras y una carpeta `Procesos/` vacía. Un desarrollador o un agente de IA no podía reconstruir el estado real sin leer el chat.

## Decisión

Mantener las tres specs como fuente de visión y añadir, sin borrarlas, una capa operativa:

- `docs/roadmap.md` — estado de fases
- `docs/modules/` — un archivo por módulo (implementado o explícitamente no implementado)
- `docs/Procesos/` — procesos de negocio
- `docs/changelogs/phase-N.md`
- `docs/executive-summary/phase-N-summary.md`
- `docs/audits/phase-N-audit.md`

Las specs maestras reciben un bloque `# 0. ESTADO…` al inicio. El cuerpo histórico del prompt no se reescribe.

## Alternativas evaluadas

- Reescribir las specs maestras en lugar de añadir estado: rechazado; perdería el prompt original.
- Documentar solo en README: rechazado; el vault de Obsidian es la fuente para negocio y agentes.
- Un solo wiki monolítico: rechazado; los módulos y procesos se consultan por separado.

## Impacto

Cualquier agente (Cursor, Claude, GPT, Grok) puede empezar por `roadmap.md` y `crm.md` sin el historial de chat.

## Consecuencias futuras

Cada fase cerrada debe: actualizar el bloque `# 0` de las specs, añadir changelog + audit + executive summary, actualizar el módulo y el proceso afectados, y no borrar ADRs.

## Razón

Separar «visión» (specs) de «estado» (roadmap, changelogs, audits) evita sobrescribir historia.

## Autor

AMD Operations / AI Engineering Agent

---

# ADR-022 — Almacenamiento de archivos local en desarrollo

## Estado

Aceptada

## Fecha

2026-08-13

## Contexto

La Fase 3 requiere adjuntar archivos a cotizaciones (ADR-006: metadatos en PostgreSQL, blobs fuera de la BD). Cloudflare R2 no está configurado en el repositorio.

## Problema

Sin un backend de archivos, el flujo RFQ no puede asociar planos/PDF a la cotización. Bloquear la fase hasta tener cuenta Cloudflare retrasa ventas. Guardar blobs en PostgreSQL contradice ADR-006.

## Decisión

- Tabla `documents` con metadatos (object key, MIME, tamaño, checksum, entidad, uploader).
- Adapter `src/lib/storage/`: implementación local en `.data/uploads` (o `STORAGE_DIR`).
- Descarga autenticada por `GET /api/documents/[id]` (no URL pública permanente).
- R2 permanece el destino de producción; se activará cuando existan credenciales, sin cambiar el modelo de metadatos.
- `getStorage()` hoy siempre devuelve el adapter local. El enum incluye `r2` pero no hay implementación.

## Alternativas evaluadas

- Bloquear Fase 3 hasta tener R2: rechazado; retrasa el flujo RFQ.
- Guardar blobs en PostgreSQL: rechazado (ADR-006).
- URLs públicas sin auth: rechazado; los planos son información de cliente.

## Impacto

- Las cotizaciones pueden adjuntar y descargar archivos en desarrollo.
- Los archivos no se replican entre PCs de la LAN; viven en el disco del proceso Node.
- ADR-006 no se reemplaza: R2 sigue siendo la decisión de producción.

## Consecuencias futuras

- Activar R2 implica implementar el adapter y credenciales; el esquema `documents` no debería cambiar.
- Un deploy a Cloudflare Pages/Workers deberá dejar de usar `.data/uploads`.
- La UI/API solo sirve documentos de `entity_type = quote`; customer/order están en el enum pero 403.

## Razón

Análogo a ADR-018 (PostgreSQL local vs administrado). Permite completar archivos en desarrollo sin Cloudflare.

## Autor

AMD Operations / AI Engineering Agent

---

# ADR-023 — Conversión a pedido mínimo en Fase 3

## Estado

Aceptada

## Fecha

2026-08-13

## Contexto

BUSINESS_SPEC Fase 3 incluye «Conversión a pedido». El módulo Pedidos es Fase 4. Hace falta cumplir la conversión sin construir la vista operativa de pedidos.

## Problema

Si Fase 3 no crea el pedido, se rompe la regla de negocio «cotización aprobada → pedido» y Fase 4 tendría que inventar el vínculo. Si Fase 3 construye `/orders` completo, se adelanta el alcance (ADR-015).

## Decisión

- Al convertir una cotización `aprobada` se crean `orders` + `order_items` (cabecera y partidas comerciales, estado `nuevo`, número `AMD-YYYY-NNNNN`).
- `quotes.converted_order_id` y `orders.quote_id` (único) relacionan ambos registros.
- `/orders` permanece deshabilitado. La cotización muestra el número de pedido.
- No se copian costos estimados al pedido. Fase 4 construye la vista completa.
- `order_status` en esta fase solo admite `nuevo`.

## Alternativas evaluadas

- Diferir la conversión a Fase 4: rechazado; el botón es entregable de Fase 3.
- Construir el módulo Pedidos ahora: rechazado (ADR-015).
- Guardar solo un flag `converted` sin fila de pedido: rechazado; perdería numeración AMD y partidas comerciales.

## Impacto

- El flujo MVP pasos 1–6 queda persistido.
- Fase 4 debe extender `orders` (PO, fechas, prioridad, estados) sin romper las filas ya creadas.
- No hay orden de producción al convertir.

## Consecuencias futuras

- Migraciones de Fase 4 serán `ALTER` sobre `orders` / `order_items`, no una tabla paralela.
- El seed demo crea dos pedidos (`DEMO_PEDIDO_005`, `DEMO_PEDIDO_015`).
- Producción (Fase 5) dependerá de estos pedidos, no de la cotización.

## Razón

Cumple la regla de negocio «cotización aprobada → pedido» con el menor adelanto de Fase 4.

## Autor

AMD Operations / AI Engineering Agent

---

# ADR-024 — RFQ como entidad única `quotes`

## Estado

Aceptada

## Fecha

2026-08-13

## Contexto

El negocio habla de «RFQ» (solicitud) y «cotización» (oferta formal). El plan de Fase 3 debía decidir si eso son dos tablas o una.

## Problema

Una tabla `rfqs` más otra `quotes` duplicaría cliente, contacto, archivos y estados, y obligaría a un paso de «convertir RFQ en cotización» que el sistema no necesita hoy. Ventas captura la solicitud y cotiza sobre el mismo registro.

## Decisión

- No existe tabla `rfqs`.
- La RFQ **es** la cotización en estado `borrador` (notas = solicitud).
- Una sola entidad `quotes` recorre: borrador → en revisión → enviada → aprobada \| rechazada \| expirada → convertida.
- El alta `/quotes/new` es la captura de RFQ; el número `COT-YYYY-NNNNN` se asigna al crear.

## Alternativas evaluadas

- Tablas `rfqs` + `quotes` con conversión: rechazado; duplica datos y UI.
- RFQ como documento suelto sin cabecera: rechazado; no hay cliente/estado/totales.

## Impacto

- Un agente o desarrollador no debe crear `/rfqs` ni migración `rfqs`.
- El proceso de negocio [[Proceso RFQ]] se ejecuta sobre `/quotes`.
- «Enviada» no implica correo; es el mismo registro en otro estado.

## Consecuencias futuras

- Si más adelante se necesita un buzón de RFQ sin precios, se puede filtrar `status = borrador`, no crear otra entidad, salvo un ADR nuevo.
- Pedidos siguen siendo `orders`, no un estado más de `quotes`.

## Alternativas consideradas

Ver «Alternativas evaluadas».

## Razón

Un registro, una máquina de estados, un número de cotización. Evita sobreingeniería (ADR-014).

## Autor

AMD Operations / AI Engineering Agent

---

# ADR-025 — Producción basada en Órdenes de Producción

## Estado

Aceptada

## Fecha

2026-08-13

## Contexto

AMD Operations requiere trazabilidad desde RFQ hasta entrega.

Hoy el sistema cubre CRM, RFQ (`quotes`, ADR-024) y conversión a pedido mínimo `orders` (ADR-023). Convertir una RFQ **no** crea orden de producción, no asigna máquina y no reserva material.

BUSINESS_SPEC §41: una cotización aprobada puede convertirse en pedido (Regla 1); un pedido puede generar una o varias órdenes de producción (Regla 2).

## Decisión

Toda RFQ **aprobada y convertida** genera una o varias Órdenes de Producción.

```
CRM → RFQ → Pedido mínimo (ya existe) → Orden de Producción → Calidad → Entrega
```

1. El disparador es `quotes.status = convertida` (acción existente `convertQuoteToOrder`). No se crea OP desde `aprobada` sin conversión.
2. La OP referencia `orders.id` (y con ello cotización y cliente). No se omite el pedido mínimo.
3. Un pedido puede generar una o varias OP (Regla 2).
4. La OP es la entidad de piso: estados, centro, máquina, operador, tiempos, material requerido.
5. Fase 4 no construye `/orders` completo, inventario, compras, calidad ni entregas.

## Alternativas consideradas

- OP directo desde `quotes` sin `orders`: rechazado (rompe ADR-023 y la Regla 2).
- Emitir OP en el mismo `convertQuoteToOrder` sin modelo de estados/centros: rechazado (adelanta implementación).
- Esperar la UI de Pedidos: rechazado por Dirección (ADR-026).

## Razón

Trazabilidad de fabricación reutilizando el documento comercial que Fase 3 ya persiste.

## Impacto

CRM → RFQ → Producción → Calidad → Entrega queda como flujo objetivo. Producción consume `orders` / `order_items`. Inventario y Compras no bloquean el diseño; la OP usará `Esperando Material` cuando esas fases existan.

## Consecuencias

Trazabilidad completa de fabricación cuando Fase 4 esté implementada. Las migraciones crearán `production_orders` (y operaciones/centros/máquinas) con FK a `orders`. Ampliar `convertQuoteToOrder` es trabajo de implementación, no de esta preparación documental.

## Autor

AMD Operations / AI Engineering Agent

---

# ADR-026 — Remapeo operativo: Fase 4 es Producción

## Estado

Reemplazada (solo la **numeración de fases**) por ADR-032.

La decisión de diferir la UI de Pedidos y anclar la OP al pedido mínimo **sigue vigente** (ADR-023, ADR-025).

## Fecha

2026-08-13

## Contexto

BUSINESS_SPEC §47 numeraba Fase 4 = Pedidos y Fase 5 = Producción. Fase 3 ya persistió el pedido mínimo (ADR-023). Dirección autorizó iniciar Producción como siguiente módulo de valor, sin construir primero `/orders`.

## Decisión

Numeración que este ADR introdujo (histórica):

1. Fundación ✅ · 2. CRM ✅ · 3. RFQ ✅ · **4. Producción** · 5. Inventario · … · 12. Deploy Cloudflare

## Reemplazo

2026-08-13: se identificó el módulo Ingeniería/Diseño entre RFQ y Producción. Numeración vigente: ADR-032 (Fase 4 = Ingeniería, Fase 5 = Producción).

## Autor

AMD Operations / AI Engineering Agent

---

# ADR-027 — Máquinas configurables por administrador

## Estado

Aceptada

## Fecha

2026-08-13

## Contexto

El inventario de planta (15 equipos conocidos) no debe quedar hardcodeado. AMD compra, da de baja y mueve equipos. BUSINESS_SPEC §17 ya pedía que el administrador los configure.

## Decisión

Todas las máquinas son administrables en la plataforma. El administrador podrá crear, editar, desactivar y eliminar máquinas.

Atributos (diseño; no persistidos): Nombre, Marca, Modelo, Año, Centro de Trabajo, Responsable, Horas por Turno, Capacidad, Observaciones, Activo / Inactivo, Fecha Alta, Fecha Baja.

El Responsable es un usuario registrado (`users.id`). Desactivar conserva historial. Eliminar: impedir si hay operaciones históricas (recomendación de implementación). El listado de 15 equipos es semilla.

## Alternativas consideradas

- Catálogo fijo en código: rechazado.
- Solo etiqueta de piso sin ficha: rechazado.

## Razón

La planta cambia; el maestro debe cambiar sin deploy.

## Impacto

Fase 4 incluye CRUD de `machines` ligado a centros. `/machines` deja de ser un ítem muerto. Ver [[Maquinas]].

## Consecuencias

KPIs y programación usan este maestro. Rutas apuntan a centros, no a seriales fijos.

## Autor

AMD Operations / AI Engineering Agent

---

# ADR-028 — Rutas de fabricación iniciales y configurables

## Estado

Aceptada

## Fecha

2026-08-13

## Contexto

Una pieza recorre varios centros (BUSINESS_SPEC §16). Dirección definió tres rutas de arranque y pidió rutas futuras configurables por administrador.

## Decisión

Semilla: **Ruta A** Pieza maquinada (RFQ → Ingeniería → CNC → Calidad → Entrega); **Ruta B** Gabinete metálico (… Láser → Press Brake → Soldadura …); **Ruta C** Pieza Wire EDM (… CNC → Wire EDM …). Press Brake = máquina del centro Doblado. El administrador crea/edita/desactiva/elimina rutas adicionales.

## Alternativas consideradas

- Una ruta genérica única: rechazado.
- Rutas por número de parte desde el día uno: rechazado.

## Razón

Tres familias reales bastan para el modelo; el resto es configuración.

## Impacto

`production_operations` nace de la ruta. No hardcodear secuencias más allá del seed. Ver [[Rutas de Fabricacion]].

## Consecuencias

Torno, 3D, moldeo, router esperan alta por administrador.

## Autor

AMD Operations / AI Engineering Agent

---

# ADR-029 — Permisos operativos de producción vía usuarios y roles

## Estado

Aceptada

## Fecha

2026-08-13

## Contexto

RBAC de Fase 1 existe. El rol Producción solo tiene `dashboard:read`. No se quieren personas concretas en la spec.

## Decisión

Permisos operativos se asignan a roles, y roles a usuarios registrados. Permisos de negocio: **Autorizar Producción**, **Liberar Material**, **Programar Máquinas**, **Liberar Calidad**, **Cerrar Orden**. El responsable de máquina u OP es `users.id`.

El mapa rol de planta → permiso quedó **aprobado** en ADR-030 y [[Pendiente Validacion Direccion]]. Administrar máquinas (ADR-027) es permiso de catálogo, distinto de los cinco operativos.

## Alternativas consideradas

- UI sin `requirePermission`: rechazado (ADR-008).
- Un solo `production:write`: rechazado.
- Nombres de personas: rechazado.

## Razón

Separa autorización, programa, material, calidad y cierre. Reutiliza usuarios de Fase 1.

## Impacto

El catálogo de permisos se extenderá **en la implementación**. Esta entrega no modifica código. Ver [[Operadores y Roles]].

## Consecuencias

Puestos de planta (Gerente, Supervisor, Operador) son guía operativa, no `role_id` obligatorios.

## Autor

AMD Operations / AI Engineering Agent

---

# ADR-030 — Modelo operativo de Producción validado por Dirección

## Estado

Aceptada

## Fecha

2026-08-13

## Contexto

AMD México revisó [[Pendiente Validacion Direccion]] y aprobó el flujo operativo de Producción: programación, priorización, retrasos, captura de tiempos, liberación, compras urgentes y KPI oficiales.

## Decisión

El sistema adoptará esas reglas.

- Programa: Supervisor de Producción.
- Prioridad OP: 1 Urgente · 2 Compromiso inmediato · 3 Programada · 4 Producción normal.
- Priorizan: Dirección General, Ventas, Supervisor. Criterios: fecha prometida, cliente estratégico, material, capacidad, urgencias aprobadas.
- Monitoreo: En tiempo / En riesgo / Retrasada.
- Horas máquina y horas hombre: inicio/fin por máquina u operador, orden y operación.
- Compras urgentes: Dirección General (futuro: Gerente de Operaciones).
- Liberación: Inspector de Calidad; alternativa Supervisor. Flujo Producción → Calidad → Liberación → Entrega.
- Productividad sin OEE en Fase 4. KPI: [[KPI Produccion]].

## Alternativas consideradas

- Dejar reglas abiertas hasta el código: rechazado.
- OEE en el primer corte: rechazado.

## Razón

Congela el modelo de piso con autoridad de Dirección.

## Impacto

Producción, Calidad, Compras, Inventario y Dashboard Ejecutivo. La implementación debe persistir prioridad, fecha prometida, monitoreo de atraso y tiempos; cliente estratégico y material crítico dependen de CRM/Inventario.

## Consecuencias

La implementación futura deberá alinearse con estas reglas. No reabrirlas sin un ADR que reemplace a este. [[Pendiente Validacion Direccion]] es registro **aprobado**.

## Autor

AMD Operations / AI Engineering Agent

---

# ADR-031 — Ingeniería como etapa obligatoria u opcional

## Estado

Aceptada

## Fecha

2026-08-13

## Contexto

AMD recibe proyectos donde el cliente no siempre entrega diseño. La arquitectura documentada era CRM → RFQ → Producción. La RFQ no distingue **fabricar** vs **diseñar**.

## Problema

Sin un módulo de Ingeniería, el plano no tiene ciclo de revisión/aprobación, las horas de diseño no se costean aparte y el piso puede trabajar con un archivo no liberado.

## Decisión

Introducir el módulo **Ingeniería / Diseño** **antes** de Producción.

Dos escenarios:

- **A — Cliente requiere diseño:** Ingeniería es **obligatoria**. CAD → revisión → aprobación cliente → cotización final → producción.
- **B — Cliente entrega plano:** Ingeniería es **opcional** (validación de manufactura / correcciones). Se puede cotizar con el adjunto.

Entidad conceptual: Engineering Request (sin esquema en esta entrega).

Cadena:

```
CRM → RFQ → Ingeniería (si aplica) → Producción
```

## Alternativas consideradas

- Seguir solo con adjuntos de cotización: rechazado; no hay estados ni horas ni liberación.
- Un PDM / visor CAD en esta fase: rechazado (ADR-014).
- Ingeniería como paso informal dentro de Producción: rechazado; mezcla diseño y piso.

## Razón

Mayor trazabilidad, costeo correcto, control de horas de ingeniería, separación diseño vs manufactura.

## Impacto

RFQ (cuándo exigir liberación), Producción (plano vigente), documentos CAD, roles nuevos de proceso, Fase 4 del roadmap (ADR-032). El modelo de piso ADR-030 no se reabre.

## Consecuencias

Documentación en `docs/Ingenieria/` y [[Proceso Ingenieria]]. Convertir RFQ a pedido hoy **no** consulta ingeniería; el diseño técnico de Fase 4 deberá decidir el gate del escenario A. No implementar código en esta entrega.

## Autor

AMD Operations / AI Engineering Agent

---

# ADR-032 — Remapeo: Fase 4 es Ingeniería y Diseño

## Estado

Aceptada

## Fecha

2026-08-13

## Contexto

ADR-026 puso Producción como Fase 4. Dirección reconoció Ingeniería como módulo formal **anterior** a piso.

## Decisión

Numeración vigente ([[roadmap]]):

1. Fundación ✅ · 2. CRM ✅ · 3. RFQ ✅ · **4. Ingeniería y Diseño 🔄** · **5. Producción** · 6. Inventario · 7. Compras · 8. Calidad · 9. Entregas · 10. Facturación · 11. Dashboard Ejecutivo · 12. Beta Interna · 13. Deploy Cloudflare

ADR-026 queda **Reemplazada** en numeración. Pedidos UI diferida y OP anclada a `orders` siguen.

No se reescribe BUSINESS_SPEC §47 (ADR-021).

## Alternativas consideradas

- Implementar Producción ahora e Ingeniería después: rechazado; el plano liberado es entrada de la OP en escenario A.
- Insertar Ingeniería sin renumerar: rechazado; genera la misma contradicción que ADR-026 vino a evitar.

## Razón

El siguiente trabajo de documentación/diseño técnico es Ingeniería, no código de piso.

## Impacto

Agentes leen [[roadmap]] y este ADR. Docs de Producción permanecen válidas como Fase 5. Changelog `phase-4` de **implementación** futura = Ingeniería, no Producción.

## Consecuencias

La documentación de piso (ADR-030) no se borra; se aplaza su build. Sidebar `/production` «Fase 5» ahora coincide con el plan; falta ítem Ingeniería.

## Autor

AMD Operations / AI Engineering Agent

---

# ADR-033 — Una RFQ, una solicitud de ingeniería

## Estado

Aceptada

## Fecha

2026-08-14

## Contexto

La spec conceptual permitía `quotes` 0..1—N Engineering Request. La implementación de Fase 4 necesita una cardinalidad operativa clara para Ventas e Ingeniería.

## Decisión

**1 RFQ genera 0 o 1 solicitud de ingeniería activa.**

- `engineering_requests.quote_id` es único entre filas no archivadas (`deleted_at is null`).
- Al marcar la RFQ con `requires_engineering = true` se crea la solicitud si no existe.
- Cancelar no libera el cupo. Archivar (`engineering:delete`, solo `pendiente` o `cancelado`) sí, y permite abrir otra.
- No hay solicitud huérfana: siempre apunta a `quotes` y `customers`.

## Alternativas consideradas

- N solicitudes por RFQ (revisiones como documentos hijos): rechazado en MVP; las revisiones son archivos de la misma solicitud.
- Ingeniería sin RFQ: rechazado; el origen comercial es la cotización.

## Razón

Trazabilidad Cliente → RFQ → Ingeniería sin duplicar el trabajo de diseño.

## Impacto

`/engineering/new` solo lista RFQ que requieren ingeniería y aún no tienen solicitud activa.

## Autor

AMD Operations / AI Engineering Agent

---

# ADR-034 — Gate de conversión: Liberado en escenario A

## Estado

Aceptada

## Fecha

2026-08-14

## Contexto

ADR-031 dejó pendiente si `convertQuoteToOrder` exige plano liberado. Convertir sin diseño firmado manda a pedido (y luego a piso) un adjunto no vigente.

## Decisión

Si `quotes.requires_engineering = true`, **no se convierte a pedido** hasta que la solicitud activa esté en `liberado`.

- Escenario B (`requires_engineering = false`): conversión igual que Fase 3.
- Escenario A y B-con-validación: el botón se deshabilita y el servicio lanza `ENGINEERING_NOT_RELEASED`.
- Enviar / aprobar comercialmente la RFQ **sí** se permite antes de `Liberado` (cotización preliminar). El precio firme y el pedido esperan la liberación.

## Alternativas consideradas

- Bloquear también «marcar enviada» hasta Liberado: rechazado; Ventas necesita mandar avances.
- Convertir y marcar el pedido como bloqueado: rechazado; el pedido mínimo no tiene máquina de estados.

## Razón

Separa diseñar, cotizar y producir. El pedido que nace ya trae origen y, si aplica, el id de la solicitud liberada.

## Impacto

RFQ aprobadas de diseño no se convierten hasta Ingeniería. Producción (Fase 5) consume `orders.origin`.

## Autor

AMD Operations / AI Engineering Agent

---

# ADR-035 — Origen de pedido: RFQ directa vs RFQ + Ingeniería

## Estado

Aceptada

## Fecha

2026-08-14

## Contexto

Fase 5 creará OP desde el pedido mínimo. Hay que saber si el plano vigente salió de Ingeniería o del adjunto de la RFQ.

## Decisión

`orders.origin`:

- `rfq_directa` — la RFQ no requería ingeniería (escenario B puro).
- `rfq_ingenieria` — la RFQ requería ingeniería y se convirtió tras `Liberado`.

`orders.engineering_request_id` apunta a la solicitud liberada cuando el origen es `rfq_ingenieria`.

No se implementa OP en esta fase. El campo queda listo para Fase 5.

`diseno_solamente` puede convertirse a pedido comercial (venta de diseño) con origen `rfq_ingenieria`. **No** debe generar OP de piso en Fase 5.

## Alternativas consideradas

- Inferir el origen en Fase 5 leyendo adjuntos: rechazado; no hay liberación.
- Tabla `production_orders` ahora: rechazado; Fase 5.

## Razón

La OP futura no adivina el plano. Lee origen + solicitud + documentos de `engineering_request` o de `quote`.

## Impacto

Seed de pedidos demo existentes queda en `rfq_directa`. UI `/orders` sigue deshabilitada.

## Autor

AMD Operations / AI Engineering Agent

---

# ADR-036 — Software CAD/CAM oficial y puesto de Ingeniería

## Estado

Aceptada

## Fecha

2026-08-14

## Contexto

[[Flujo Ingenieria]] dejó abierto qué CAD usa la planta y quién diseña. Dirección AMD México lo validó el 2026-08-14.

## Decisión

Herramientas oficiales (fuera de AMD Operations; no hay integración ni visor):

| Uso | Software |
|---|---|
| Modelado CAD | SolidWorks |
| CAM | Mastercam, Fusion 360 |
| 2D | AutoCAD |

Puesto responsable principal de Ingeniería:

**Ingeniero de Diseño y Manufactura / Programador CNC**

Un mismo puesto cubre CAD, manufacturabilidad y programas CAM. En RBAC MVP sigue el rol `ingenieria`. No se crea un `role_id` distinto para programador CNC.

AMD Operations **no** ejecuta SolidWorks, Mastercam, Fusion 360 ni AutoCAD. Solo registra la solicitud, estados, horas, archivos exportados (PDF/DWG/DXF/STEP/…) y la liberación.

## Alternativas consideradas

- Integrar API de SolidWorks/PDM: rechazado (ADR-014).
- Separar rol RBAC «Programador CNC» ahora: rechazado; el puesto es uno.

## Razón

Congela el stack de diseño de planta y el dueño del trabajo de ingeniería.

## Impacto

Docs de Ingeniería, onboarding, Fase 5 (programas CAM solo si están **Liberados** / aprobados para manufactura). Sin cambio de schema.

## Autor

AMD Operations / AI Engineering Agent

---

# ADR-037 — Aprobaciones de diseño: interno, cliente y canal

## Estado

Aceptada

## Fecha

2026-08-14

## Contexto

Había que definir quién firma un diseño dentro de AMD y frente al cliente.

## Decisión

**Aprobación interna (Diseño Interno)** — dos puestos, ambos requeridos a nivel de proceso:

1. Líder de Ingeniería
2. Gerente de Operaciones

En el sistema MVP la transición a `revision_interna` / salida hacia cliente la registra un usuario con `engineering:approve` o `engineering:update`. No hay doble firma persistida. El Líder se cubre con rol `ingenieria`; el Gerente de Operaciones **no** tiene `role_id` propio (hoy: Dirección o un usuario con roles combinados).

**Aprobación de cliente (Diseño Cliente)** — actores externos, no usuarios de AMD Operations:

- Cliente
- Ingeniería del cliente
- Calidad del cliente

**Canal:** Ejecutivo de Ventas Técnicas (rol RBAC `ventas`, permiso `engineering:approve`). No hay portal.

Estados: `esperando_cliente` → `aprobado` (OK) o `correcciones` (rechazo / cambios).

## Alternativas consideradas

- Portal del cliente: rechazado en Fase 4.
- Dos transiciones distintas interno vs cliente en la máquina: la máquina ya separa `revision_interna` y `esperando_cliente`.

## Razón

Separar firma AMD de firma del cliente y dejar un solo canal comercial.

## Impacto

UI actual no exige dos usuarios internos. Deuda: persistir doble aprobación interna y el actor del cliente (contacto) si Dirección lo pide en un incremento.

## Autor

AMD Operations / AI Engineering Agent

---

# ADR-038 — Nomenclatura AMD-PART y liberación a manufactura

## Estado

Aceptada

## Fecha

2026-08-14

## Contexto

Los archivos de ingeniería no tienen número de parte ni revisión en `documents`. Dirección definió nomenclatura y qué puede bajar a piso.

## Decisión

Nomenclatura oficial de archivos / planos AMD:

```
AMD-PART-XXXX_REV-A
AMD-PART-XXXX_REV-B
AMD-PART-XXXX_REV-C
```

`XXXX` es el consecutivo de parte (operativo; no hay generador en código). La revisión avanza con ECO/ECN (ADR-040).

**Solo archivos en estado Liberado pueden utilizarse en Producción.**

En PostgreSQL el estado de la solicitud es `liberado`. Equivale al sello de negocio **Aprobado para manufactura**.

`aprobado` = el cliente (vía Ventas Técnicas) aceptó el diseño.  
`liberado` = Ingeniería libera el paquete vigente (planos, modelos, programas CAM) hacia cotización final y piso.

Producción (Fase 5) solamente consume, si origen `rfq_ingenieria`:

- Planos
- Modelos
- Programas CAM

ligados a la solicitud `liberado`. Si origen `rfq_directa`, consume adjuntos de la RFQ.

El código **no** valida el patrón `AMD-PART-XXXX_REV-*` en el nombre de archivo. Es regla operativa de nombrado hasta un incremento de control documental.

## Alternativas consideradas

- Estado extra `aprobado_manufactura` distinto de `liberado`: rechazado; duplicaría la máquina.
- PDM SolidWorks: rechazado en esta fase.

## Razón

Un sello único para piso. Trazabilidad Cliente → RFQ → solicitud → archivo Liberado → pedido.origin → OP.

## Impacto

[[Archivos Ingenieria]], [[Control Documental]], Fase 5. Campos `revision` / `part_number` en `documents` quedan como cambio recomendado, no obligatorio para abrir Fase 5.

## Autor

AMD Operations / AI Engineering Agent

---

# ADR-039 — Cobro y costeo de ingeniería

## Estado

Aceptada

## Fecha

2026-08-14

## Contexto

Las horas se capturan (`engineering_hours`, `hours_logged`) pero la cotización no separa diseño vs fabricación. Dirección definió cobro y campos de costeo.

## Decisión

**Cobro (no confundir con escenarios A/B de flujo ADR-031):**

| Cobro | Cuándo | Cómo se cobra |
|---|---|---|
| Escenario cobro A | El cliente entrega diseño completo | Costo de ingeniería **incluido** en fabricación |
| Escenario cobro B | Diseño desde cero | Cobro **independiente** |
| Escenario cobro C | Ingeniería inversa | Cobro **independiente** |

Mapeo con RFQ:

- `solo_fabricacion` (sin o con validación de manufactura) → cobro A (incluido), salvo que Ventas pacte otra cosa.
- `diseno_fabricacion` / `diseno_solamente` / tipo `diseno_nuevo` o `modificacion` → cobro B.
- `reverse_engineering` → cobro C.

**Campos oficiales de costeo** (diseño; **no persistidos** aún):

| Campo | Uso |
|---|---|
| Horas estimadas | Presupuesto de diseño |
| Horas reales | Suma de `engineering_hours` (este sí existe como `hours_logged`) |
| Costo hora | Tarifa interna / de venta |
| Costo total ingeniería | Estimadas o reales × costo hora, o tarifa fija |
| Tipo de cobro | `incluido` \| `tarifa_fija` \| `por_hora` |

No se implementan en esta entrega (auditoría documental). La cotización sigue usando `estimated_cost` de partida.

## Alternativas consideradas

- Partida automática de ingeniería al crear la RFQ: aplazado; hace falta tarifa y tipo de cobro.
- Solo notas en la RFQ: insuficiente para KPI horas estimadas vs reales.

## Razón

Costeo visible para Dirección y Ventas sin mezclar hora máquina y hora de diseño.

## Impacto

RFQ, Ingeniería, Business/Technical Spec. Incremento de schema futuro. KPI «Horas estimadas vs reales» no se puede calcular hoy.

## Autor

AMD Operations / AI Engineering Agent

---

# ADR-040 — ECO / ECN (cambio de ingeniería)

## Estado

Aceptada (diseño). No implementada en código.

## Fecha

2026-08-14

## Contexto

Tras `Aprobado` / `Liberado`, el cliente o AMD puede pedir un cambio. Hoy eso vuelve la misma solicitud a `correcciones` si aún no está liberada; si ya está `liberado`, la solicitud es inmutable (ADR-033: 1 RFQ → 0..1 activa).

## Decisión

Proceso oficial **ECO / ECN** (Engineering Change Order / Notice):

```
Solicitud de cambio
    → Evaluación de impacto
    → Costo
    → Tiempo
    → Aprobación del cliente
    → Liberación de nueva revisión (AMD-PART-XXXX_REV-n)
```

Reglas:

1. Un ECO no rompe la cardinalidad 1 RFQ → 1 solicitud activa. El ECO es **hijo** de la solicitud (o de la pieza), no una segunda RFQ obligatoria.
2. La revisión nueva (`REV-B`, `REV-C`, …) es el único paquete que Producción puede usar después de liberarla.
3. La revisión anterior queda histórica; no se borra.
4. Si el cambio altera precio o alcance comercial, Ventas actualiza o duplica la RFQ; el ECO no sustituye a la cotización.
5. Entidad prevista: `engineering_changes` (no existe). Hasta entonces: no desbloquear `liberado` para editar archivos; abrir ECO en un incremento.

## Alternativas consideradas

- Nueva RFQ por cada cambio: pesado para un ajuste de cota.
- Reabrir `liberado`: rechazado; pierde el sello de manufactura.

## Razón

Cambios controlados con impacto de costo/tiempo y nueva revisión vigente.

## Impacto

Fase 4.1 / 5. Producción debe colgarse de la revisión liberada, no del primer PDF.

## Autor

AMD Operations / AI Engineering Agent

---

# ADR-041 — Revisión DFM obligatoria

## Estado

Aceptada (diseño de proceso). Parcial en código (`revision_interna` + tipo `manufacturabilidad`).

## Fecha

2026-08-14

## Contexto

Dirección exige una revisión de manufacturabilidad (DFM) antes de mandar el plano al cliente o a piso.

## Decisión

Toda solicitud de diseño (nuevo, modificación, reverse engineering) pasa por **revisión DFM obligatoria**. Participan:

| Puesto | Rol de proceso |
|---|---|
| Ingeniería (Ingeniero de Diseño y Manufactura / Programador CNC) | Propone el diseño y el enfoque CAM |
| Programación CAM | Valida que se pueda programar (Mastercam / Fusion 360) |
| Jefe de Taller | Valida que el piso pueda fabricarlo (centros/máquinas AMD) |

Objetivo: manufacturabilidad, no estética CAD.

En el sistema actual el paso más cercano es `revision_interna` (y el atajo Asignado → Revisión Interna en validación). **No** hay checklist DFM, ni firma del Jefe de Taller (rol `produccion` solo tiene `engineering:read`).

Hasta un incremento: la revisión interna **incluye** DFM de forma operativa; el Jefe de Taller consulta el plano. No se libera a cliente (`esperando_cliente`) ni a manufactura (`liberado`) sin esa revisión.

## Alternativas consideradas

- Estado extra `dfm`: aplazado; se puede modelar como checklist sobre `revision_interna`.
- Dar `engineering:approve` a Producción ahora: no en esta entrega documental.

## Razón

Evitar que un CAD no fabricable llegue al cliente o al CNC.

## Impacto

[[Flujo Ingenieria]], Fase 5 (Jefe de Taller = Supervisor de Producción / puesto de planta). CAM no se ejecuta dentro de AMD Operations.

## Autor

AMD Operations / AI Engineering Agent

---

# ADR-042 — KPI oficiales de Ingeniería

## Estado

Aceptada

## Fecha

2026-08-14

## Contexto

El listado `/engineering` calcula abiertas, vencidas, aprobados del mes, cancelados, liberados, horas y tiempo promedio. Dirección fijó el set oficial.

## Decisión

KPI principales de Ingeniería:

| KPI oficial | ¿Se calcula hoy? |
|---|---|
| Cumplimiento liberación de diseño | ⬜ (haría falta due_date vs released_at) |
| Horas estimadas vs reales | ⬜ (faltan horas estimadas, ADR-039) |
| Errores de ingeniería | ⬜ (no hay entidad de error/NCR de diseño) |
| Retrabajos de ingeniería | Parcial: estado `correcciones` no se cuenta como KPI |
| Diseños liberados | ✅ `status = liberado` |
| Diseños aprobados | ✅ `approved_at` en el mes |
| Diseños rechazados | Parcial: se cuenta `cancelado`, no el rechazo del cliente que vuelve a correcciones |

Dashboard general (`/dashboard`): solo abiertas, vencidas, liberados. El detalle está en `/engineering`.

No pintar ceros fingidos. No mezclar con KPI de piso (ADR-030).

## Razón

Un tablero que Dirección pueda pedir sin ambigüedad.

## Impacto

[[KPI Ingenieria]], dashboard. Incrementos de cálculo; no bloquea Fase 5.

## Autor

AMD Operations / AI Engineering Agent

---

# ADR-043 — Catálogos operativos de Producción, Calidad y Compras (2026-08-14)

## Estado

Aceptada (documental). No implementada: no hay módulo de Producción.

## Fecha

2026-08-14

## Contexto

Tras ADR-030, Dirección precisó responsables, catálogos y cierre de OP. No reabre programación, prioridades 1–4 ni la prohibición de OEE.

## Decisión

**Fecha prometida:** la fija el **Gerente de Producción / Planeación**. Sigue siendo el criterio 1 de prioridad (ADR-030). El pedido mínimo **no** tiene el campo; irá en OP (y/o pedido) en Fase 5.

**Cliente estratégico** (flag futuro en CRM; no existe `customers.strategic`):

- Alto volumen
- Buen historial de pago
- Sector estratégico
- Potencial de crecimiento

Criterio 2 de prioridad de OP. La RFQ lo consulta; no lo calcula.

**Tiempos muertos oficiales** (catálogo de pausa de OP):

- Falla mecánica
- Setup
- Falta de material
- Espera de calidad
- Falta de operador
- Espera de programa
- Espera de plano

**Retrabajos** (Calidad / piso). Registrar: OP, parte, cantidad, scrap, causa raíz, horas hombre, horas máquina, liberación de calidad.

**Material crítico** (Compras / Inventario futuros):

- Inconel, Titanio, aceros especiales, PEEK
- Proveedor único
- Lead time > 15 días

**Compras urgentes** — condiciones (además del autorizador ADR-030):

- Riesgo de paro de producción
- Cliente estratégico
- Penalización contractual
- Material defectuoso

Autoriza: Dirección General (futuro: Gerente de Operaciones).

**Cierre de OP:**

- Cierre **físico** (producto): Inspector de Calidad (`Liberar Calidad`)
- Cierre **administrativo** (orden): Supervisor de Producción (`Cerrar Orden`)

Esto precisa ADR-030: el Supervisor ya no es solo «alternativa de liberación»; es dueño del cierre administrativo.

**KPI Dirección** (tablero ejecutivo, Fase 11; no fingir cifras): ventas del día, cotizaciones abiertas, cotizaciones ganadas, órdenes activas, órdenes retrasadas, entregas del día, material crítico, compras pendientes. Hoy solo cotizaciones abiertas (y convertidas del mes) son reales.

## Razón

Cierra las preguntas de piso/compras/calidad que Ingeniería y Fase 5 necesitan por escrito.

## Impacto

[[Proceso Producción]], [[Proceso Calidad]], [[Proceso Compras]], [[Proceso RFQ]], [[dashboard]]. Código ⬜.

## Autor

AMD Operations / AI Engineering Agent

---

# PLANTILLA PARA NUEVAS DECISIONES

Cuando sea necesario registrar una nueva decisión, utilizar:

## ADR-XXX — Título

### Estado

Propuesta / Aceptada / Rechazada / Reemplazada

### Contexto

Describir el problema.

### Decisión

Describir qué se decidió.

### Alternativas consideradas

Describir otras opciones importantes.

### Razón

Explicar por qué se eligió esta opción.

### Impacto

Describir consecuencias positivas y negativas.

### Fecha

YYYY-MM-DD

### Autor

AMD Operations / AI Engineering Agent

---

# REGLA FINAL

Este documento debe mantenerse actualizado.

Nunca borrar silenciosamente una decisión histórica.

Cuando una decisión sea reemplazada:

1. Mantener la decisión original.
2. Marcarla como `Reemplazada`.
3. Crear una nueva ADR.
4. Explicar qué cambió y por qué.
