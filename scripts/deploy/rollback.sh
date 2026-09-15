#!/usr/bin/env bash
#
# rollback.sh — Vuelve al release anterior del ERP.
#
# Uso:
#   bash scripts/deploy/rollback.sh          # al inmediato anterior
#   bash scripts/deploy/rollback.sh 20260826120000   # a uno específico

set -euo pipefail

BASE=/opt/amd-erp
RELEASES="$BASE/releases"
CURRENT="$BASE/current"

log() { printf '\n\033[1;34m==>\033[0m %s\n' "$*"; }
err() { printf '\033[1;31m  ERROR\033[0m %s\n' "$*" >&2; exit 1; }

[[ -d "$RELEASES" ]] || err "No existe $RELEASES"

ACTUAL=""
[[ -L "$CURRENT" ]] && ACTUAL=$(basename "$(readlink -f "$CURRENT")")

log "Releases disponibles"
ls -1t "$RELEASES" | while read -r d; do
  MARCA=""
  [[ "$d" == "$ACTUAL" ]] && MARCA="  <-- activo"
  COMMIT=$(cat "$RELEASES/$d/RELEASE_COMMIT" 2>/dev/null || echo '?')
  FECHA=$(cat "$RELEASES/$d/RELEASE_DATE" 2>/dev/null || echo '?')
  printf '  %s  %s  %s%s\n' "$d" "$COMMIT" "$FECHA" "$MARCA"
done

DESTINO="${1:-}"
if [[ -z "$DESTINO" ]]; then
  # El primero que no sea el activo
  DESTINO=$(ls -1t "$RELEASES" | grep -v "^${ACTUAL}$" | head -1 || true)
fi

[[ -n "$DESTINO" ]] || err "No hay release anterior al que volver"
[[ -d "$RELEASES/$DESTINO" ]] || err "No existe el release $DESTINO"
[[ "$DESTINO" != "$ACTUAL" ]] || err "$DESTINO ya es el release activo"

log "Revirtiendo: $ACTUAL -> $DESTINO"
ln -sfn "$RELEASES/$DESTINO" "$CURRENT"
sudo systemctl restart amd-erp

for i in {1..20}; do
  sleep 2
  CODE=$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 http://127.0.0.1:3000/login || echo 000)
  [[ "$CODE" == "200" ]] && break
done

if [[ "$CODE" == "200" ]]; then
  printf '\033[1;32m  OK\033[0m ERP en línea con el release %s\n' "$DESTINO"
else
  err "El release $DESTINO tampoco responde (HTTP $CODE). Revisa: sudo journalctl -u amd-erp -n 40"
fi

echo
echo "  OJO: el rollback NO revierte migraciones de base de datos."
echo "  Si el release nuevo migró el esquema, revísalo a mano."
