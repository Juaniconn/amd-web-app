#!/usr/bin/env bash
#
# setup-vps.sh — Prepara un VPS Ubuntu 24.04 ARM de Oracle Cloud para el ERP.
#
# Instala: Node 24, Docker, Caddy. Abre puertos, crea la estructura de
# directorios y deja PostgreSQL corriendo.
#
# Uso (dentro del VPS, como usuario ubuntu):
#   bash setup-vps.sh
#
# Es IDEMPOTENTE: se puede volver a correr sin romper nada.

set -euo pipefail

BASE=/opt/amd-erp
DOMINIO="${DOMINIO:-erp.amdmexico.com}"

log()  { printf '\n\033[1;34m==>\033[0m %s\n' "$*"; }
ok()   { printf '\033[1;32m  OK\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m  !!\033[0m %s\n' "$*"; }

# ---------------------------------------------------------------------------
log "Verificando el sistema"
# ---------------------------------------------------------------------------
ARCH=$(uname -m)
echo "  Arquitectura : $ARCH"
echo "  Ubuntu       : $(lsb_release -ds 2>/dev/null || echo desconocido)"
echo "  RAM          : $(free -h | awk '/^Mem:/{print $2}')"
echo "  CPUs         : $(nproc)"
echo "  Disco libre  : $(df -h / | awk 'NR==2{print $4}')"

if [[ "$ARCH" != "aarch64" && "$ARCH" != "x86_64" ]]; then
  warn "Arquitectura inesperada: $ARCH"
fi

RAM_GB=$(free -g | awk '/^Mem:/{print $2}')
if (( RAM_GB < 3 )); then
  warn "Solo ${RAM_GB}GB de RAM. El build de Next.js necesita ~2GB."
  warn "Si estás en la instancia Micro (1GB), NO va a funcionar."
  warn "Usa VM.Standard.A1.Flex con 2 OCPU / 12 GB."
fi

# ---------------------------------------------------------------------------
log "Actualizando paquetes base"
# ---------------------------------------------------------------------------
sudo apt-get update -qq
sudo apt-get install -y -qq \
  curl git ca-certificates gnupg lsb-release \
  ufw unzip htop jq postgresql-client
ok "paquetes base"

# ---------------------------------------------------------------------------
log "Node.js 24 (el proyecto exige >=24 <25)"
# ---------------------------------------------------------------------------
if command -v node >/dev/null 2>&1 && [[ "$(node -v)" == v24.* ]]; then
  ok "Node ya instalado: $(node -v)"
else
  curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash - >/dev/null
  sudo apt-get install -y -qq nodejs
  ok "Node instalado: $(node -v)  npm: $(npm -v)"
fi

# ---------------------------------------------------------------------------
log "Docker (para PostgreSQL)"
# ---------------------------------------------------------------------------
if command -v docker >/dev/null 2>&1; then
  ok "Docker ya instalado: $(docker --version)"
else
  sudo install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
    | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  sudo chmod a+r /etc/apt/keyrings/docker.gpg
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" \
    | sudo tee /etc/apt/sources.list.d/docker.list >/dev/null
  sudo apt-get update -qq
  sudo apt-get install -y -qq \
    docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  sudo usermod -aG docker "$USER"
  ok "Docker instalado (cierra y reabre la sesión SSH para usarlo sin sudo)"
fi
sudo systemctl enable --now docker

# ---------------------------------------------------------------------------
log "Caddy (HTTPS automático)"
# ---------------------------------------------------------------------------
if command -v caddy >/dev/null 2>&1; then
  ok "Caddy ya instalado: $(caddy version)"
else
  sudo apt-get install -y -qq debian-keyring debian-archive-keyring apt-transport-https
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' \
    | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' \
    | sudo tee /etc/apt/sources.list.d/caddy-stable.list >/dev/null
  sudo apt-get update -qq
  sudo apt-get install -y -qq caddy
  ok "Caddy instalado"
fi
sudo mkdir -p /var/log/caddy
sudo chown caddy:caddy /var/log/caddy

# ---------------------------------------------------------------------------
log "Firewall — el paso que rompe a todos en Oracle"
# ---------------------------------------------------------------------------
# Oracle Ubuntu trae iptables con REJECT en INPUT. Aunque abras los puertos
# en la Security List de la consola web, el tráfico muere en el propio host.
# Hay que abrirlos EN LOS DOS LADOS.

sudo iptables -I INPUT 5 -p tcp --dport 80  -j ACCEPT 2>/dev/null || true
sudo iptables -I INPUT 6 -p tcp --dport 443 -j ACCEPT 2>/dev/null || true

# Persistir las reglas al reinicio
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -qq iptables-persistent
sudo netfilter-persistent save >/dev/null
ok "puertos 80 y 443 abiertos en iptables (y persistidos)"

warn "FALTA el otro lado: en la consola de Oracle Cloud ve a"
warn "  Networking > Virtual Cloud Networks > tu VCN > Security Lists"
warn "  > Default Security List > Add Ingress Rules"
warn "  Source 0.0.0.0/0, TCP, Destination Port 80 y 443"

# ---------------------------------------------------------------------------
log "Estructura de directorios"
# ---------------------------------------------------------------------------
sudo mkdir -p "$BASE"/{releases,shared/uploads,backups}
sudo chown -R "$USER:$USER" "$BASE"
ok "$BASE creado"

# .env.production (plantilla si no existe)
ENVFILE="$BASE/shared/.env.production"
if [[ -f "$ENVFILE" ]]; then
  ok ".env.production ya existe (no se toca)"
else
  PGPASS=$(openssl rand -base64 24 | tr -d '/+=' | head -c 24)
  AUTHSECRET=$(openssl rand -base64 48 | tr -d '\n')
  ADMINPASS=$(openssl rand -base64 18 | tr -d '/+=' | head -c 18)

  cat > "$ENVFILE" <<EOF
# Generado por setup-vps.sh el $(date -Iseconds)
# Permisos 600. NO subir a git.

DATABASE_URL=postgresql://amd:${PGPASS}@127.0.0.1:5432/amd_operations
POSTGRES_USER=amd
POSTGRES_PASSWORD=${PGPASS}
POSTGRES_DB=amd_operations

BETTER_AUTH_SECRET=${AUTHSECRET}
BETTER_AUTH_URL=https://${DOMINIO}
BETTER_AUTH_TRUSTED_ORIGINS=https://${DOMINIO}
BETTER_AUTH_ALLOWED_HOSTS=${DOMINIO}

SEED_ADMIN_EMAIL=admin@amdmexico.com
SEED_ADMIN_PASSWORD=${ADMINPASS}
SEED_ADMIN_NAME=Administrador AMD

STORAGE_DIR=${BASE}/shared/uploads

# Rellena si usas la IA de cotización
CURSOR_API_KEY=
EOF
  chmod 600 "$ENVFILE"
  ok ".env.production generado con secretos aleatorios"
  echo
  echo "  ┌─────────────────────────────────────────────────────────┐"
  echo "  │  GUARDA ESTA CONTRASEÑA DE ADMINISTRADOR:                │"
  echo "  │  usuario: admin@amdmexico.com                            │"
  echo "  │  clave  : ${ADMINPASS}"
  echo "  └─────────────────────────────────────────────────────────┘"
  echo
fi

# ---------------------------------------------------------------------------
log "Ajuste de kernel para PostgreSQL + Node"
# ---------------------------------------------------------------------------
if ! grep -q "amd-erp" /etc/sysctl.conf 2>/dev/null; then
  sudo tee -a /etc/sysctl.conf >/dev/null <<'EOF'

# amd-erp: más conexiones y menos swap para el ERP
vm.swappiness=10
net.core.somaxconn=1024
EOF
  sudo sysctl -p >/dev/null
  ok "sysctl ajustado"
else
  ok "sysctl ya ajustado"
fi

# ---------------------------------------------------------------------------
log "Listo"
# ---------------------------------------------------------------------------
cat <<EOF

  Siguientes pasos:

  1. Abre los puertos 80 y 443 en la Security List de Oracle (ver aviso arriba).

  2. Apunta el DNS de ${DOMINIO} a esta IP:
       $(curl -s --max-time 5 ifconfig.me || echo '<IP pública del VPS>')

  3. Instala el Caddyfile:
       sudo cp deploy/Caddyfile /etc/caddy/Caddyfile
       sudo caddy validate --config /etc/caddy/Caddyfile
       sudo systemctl reload caddy

  4. Levanta PostgreSQL:
       cd /opt/amd-erp/current
       docker compose --env-file /opt/amd-erp/shared/.env.production \\
         -f docker-compose.prod.yml up -d

  5. Despliega la app con scripts/deploy/deploy.sh

  Secretos en: ${ENVFILE}
EOF
