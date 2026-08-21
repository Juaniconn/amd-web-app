# AMD Operations

Plataforma operativa interna de **AMD México**. ERP monolítico **Next.js 16.3 + PostgreSQL + Drizzle + Better Auth + RBAC**.

Estado: **Fases 1–12 en código** (beta interna cerrada). Pendiente: Fase 13 (Cloudflare), Fase 12.5 (pentest, bloquea Fase 13).

---

## Requisitos

- **Node.js 24 LTS** (ver `.nvmrc` y `engines` en `package.json`)
  - El proyecto lo fija explícitamente; no usar 22 ni 26
  - `nvm use 24` o la ruta real `~/.nvm/versions/node/v24.19.0/bin`
- **PostgreSQL 16** (embebido, Docker o externo)
  - `npm run db:start` → embebido en puerto 5432, datos en `.data/postgres`
  - `docker compose up -d` → Postgres estable alternativo

---

## Arranque local

```bash
# 1. Credenciales (necesarias para arrancar)
cp .env.example .env.local
# Completa: BETTER_AUTH_SECRET, SEED_ADMIN_PASSWORD, DATABASE_URL, AUTH_URL
# Opcional: CURSOR_API_KEY (agente cotizaciones), SEED_ADMIN_EMAIL

# 2. Dependencias
export NVM_DIR="$HOME/.nvm"; . "$NVM_DIR/nvm.sh"; nvm use 24
npm install

# 3. Base de datos
npm run db:start          # embebido
npm run db:migrate        # 21 migraciones (0000-0021)
npm run db:seed           # datos DEMO (borra operativos)
npm run db:verify         # valida integridad

# 4. Servidor (EN OTRA TERMINAL, nunca en la misma)
#    Usa scripts/serve-lan.sh en vez de npm run start si hay Node 26 en el PATH
#    (por ejemplo, con Hermes instalado)
bash scripts/serve-lan.sh
```

**Para construir antes de typecheck** (necesario para LayoutProps):

```bash
npm run build     # genera .next/types/ antes del typecheck
npm run typecheck
```

---

## Acceso LAN (pruebas con usuarios)

```powershell
# Host Windows, como administrador:
C:\Users\ElJua\amd-lan-fix.ps1
```

La IP de WSL cambia al reiniciar. El script rehace el reenvío de puerto y el firewall. Dirección para usuarios: `http://192.168.1.190:3000`.

---

## Calidad

```bash
npm test          # 140 tests (vitest)
npm run lint      # eslint
npm run typecheck # tsc --noEmit (correr build ANTES)
npm run build     # next build
```

**Nota importante:** `npm run dev` (Turbopack) se cuelga bajo carga. Para pruebas con usuarios, usar `bash scripts/serve-lan.sh` (modo producción).

---

## Documentación

La documentación vive **solo** en el vault Obsidian — nunca en este repo:

```
C:\Users\ElJua\Documents\amd-docs\
```

El repositorio incluye un symlink `docs/` que apunta al vault, excluido de `.gitignore`. Sin ese symlink, Obsidian no se enlaza al clonar.

Fuente de verdad documental: `ARCHITECTURE_DECISIONS.md`, `PROMPT MAESTRO`, ADR-060..062. El README puede estar desactualizado; el vault no.

---

## Arquitectura

```
src/app/(dashboard)     páginas por módulo
src/features/<modulo>   componentes y lógica de UI
src/server/actions      Server Actions (mutaciones)
src/server/services     lógica de negocio
src/server/{auth,db}    autenticación, conexión BD
src/lib/validation      esquemas Zod
src/db/schema           Drizzle (21 migraciones)
src/db/seed-*           semillas DEMO
```

Permisos: `src/lib/permissions/catalog.ts` · Navegación: `src/lib/navigation.ts`
