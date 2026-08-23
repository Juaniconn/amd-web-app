# Scripts de verificación

Scripts que validan el sistema **contra la base real**, sin abrir el
navegador. Todos leen `DATABASE_URL` de `.env.local`.

Los que escriben en la base **revierten al terminar** — son seguros de correr
en la demo.

## Verificación

| Comando | Qué valida |
|---|---|
| `npm run accounts` | Cuentas demo con su carga y procesos listos para iniciar |
| `npm run check:kpis` | KPIs del dashboard salen de la base |
| `npm run check:alerts` | Alertas reales y búsqueda global |
| `npm run check:operator` | Ciclo iniciar → terminar proceso, progreso en cascada |
| `npm run check:machining` | Horas máquina/hombre, scrap y retrabajo |
| `npm run check:qty` | Límite de cantidades — 7 casos |
| `npm run check:qty-e2e` | Límite de cantidades extremo a extremo |
| `npm run check:access` | Permisos Operador vs Jefe — 15 reglas |
| `npm run check:login` | Passwords validan con el hash real de Better Auth |
| `npm run check:landing` | Cada rol aterriza sin bucles de redirección |
| `npm run check:balance` | El seed reparte procesos parejo |
| `npm run check:users` | Usuarios, roles y credenciales |

## Reparación

| Comando | Qué hace |
|---|---|
| `npm run fix:operators` | Corrige correos, repone passwords, asigna roles |
| `npm run fix:rebalance` | Redistribuye procesos pendientes entre operadores |

`fix:rebalance` respeta el histórico: no toca procesos terminados ni los que
están en curso.

## Nota técnica

Estos scripts **no pueden** importar de `src/db` ni de servicios con
`server-only` — Node lanza error fuera del contexto de React Server
Components. Usan el cliente `postgres` directo y replican la lógica del
servicio que están validando.
