#!/usr/bin/env bash
# Apunta amd-app/docs al vault de Obsidian. Ejecutar en WSL desde la raíz del repo.
set -euo pipefail
VAULT="/mnt/c/Users/ElJua/Documents/amd-docs"
APP="$(cd "$(dirname "$0")/.." && pwd)"
test -f "$VAULT/00 AMD Operations.md"
cd "$APP"
if [ -L docs ]; then
  echo "Ya es enlace: $(readlink docs)"
  exit 0
fi
mv docs docs.bak.wsl-copy
ln -s "$VAULT" docs
test -f "docs/00 AMD Operations.md"
rm -rf docs.bak.wsl-copy
echo "OK docs -> $VAULT"
