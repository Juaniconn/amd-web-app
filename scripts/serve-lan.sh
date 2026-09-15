#!/usr/bin/env bash
# Levanta el ERP con Node 24 real, evitando el node de Hermes que gana en PATH.
set -uo pipefail
cd /home/juaniconn/projects/amd-web-app

N24="$HOME/.nvm/versions/node/v24.19.0/bin"
export PATH="$N24:$PATH"

echo "node en uso: $(node -v)"
exec npx next start --hostname :: --port 3000
