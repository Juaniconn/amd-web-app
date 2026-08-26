#!/usr/bin/env bash
#
# backup.sh — Respaldo de la base de datos del ERP.
#
# Uso manual:
#   bash scripts/deploy/backup.sh
#
# Automático (crontab -e), diario a las 2am:
#   0 2 * * * /bin/bash /opt/amd-erp/repo/scripts/deploy/backup.sh >> /opt/amd-erp/backups/backup.log 2>&1

set -euo pipefail

BASE=/opt/amd-erp
DESTINO="$BASE/backups"
ENVFILE="$BASE/shared/.env.production"
CONSERVAR_DIAS=14
TS=$(date +%Y%m%d_%H%M%S)

[[ -f "$ENVFILE" ]] || { echo "ERROR: no existe $ENVFILE" >&2; exit 1; }
set -a; source "$ENVFILE"; set +a

mkdir -p "$DESTINO"
ARCHIVO="$DESTINO/amd_operations_${TS}.sql.gz"

echo "[$(date -Iseconds)] Iniciando respaldo"

# --clean --if-exists deja el dump listo para restaurar sobre una base existente
if docker exec amd_postgres pg_dump \
      -U "${POSTGRES_USER:-amd}" \
      -d "${POSTGRES_DB:-amd_operations}" \
      --clean --if-exists --no-owner --no-privileges \
    | gzip > "$ARCHIVO"; then
  TAM=$(du -h "$ARCHIVO" | cut -f1)
  echo "[$(date -Iseconds)] OK: $ARCHIVO ($TAM)"
else
  echo "[$(date -Iseconds)] ERROR: pg_dump falló" >&2
  rm -f "$ARCHIVO"
  exit 1
fi

# Verificar que el gzip no esté corrupto
if ! gzip -t "$ARCHIVO" 2>/dev/null; then
  echo "[$(date -Iseconds)] ERROR: el respaldo está corrupto" >&2
  rm -f "$ARCHIVO"
  exit 1
fi
echo "[$(date -Iseconds)] integridad verificada"

# Respaldo de los archivos subidos (planos, PDFs)
UPLOADS="$BASE/shared/uploads"
if [[ -d "$UPLOADS" ]] && [[ -n "$(ls -A "$UPLOADS" 2>/dev/null)" ]]; then
  TARUP="$DESTINO/uploads_${TS}.tar.gz"
  tar -czf "$TARUP" -C "$BASE/shared" uploads
  echo "[$(date -Iseconds)] uploads: $TARUP ($(du -h "$TARUP" | cut -f1))"
fi

# Limpiar respaldos viejos
BORRADOS=$(find "$DESTINO" -name "amd_operations_*.sql.gz" -mtime "+$CONSERVAR_DIAS" -delete -print | wc -l)
find "$DESTINO" -name "uploads_*.tar.gz" -mtime "+$CONSERVAR_DIAS" -delete
[[ "$BORRADOS" -gt 0 ]] && echo "[$(date -Iseconds)] borrados $BORRADOS respaldos de más de $CONSERVAR_DIAS días"

echo "[$(date -Iseconds)] Respaldo completado. Total en disco: $(du -sh "$DESTINO" | cut -f1)"

# --- Cómo restaurar ---
# gunzip -c amd_operations_YYYYMMDD_HHMMSS.sql.gz \
#   | docker exec -i amd_postgres psql -U amd -d amd_operations
