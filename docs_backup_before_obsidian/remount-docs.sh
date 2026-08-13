#!/usr/bin/env bash
# Reconnect AMD docs after a WSL restart.
# Physical files live at: /mnt/c/Users/ElJua/Documents/amd-docs
# Project path:           /home/juaniconn/projects/amd-app/docs
#
# From Windows PowerShell:
#   wsl -d Ubuntu -u root -- mount --bind /mnt/c/Users/ElJua/Documents/amd-docs /home/juaniconn/projects/amd-app/docs
#
# Or from WSL as root:
#   bash /home/juaniconn/projects/amd-app/docs_backup_before_obsidian/remount-docs.sh

set -euo pipefail

WIN_VAULT="/mnt/c/Users/ElJua/Documents/amd-docs"
DOCS="/home/juaniconn/projects/amd-app/docs"

if [[ "$(id -u)" -ne 0 ]]; then
  echo "This bind-mount requires root. Re-run as:"
  echo "  wsl -d Ubuntu -u root -- bash $0"
  exit 1
fi

if [[ ! -d "$WIN_VAULT" ]]; then
  echo "Windows vault not found: $WIN_VAULT"
  exit 1
fi

mkdir -p "$DOCS"

if findmnt "$DOCS" >/dev/null 2>&1; then
  echo "Already mounted:"
  findmnt "$DOCS"
  exit 0
fi

mount --bind "$WIN_VAULT" "$DOCS"
echo "Mounted $WIN_VAULT -> $DOCS"
findmnt "$DOCS"
ls -la "$DOCS"
