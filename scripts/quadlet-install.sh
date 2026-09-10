#!/usr/bin/env bash
# Install Quadlet units for the current user and start them.
# Usage: bash scripts/quadlet-install.sh [/path/to/foodshare-web.env]
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_SRC="${1:-$ROOT/.env.production}"
UNIT_DIR="${HOME}/.config/containers/systemd"

mkdir -p "$UNIT_DIR" /etc/foodshare 2>/dev/null || sudo mkdir -p /etc/foodshare || true
cp "$ROOT/foodshare-web.container" "$ROOT/foodshare-cloudflared-web.container" "$ROOT/foodshare-web-network.network" "$UNIT_DIR/"

if [ -f "$ENV_SRC" ]; then
  if [ -w /etc/foodshare ]; then cp "$ENV_SRC" /etc/foodshare/foodshare-web.env;
  else sudo cp "$ENV_SRC" /etc/foodshare/foodshare-web.env; fi
  echo "env installed from $ENV_SRC"
else
  echo "WARNING: $ENV_SRC not found — create /etc/foodshare/foodshare-web.env before starting" >&2
fi

systemctl --user daemon-reload
systemctl --user enable --now foodshare-web-network foodshare-web foodshare-cloudflared-web
systemctl --user status foodshare-web --no-pager | head -15
