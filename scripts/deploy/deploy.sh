#!/usr/bin/env bash
#
# deploy.sh — Despliega el ERP en el VPS de Oracle.
#
# Se ejecuta DENTRO del VPS. Hace build, migra la base y reinicia el servicio
# con releases versionados, para poder revertir si algo sale mal.
#
# Uso:
#   cd /opt/amd-erp/repo && bash scripts/deploy/deploy.sh
#
# Estructura que maneja:
#   /opt/amd-erp/repo             clon de git (se hace pull aquí)
#   /opt/amd-erp/releases/<ts>/   build empaquetado de cada despliegue
#   /opt/amd-erp/current -> releases/<ts>   symlink al release activo
#   /opt/amd-erp/shared/          .env.production y uploads (persisten)

set -euo pipefail

BASE=/opt/amd-erp
REPO="$BASE/repo"
RELEASES="$BASE/releases"
SHARED="$BASE/shared"
CURRENT="$BASE/current"
ENVFILE="$SHARED/.env.production"
TS=$(date +%Y%m%d%H%M%S)
NUEVO="$RELEASES/$TS"
CONSERVAR=3   # releases anteriores que se guardan para revertir

log()  { printf '\n\033[1;34m==>\033[0m %s\n' "$*"; }
ok()   { printf '\033[1;32m  OK\033[0m %s\n' "$*"; }
err()  { printf '\033[1;31m  ERROR\033[0m %s\n' "$*" >&2; }

fallo() {
  err "$1"
  if [[ -d "$NUEVO" ]]; then
    echo "  Limpiando release incompleto: $NUEVO"
    rm -rf "$NUEVO"
  fi
  exit 1
}

# ---------------------------------------------------------------------------
log "Comprobaciones previas"
# ---------------------------------------------------------------------------
[[ -f "$ENVFILE" ]] || fallo "No existe $ENVFILE. Corre setup-vps.sh primero."
[[ -d "$REPO" ]]    || fallo "No existe $REPO. Clona el repo ahí primero."

# Cargar variables para las migraciones
set -a; source "$ENVFILE"; set +a
[[ -n "${DATABASE_URL:-}" ]] || fallo "DATABASE_URL vacío en $ENVFILE"

command -v node >/dev/null || fallo "Node no está instalado"
NODE_MAJOR=$(node -v | sed -E 's/v([0-9]+).*/\1/')
(( NODE_MAJOR >= 24 )) || fallo "Node $NODE_MAJOR detectado, se requiere >=24"
ok "Node $(node -v)"

# ---------------------------------------------------------------------------
log "Comprobando PostgreSQL"
# ---------------------------------------------------------------------------
if ! pg_isready -h 127.0.0.1 -p 5432 -q 2>/dev/null; then
  echo "  Postgres no responde, intentando levantarlo..."
  (cd "$REPO" && docker compose --env-file "$ENVFILE" -f docker-compose.prod.yml up -d)
  for i in {1..30}; do
    pg_isready -h 127.0.0.1 -p 5432 -q 2>/dev/null && break
    sleep 2
  done
  pg_isready -h 127.0.0.1 -p 5432 -q 2>/dev/null \
    || fallo "PostgreSQL no arrancó. Revisa: docker compose logs postgres"
fi
ok "PostgreSQL responde"

# ---------------------------------------------------------------------------
log "Actualizando código"
# ---------------------------------------------------------------------------
cd "$REPO"
git fetch --all --quiet
RAMA=$(git rev-parse --abbrev-ref HEAD)
git reset --hard "origin/$RAMA" --quiet
COMMIT=$(git rev-parse --short HEAD)
ok "rama $RAMA en $COMMIT — $(git log -1 --pretty=%s)"

# ---------------------------------------------------------------------------
log "Instalando dependencias"
# ---------------------------------------------------------------------------
# npm ci respeta package-lock.json exactamente.
# Incluye devDependencies porque next build las necesita (tailwind, tsc).
npm ci --no-audit --no-fund || fallo "npm ci falló"
ok "dependencias instaladas"

# ---------------------------------------------------------------------------
log "Verificando tipos"
# ---------------------------------------------------------------------------
npx tsc --noEmit || fallo "typecheck falló — no se despliega código roto"
ok "typecheck limpio"

# ---------------------------------------------------------------------------
log "Migrando la base de datos"
# ---------------------------------------------------------------------------
# Se hace ANTES del build: si la migración falla, no se toca el servicio activo.
npm run db:migrate || fallo "migraciones fallaron"
ok "migraciones aplicadas"

# ---------------------------------------------------------------------------
log "Compilando (output: standalone)"
# ---------------------------------------------------------------------------
NODE_ENV=production npm run build || fallo "build falló"
[[ -d .next/standalone ]] || fallo "no se generó .next/standalone — falta output:'standalone' en next.config.ts"
ok "build completado"

# ---------------------------------------------------------------------------
log "Empaquetando release $TS"
# ---------------------------------------------------------------------------
mkdir -p "$NUEVO"
cp -r .next/standalone/. "$NUEVO"/

# server.js NO copia public/ ni .next/static: hay que hacerlo a mano
# (documentado en node_modules/next/dist/docs/.../output.md)
mkdir -p "$NUEVO/.next"
cp -r .next/static "$NUEVO/.next/static"
[[ -d public ]] && cp -r public "$NUEVO/public"

# Migraciones dentro del release, para poder migrar sin el repo
mkdir -p "$NUEVO/src/db"
cp -r src/db/migrations "$NUEVO/src/db/migrations" 2>/dev/null || true

# Uploads compartidos entre releases (no se pierden al desplegar)
ln -sfn "$SHARED/uploads" "$NUEVO/.data-uploads"

echo "$COMMIT" > "$NUEVO/RELEASE_COMMIT"
date -Iseconds > "$NUEVO/RELEASE_DATE"

TAM=$(du -sh "$NUEVO" | cut -f1)
ok "release empaquetado ($TAM)"

# ---------------------------------------------------------------------------
log "Activando release"
# ---------------------------------------------------------------------------
ANTERIOR=""
[[ -L "$CURRENT" ]] && ANTERIOR=$(readlink -f "$CURRENT")

ln -sfn "$NUEVO" "$CURRENT"
ok "current -> $TS"

# ---------------------------------------------------------------------------
log "Reiniciando el servicio"
# ---------------------------------------------------------------------------
sudo systemctl restart amd-erp

# Esperar a que responda de verdad, no solo a que systemd diga "active"
ARRIBA=false
for i in {1..30}; do
  sleep 2
  CODE=$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 http://127.0.0.1:3000/login || echo 000)
  if [[ "$CODE" == "200" ]]; then ARRIBA=true; break; fi
done

if [[ "$ARRIBA" != true ]]; then
  err "La app no responde en /login tras 60s (último código: $CODE)"
  echo
  echo "  Logs:"
  sudo journalctl -u amd-erp -n 30 --no-pager | sed 's/^/    /'
  echo
  if [[ -n "$ANTERIOR" && -d "$ANTERIOR" ]]; then
    log "REVIRTIENDO a $(basename "$ANTERIOR")"
    ln -sfn "$ANTERIOR" "$CURRENT"
    sudo systemctl restart amd-erp
    sleep 8
    CODE2=$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 http://127.0.0.1:3000/login || echo 000)
    if [[ "$CODE2" == "200" ]]; then
      err "Revertido al release anterior — el ERP sigue en línea"
    else
      err "El rollback tampoco responde. Revisa los logs a mano."
    fi
  fi
  exit 1
fi
ok "app responde en /login (HTTP 200)"

# ---------------------------------------------------------------------------
log "Limpiando releases viejos"
# ---------------------------------------------------------------------------
cd "$RELEASES"
BORRAR=$(ls -1t | tail -n +$((CONSERVAR + 1)) || true)
if [[ -n "$BORRAR" ]]; then
  echo "$BORRAR" | while read -r d; do
    [[ -n "$d" && "$d" != "$TS" ]] && rm -rf "$RELEASES/$d" && echo "  borrado $d"
  done
fi
ok "se conservan los últimos $CONSERVAR releases"

# ---------------------------------------------------------------------------
log "DESPLIEGUE COMPLETADO"
# ---------------------------------------------------------------------------
cat <<EOF

  Release  : $TS
  Commit   : $COMMIT
  Tamaño   : $TAM
  Local    : http://127.0.0.1:3000  (HTTP 200 verificado)
  Público  : ${BETTER_AUTH_URL:-<configura BETTER_AUTH_URL>}

  Logs en vivo:  sudo journalctl -u amd-erp -f
  Revertir:      bash scripts/deploy/rollback.sh
EOF
