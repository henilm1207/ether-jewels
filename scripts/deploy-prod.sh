#!/usr/bin/env bash
# Production deploy for etherstarjewels.cloud — Docker edition.
# Runs ON the VPS as site user `etherstar` (never root; that user is in the
# `docker` group). Invoked by GitHub Actions on push to main:
#   cd /home/etherstar/htdocs/etherstarjewels.cloud && bash scripts/deploy-prod.sh
# Flow: pull -> docker compose build (app only) -> up -d -> verify -> (rollback on failure).
# mongo's data volume is untouched by app deploys/rollbacks — only the app
# image is rebuilt/restarted. Never prints secret values. Never touches
# server/.env or the root .env (Mongo root creds).
set -euo pipefail

APP_DIR="${APP_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
PORT="${PORT:-5001}"
DOMAIN="${DOMAIN:-etherstarjewels.cloud}"

log() { printf '[%s] %s\n' "$(date -u '+%Y-%m-%dT%H:%M:%SZ')" "$*"; }
compose() { docker compose -f "$COMPOSE_FILE" "$@"; }

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
  compose up --build -d app
  log "Rollback done (best effort). Check: docker compose -f $COMPOSE_FILE logs app"
}

trap 'code=$?; trap - ERR; log "Deploy FAILED (exit $code); rolling back"; rollback; exit $code' ERR

log "Fetching origin/main"
git fetch origin
git checkout main
git reset --hard origin/main
NEW_SHA="$(git rev-parse HEAD)"
log "NEW_SHA=$NEW_SHA"

if [ ! -f server/.env ]; then
  log "ERROR: server/.env missing. Refusing to deploy."
  exit 1
fi
if [ ! -f .env ]; then
  log "ERROR: .env missing (needs MONGO_ROOT_USER/MONGO_ROOT_PASSWORD for docker compose). Refusing to deploy."
  exit 1
fi
if ! grep -q 'etherstarjewels.cloud' server/.env; then
  log "WARNING: server/.env has no FRONTEND_URL for $DOMAIN (continuing; verify on site)"
fi

if [ "$PREV_SHA" = "$NEW_SHA" ]; then
  log "Already at $NEW_SHA — verifying only (no rebuild)"
else
  log "Building + starting app container"
  compose up --build -d app
fi

log "Verifying containers"
compose ps
compose ps app | grep -qi 'running\|healthy'
compose ps mongo | grep -qi 'running\|healthy'

log "Verifying API locally"
# Cold boots can take a while (Mongo connect, sweeper warm-up), so poll
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

log "Pruning dangling images from the previous build"
docker image prune -f >/dev/null 2>&1 || true

trap - ERR
log "Deploy OK: $PREV_SHA -> $NEW_SHA"
