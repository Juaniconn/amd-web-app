# AMD Operations

Plataforma operativa interna de AMD México. Fase 2 — CRM.

## Requisitos

- Node.js 22
- PostgreSQL (administrado, Docker o `npm run db:start`)

## Arranque local

```bash
cp .env.example .env.local
# Completa BETTER_AUTH_SECRET y SEED_ADMIN_PASSWORD

npm install
npm run db:start          # si no usas Docker ni un Postgres externo
# en otra terminal:
npm run db:migrate
npm run db:seed
npm run dev
```

Con Docker: `docker compose up -d` en lugar de `npm run db:start`.

El usuario administrador se crea con `SEED_ADMIN_*` en `.env.local`.

Para entrar desde otra PC en la red local, usa la IP de este equipo, por ejemplo `http://192.168.1.50:3000`. El servidor ya escucha en `0.0.0.0`. Reinicia `npm run dev` después de este cambio.

## Calidad

```bash
npm test
npm run lint
npm run typecheck
npm run build
```
