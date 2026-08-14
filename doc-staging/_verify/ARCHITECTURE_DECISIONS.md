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
