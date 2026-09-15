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
for cmd in npm pm2 mongosh openssl curl git; do
  if ! command -v "$cmd" >/dev/null 2>&1; then
    log "ERROR: required command '$cmd' not found. Aborting."
    exit 1
  fi
done

# Credentials: explicit env wins, otherwise generate once. Hex passwords are
# used deliberately — base64 can contain / + = which break MongoDB connection
# URIs (MongoParseError) and confuse shells. Record beforehand whether the
# caller supplied values, so the end-of-run message is accurate.
HAD_GUI_RO_PW="$([ -n "${GUI_RO_PW:-}" ] && echo 1 || echo 0)"
HAD_DASH_PW="$([ -n "${DASH_PW:-}" ] && echo 1 || echo 0)"
GUI_RO_PW="${GUI_RO_PW:-$(openssl rand -hex 18)}"
DASH_USER="${DASH_USER:-dbadmin}"
DASH_PW="${DASH_PW:-$(openssl rand -hex 18)}"
SITE_SECRET="${SITE_SECRET:-$(openssl rand -hex 32)}"
if [ -z "${GUI_RO_PW:-}" ] || [ -z "${DASH_PW:-}" ] || [ -z "${SITE_SECRET:-}" ]; then
  log "ERROR: credential generation failed (openssl missing?). Aborting."
  exit 1
fi
GENERATED_DASH=0
GENERATED_RO=0
if [ "$HAD_GUI_RO_PW" = "0" ]; then GENERATED_RO=1; fi
if [ "$HAD_DASH_PW" = "0" ]; then GENERATED_DASH=1; fi

# Pinned version rationale (verified 2026-09-14 on this exact VPS):
# - `mongo-express@1` (= 1.0.2) and every newer 1.x contain a `patch:`-protocol
#   subdep that crashes npm's resolver SILENTLY (exit 1, empty log), and defeat
#   pnpm (blockExoticSubdeps) and yarn-global (package-relative patch path).
# - 1.1.0-rc-4 has registry-only deps, installs cleanly, and bundles mongodb
#   driver ^6.19 (fully supports MongoDB 8.0) with prebuilt frontend assets.
ME_VERSION="${ME_VERSION:-1.1.0-rc-4}"
# Local (not global) install: the absolute entry path survives nvm Node
# upgrades, unlike ~/.nvm/.../bin symlinks.
ME_HOME="${ME_HOME:-$HOME/mongo-express}"

log "Installing mongo-express@$ME_VERSION into $ME_HOME"
mkdir -p "$ME_HOME"
(cd "$ME_HOME" && npm init -y >/dev/null 2>&1)
(cd "$ME_HOME" && npm i --no-audit --no-fund --omit=dev "mongo-express@$ME_VERSION")
ME_ENTRY="$ME_HOME/node_modules/mongo-express/app.js"
if [ ! -f "$ME_ENTRY" ]; then
  log "ERROR: entry not found at $ME_ENTRY"
  exit 1
fi
log "mongo-express entry at $ME_ENTRY ($(node -p "require('$ME_HOME/node_modules/mongo-express/package.json').version"))"

# Frontend assets: the published tarball omits the webpack build output
# (build-assets.json + build/), without which all /public/* return 404 and the
# UI renders unstyled. Build once from a shallow source clone and transplant.
# NOTE: lib/router.js serves /public from <pkg>/build (not <pkg>/public):
#   appRouter.use('/public', express.static(... '../build'))
# so the transplant destination MUST be $ME_PKG/build.
ME_PKG="$ME_HOME/node_modules/mongo-express"
if [ ! -f "$ME_PKG/build-assets.json" ] || ! ls "$ME_PKG"/build/vendor-*.min.js >/dev/null 2>&1; then
  log "Building mongo-express frontend assets (one-time, a few minutes)"
  rm -rf "$ME_HOME/src-build"
  git clone --depth 1 https://github.com/mongo-express/mongo-express.git "$ME_HOME/src-build"
  (cd "$ME_HOME/src-build" && npm i --no-audit --no-fund --legacy-peer-deps --ignore-scripts)
  # Work around broken ajv hoisting (ajv-keywords needs the ajv v8 API, npm
  # hoists v6 where it resolves first): nest a fresh ajv@8 underneath it.
  mkdir -p "$ME_HOME/src-build/node_modules/ajv-keywords/node_modules" /tmp/ajvpack
  (cd /tmp/ajvpack && rm -f ajv-*.tgz && npm pack ajv@8 >/dev/null 2>&1 && tar -xzf ajv-8.*.tgz && rm -rf "$ME_HOME/src-build/node_modules/ajv-keywords/node_modules/ajv" && mv package "$ME_HOME/src-build/node_modules/ajv-keywords/node_modules/ajv")
  (cd "$ME_HOME/src-build" && ./node_modules/.bin/cross-env NODE_ENV=production ./node_modules/.bin/webpack)
  cp "$ME_HOME/src-build/build-assets.json" "$ME_PKG/"
  mkdir -p "$ME_PKG/build"
  cp -a "$ME_HOME/src-build/build/." "$ME_PKG/build/"
  log "Frontend assets transplanted to $ME_PKG/build"
fi

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
export ME_CONFIG_BASICAUTH_ENABLED=true
export ME_CONFIG_BASICAUTH_USERNAME="$DASH_USER"
export ME_CONFIG_BASICAUTH_PASSWORD="$DASH_PW"
# rc-4 ignores ME_CONFIG_SITE_PORT — port comes from PORT, host from
# VCAP_APP_HOST (bare 'localhost' binds IPv6 ::1 only, unreachable via
# 127.0.0.1, so pin IPv4 loopback explicitly).
export PORT="$ME_PORT"
export VCAP_APP_HOST=127.0.0.1
export ME_CONFIG_SITE_SESSIONSECRET="$SITE_SECRET"
export ME_CONFIG_MONGODB_ENABLE_ADMIN=false
# NOTE: intermediates stay in this shell until the final `unset` at the end —
# the GENERATED block below still needs DASH_PW/GUI_RO_PW for the one-time print.

if pm2 describe "$PM2_APP" >/dev/null 2>&1; then
  log "Restarting existing PM2 app $PM2_APP"
  pm2 restart "$PM2_APP" --update-env
else
  log "Starting PM2 app $PM2_APP ($ME_ENTRY on 127.0.0.1:$ME_PORT)"
  pm2 start "$ME_ENTRY" --name "$PM2_APP"
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
