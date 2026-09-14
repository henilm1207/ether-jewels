#!/usr/bin/env bash
# mongo-express dashboard for etherstarjewels.cloud.
# Runs ON the VPS as site user `etherstar` (never root — same rule as
# scripts/deploy-prod.sh). Idempotent: safe to re-run (restarts instead of
# duplicating the PM2 process).
#
# Usage (VPS, as etherstar):
#   bash scripts/setup-mongo-express.sh
#
# Optional env overrides (never commit values — type them on the VPS only):
#   GUI_RO_PW / DASH_USER / DASH_PW / SITE_SECRET
#   (unset => generated with openssl and printed ONCE — save them immediately)
#
# After this script: DNS A record db.etherstarjewels.cloud -> VPS IP,
# then as root: install ops/mongo-express/nginx-db.conf, certbot TLS,
# and lock down UFW (see the command sheet in chat).
#
# Secrets policy: caller-supplied values are never printed. Generated values
# are printed ONCE to this terminal (stderr, never to any file) so you can
# save them — there is no other way to recover them.
set -euo pipefail

PM2_APP="${PM2_APP:-mongo-express}"
ME_PORT="${ME_PORT:-8081}"
DB_NAME="${DB_NAME:-etherstar-jewels}"
REQUIRED_NODE_MAJOR="${REQUIRED_NODE_MAJOR:-20}"

log() { printf '[%s] %s\n' "$(date -u '+%Y-%m-%dT%H:%M:%SZ')" "$*"; }

if [ "$(id -un)" = "root" ]; then
  log "ERROR: run as site user 'etherstar', not root. Aborting."
  exit 1
fi

# Node 22 via nvm (same approach as deploy-prod.sh; non-interactive SSH
# has no PATH preset, so source nvm explicitly).
if [ -s "$HOME/.nvm/nvm.sh" ]; then
  # shellcheck disable=SC1090
  . "$HOME/.nvm/nvm.sh"
  nvm use 22 >/dev/null 2>&1 || nvm use default >/dev/null 2>&1 || true
fi
if ! command -v node >/dev/null 2>&1; then
  log "ERROR: node not found (expected nvm Node 22 for user $(id -un)). Aborting."
  exit 1
fi
NODE_V="$(node -v)"
NODE_MAJOR="${NODE_V#v}"
NODE_MAJOR="${NODE_MAJOR%%.*}"
log "node $NODE_V"
if [ "$NODE_MAJOR" -lt "$REQUIRED_NODE_MAJOR" ]; then
  log "ERROR: node >= $REQUIRED_NODE_MAJOR required, got $NODE_V"
  exit 1
fi
for cmd in npm pm2 mongosh openssl curl; do
  if ! command -v "$cmd" >/dev/null 2>&1; then
    log "ERROR: required command '$cmd' not found. Aborting."
    exit 1
  fi
done

# Credentials: explicit env wins, otherwise generate once. Record beforehand
# whether the caller supplied values, so the end-of-run message is accurate.
HAD_GUI_RO_PW="$([ -n "${GUI_RO_PW:-}" ] && echo 1 || echo 0)"
HAD_DASH_PW="$([ -n "${DASH_PW:-}" ] && echo 1 || echo 0)"
GUI_RO_PW="${GUI_RO_PW:-$(openssl rand -base64 24 | tr -d '\n')}"
DASH_USER="${DASH_USER:-dbadmin}"
DASH_PW="${DASH_PW:-$(openssl rand -base64 24 | tr -d '\n')}"
SITE_SECRET="${SITE_SECRET:-$(openssl rand -base64 32 | tr -d '\n')}"
if [ -z "${GUI_RO_PW:-}" ] || [ -z "${DASH_PW:-}" ] || [ -z "${SITE_SECRET:-}" ]; then
  log "ERROR: credential generation failed (openssl missing?). Aborting."
  exit 1
fi
GENERATED_DASH=0
GENERATED_RO=0
if [ "$HAD_GUI_RO_PW" = "0" ]; then GENERATED_RO=1; fi
if [ "$HAD_DASH_PW" = "0" ]; then GENERATED_DASH=1; fi

log "Installing mongo-express@1 globally (driver supports MongoDB 8.0)"
npm i -g --no-audit --no-fund "mongo-express@1"
ME_BIN="$(command -v mongo-express)"
log "mongo-express at $ME_BIN"

# Read-only GUI user (view everything, change nothing). Needs a privileged
# Mongo credential once: reuse siteAdmin if you have it, else etherapp owner.
# Provide via MONGO_ADMIN_URI env (never typed into shell history files here —
# Read -s when interactive. NOTE: if the siteAdmin password contains URI
# metacharacters (@ : / ? & #), URL-encode them first, or export a ready-made
# MONGO_ADMIN_URI env var instead of using the prompt.
if [ -z "${MONGO_ADMIN_URI:-}" ]; then
  if [ -t 0 ]; then
    printf 'siteAdmin password (input hidden, only used to create gui_ro): ' >&2
    read -rs ADMIN_PW_INPUT
    printf '\n' >&2
    MONGO_ADMIN_URI="mongodb://siteAdmin:${ADMIN_PW_INPUT}@127.0.0.1:27017/admin?directConnection=true"
    unset ADMIN_PW_INPUT
  else
    log "ERROR: set MONGO_ADMIN_URI env (non-interactive shell). Aborting."
    exit 1
  fi
fi
log "Ensuring read-only user 'gui_ro' on $DB_NAME"
# Drop-then-create (not create-or-keep): re-runs converge the stored password
# to this run's GUI_RO_PW, so Mongo and the PM2 env below can never disagree.
# The user holds roles only — dropping it loses no data.
mongosh --quiet "$MONGO_ADMIN_URI" --eval "
try { db.getSiblingDB('$DB_NAME').dropUser('gui_ro'); } catch (e) { /* first run: nothing to drop */ }
db.getSiblingDB('$DB_NAME').createUser({
  user: 'gui_ro', pwd: '$GUI_RO_PW',
  roles: [{ role: 'read', db: '$DB_NAME' }]
});
print('gui_ro ready (read-only on $DB_NAME)');"
unset MONGO_ADMIN_URI

# (Re)start under PM2 with the dashboard env. Export-then-start lets PM2
# capture the env into its dump (persisted by `pm2 save`, local to the VPS).
export ME_CONFIG_MONGODB_URL="mongodb://gui_ro:${GUI_RO_PW}@127.0.0.1:27017/${DB_NAME}?authSource=${DB_NAME}&directConnection=true"
export ME_CONFIG_BASICAUTH_USERNAME="$DASH_USER"
export ME_CONFIG_BASICAUTH_PASSWORD="$DASH_PW"
export ME_CONFIG_SITE_PORT="$ME_PORT"
export ME_CONFIG_SITE_SESSIONSECRET="$SITE_SECRET"
export ME_CONFIG_MONGODB_ENABLE_ADMIN=false
# NOTE: ME_CONFIG_SITE_PORT is honored by mongo-express 1.x (default 8081).
# If you override ME_PORT and the 401 check below hits the wrong port, leave
# ME_PORT=8081 and point Nginx at 8081 instead.
# NOTE: intermediates stay in this shell until the final `unset` at the end —
# the GENERATED block below still needs DASH_PW/GUI_RO_PW for the one-time print.

if pm2 describe "$PM2_APP" >/dev/null 2>&1; then
  log "Restarting existing PM2 app $PM2_APP"
  pm2 restart "$PM2_APP" --update-env
else
  log "Starting PM2 app $PM2_APP ($ME_BIN on 127.0.0.1:$ME_PORT)"
  pm2 start "$ME_BIN" --name "$PM2_APP"
fi
pm2 save || true
pm2 show "$PM2_APP" | grep -qi 'status.*online'

# Prove Basic Auth is enforced: unauthenticated request must be 401.
sleep 3
HTTP_CODE="$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:${ME_PORT}/" || true)"
if [ "$HTTP_CODE" = "401" ]; then
  log "Auth wall OK: localhost:$ME_PORT returns 401 without credentials"
else
  log "ERROR: expected HTTP 401 on / without credentials, got $HTTP_CODE"
  exit 1
fi

log "mongo-express live (localhost-only). Next: DNS + Nginx + TLS + UFW (command sheet)."
# One-time print of GENERATED values only (stderr, never to disk). Supplied
# values are never echoed. Reset by re-running with env overrides.
if [ "$GENERATED_DASH" = "1" ] || [ "$GENERATED_RO" = "1" ]; then
  printf '\n===== SAVE THESE NOW (shown once, never stored) =====\n' >&2
  printf 'dashboard : https://db.etherstarjewels.cloud\n' >&2
  printf 'dash user : %s\n' "$DASH_USER" >&2
  if [ "$GENERATED_DASH" = "1" ]; then
    printf 'dash pw   : %s   (generated)\n' "$DASH_PW" >&2
  else
    printf 'dash pw   : (your supplied value)\n' >&2
  fi
  if [ "$GENERATED_RO" = "1" ]; then
    printf 'gui_ro pw : %s   (generated, mongosh/diagnostics only)\n' "$GUI_RO_PW" >&2
  else
    printf 'gui_ro pw : (your supplied value)\n' >&2
  fi
  printf '======================================================\n\n' >&2
else
  log "Using your supplied credentials (nothing to display)."
fi
unset GUI_RO_PW DASH_PW SITE_SECRET ADMIN_PW_INPUT 2>/dev/null || true
