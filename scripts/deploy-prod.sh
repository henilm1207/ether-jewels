#!/usr/bin/env bash
# Production deploy for etherstarjewels.cloud.
# Runs ON the VPS as site user `etherstar` (never root — protects
# /home/etherstar file ownership). Invoked by GitHub Actions on push to main:
#   cd /home/etherstar/htdocs/etherstarjewels.cloud && bash scripts/deploy-prod.sh
# Proven flow preserved: pull -> vite build -> pm2 restart -> verify.
# Never prints secret values. Never touches server/.env.
set -euo pipefail

APP_DIR="${APP_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
PM2_APP="${PM2_APP:-etherstar}"
PORT="${PORT:-5001}"
DOMAIN="${DOMAIN:-etherstarjewels.cloud}"
REQUIRED_NODE_MAJOR="${REQUIRED_NODE_MAJOR:-20}"

log() { printf '[%s] %s\n' "$(date -u '+%Y-%m-%dT%H:%M:%SZ')" "$*"; }

if [ "$(id -un)" = "root" ]; then
  log "ERROR: run as site user 'etherstar', not root (preserves file ownership). Aborting."
  exit 1
fi

cd "$APP_DIR"
# PREV_SHA may be exported by the caller (GitHub Action bootstraps the pull
# before this script exists/runs); otherwise capture it here.
PREV_SHA="${PREV_SHA:-$(git rev-parse HEAD)}"
log "Deploy start in $APP_DIR as $(id -un); PREV_SHA=$PREV_SHA"

rollback() {
  trap - ERR || true
  set +e
  log "ROLLBACK to $PREV_SHA"
  git reset --hard "$PREV_SHA"
  if [ -f client/package.json ]; then
    (cd client && npm run build >/dev/null 2>&1)
  fi
  pm2 restart "$PM2_APP" --update-env >/dev/null 2>&1
  log "Rollback done (best effort). Check: pm2 logs $PM2_APP"
}

trap 'code=$?; trap - ERR; log "Deploy FAILED (exit $code); rolling back"; rollback; exit $code' ERR

log "Fetching origin/main"
git fetch origin
git checkout main
git reset --hard origin/main
NEW_SHA="$(git rev-parse HEAD)"
log "NEW_SHA=$NEW_SHA"

# Node 22 via nvm (non-interactive SSH has no PATH preset)
if [ -s "$HOME/.nvm/nvm.sh" ]; then
  # shellcheck disable=SC1090
  . "$HOME/.nvm/nvm.sh"
  nvm use 22 >/dev/null 2>&1 || nvm use default >/dev/null 2>&1 || true
fi
NODE_V="$(node -v)"
NODE_MAJOR="${NODE_V#v}"
NODE_MAJOR="${NODE_MAJOR%%.*}"
log "node $NODE_V"
if [ "$NODE_MAJOR" -lt "$REQUIRED_NODE_MAJOR" ]; then
  log "ERROR: node >= $REQUIRED_NODE_MAJOR required, got $NODE_V"
  exit 1
fi

# Env presence checks only — values never echoed
if [ ! -f server/.env ] && [ ! -f .env ]; then
  log "ERROR: server/.env missing (and no root .env fallback). Refusing to restart."
  exit 1
fi
if [ -f server/.env ] && ! grep -q 'etherstarjewels.cloud' server/.env; then
  log "WARNING: server/.env has no FRONTEND_URL for $DOMAIN (continuing; verify on site)"
fi

if [ "$PREV_SHA" = "$NEW_SHA" ]; then
  log "Already at $NEW_SHA — verifying only (no rebuild)"
else
  log "Installing dependencies (npm ci)"
  npm ci --no-audit --no-fund
  npm ci --no-audit --no-fund --prefix server
  npm ci --no-audit --no-fund --prefix client

  log "Building storefront (vite build)"
  npm run build --prefix client
fi

if [ ! -f client/dist/index.html ]; then
  log "ERROR: client/dist/index.html missing after build"
  exit 1
fi

export NODE_ENV=production
export PORT
log "Restarting PM2 app $PM2_APP (NODE_ENV=production PORT=$PORT)"
pm2 restart "$PM2_APP" --update-env
pm2 save || true

log "Verifying PM2 state"
pm2 show "$PM2_APP" | grep -qi 'status.*online'

log "Verifying API locally"
# Cold boots can take a while (Atlas TLS connect, sweeper warm-up), so poll
# with backoff instead of a single check after a fixed sleep.
wait_for_url() {
  local url="$1"
  local tries="${2:-24}"
  local i
  for ((i = 1; i <= tries; i++)); do
    if curl -fsS "$url" >/dev/null; then
      log "OK (attempt $i/$tries): $url"
      return 0
    fi
    sleep 5
  done
  log "ERROR: still unreachable after $((tries * 5))s: $url"
  return 1
}
wait_for_url "http://localhost:${PORT}/api/health" 24

log "Verifying public site"
wait_for_url "https://$DOMAIN/api/health" 24
curl -fsS "https://$DOMAIN/" | grep -qi '<!doctype html'

trap - ERR
log "Deploy OK: $PREV_SHA -> $NEW_SHA"
