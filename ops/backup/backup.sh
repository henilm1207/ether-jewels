#!/usr/bin/env bash
# Nightly backup: MongoDB (gzipped archive) + product uploads (tarball).
# Runs ON the VPS as site user `etherstar` via cron (see install note below).
# Nothing secret in this file — the DB credential lives in
# /var/backups/etherstar-jewels/.mongo-backup-env (mode 600, created once, never committed):
#   MONGO_BACKUP_URI='mongodb://etherapp:<ROOT_PW_URLENCODED>@127.0.0.1:27017/etherstar-jewels?authSource=admin'
# Docker edition: MongoDB now runs in the `mongo` container from
# docker-compose.prod.yml, root creds in the app dir's `.env`
# (MONGO_ROOT_USER/MONGO_ROOT_PASSWORD) — still reachable at
# 127.0.0.1:27017 (loopback-only port published by that service), so
# mongodump below is unchanged.
#
# BACKUP_DIR and ENV_FILE live under /var/backups, NOT /home/etherstar,
# deliberately: on 2026-09-16 the CloudPanel site (and its whole home
# directory, backups included) got deleted while the app kept running in
# Docker underneath — the site came back, but everything under
# /home/etherstar, including anything this script had written there, did
# not. Keeping the backups outside the site's home directory means a
# repeat of that incident can't take the backups down with it.
#
# Install (VPS, as root once, then etherstar):
#   mkdir -p /var/backups/etherstar-jewels && chown etherstar:etherstar /var/backups/etherstar-jewels && chmod 700 /var/backups/etherstar-jewels
#   printf '%s\n' "MONGO_BACKUP_URI='...'" > /var/backups/etherstar-jewels/.mongo-backup-env
#   chmod 600 /var/backups/etherstar-jewels/.mongo-backup-env
#   (crontab -l 2>/dev/null; echo '0 3 * * * /home/etherstar/htdocs/etherstarjewels.cloud/ops/backup/backup.sh >> /var/backups/etherstar-jewels/backup.log 2>&1') | crontab -
#
# Retention: 7 daily copies of each. Restore drill:
#   mongorestore --uri="$MONGO_BACKUP_URI" --gzip --archive=/var/backups/etherstar-jewels/mongo-YYYY-MM-DD.gz
#   tar -xzf /var/backups/etherstar-jewels/uploads-YYYY-MM-DD.tar.gz -C "$(dirname "$UPLOADS_DIR")"
#   # (the tarball's top-level entry is the uploads/ dir itself, relative to UPLOADS_DIR's parent)
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/var/backups/etherstar-jewels}"
# Must match server/.env's UPLOADS_DIR on this box — cron runs without
# server/.env sourced, so this default has to be kept in sync by hand.
UPLOADS_DIR="${UPLOADS_DIR:-/home/etherstar/htdocs/etherstarjewels.cloud/server/public/uploads}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"
ENV_FILE="${ENV_FILE:-/var/backups/etherstar-jewels/.mongo-backup-env}"

log() { printf '[%s] %s\n' "$(date -u '+%Y-%m-%dT%H:%M:%SZ')" "$*"; }

mkdir -p "$BACKUP_DIR"
if [ ! -f "$ENV_FILE" ]; then
  log "ERROR: credential file $ENV_FILE missing. Aborting."
  exit 1
fi
# shellcheck disable=SC1090
. "$ENV_FILE"
if [ -z "${MONGO_BACKUP_URI:-}" ]; then
  log "ERROR: MONGO_BACKUP_URI empty in $ENV_FILE. Aborting."
  exit 1
fi

DAY="$(date -u '+%F')"
MONGO_OUT="$BACKUP_DIR/mongo-$DAY.gz"
UPLOADS_OUT="$BACKUP_DIR/uploads-$DAY.tar.gz"

log "Dumping MongoDB -> $MONGO_OUT"
mongodump --uri="$MONGO_BACKUP_URI" --gzip --archive="$MONGO_OUT"
chmod 600 "$MONGO_OUT"

log "Archiving $UPLOADS_DIR -> $UPLOADS_OUT"
tar -czf "$UPLOADS_OUT" -C "$(dirname "$UPLOADS_DIR")" "$(basename "$UPLOADS_DIR")"
chmod 600 "$UPLOADS_OUT"

log "Pruning backups older than $RETENTION_DAYS days"
find "$BACKUP_DIR" -maxdepth 1 -name 'mongo-*.gz' -mtime +"$RETENTION_DAYS" -delete
find "$BACKUP_DIR" -maxdepth 1 -name 'uploads-*.tar.gz' -mtime +"$RETENTION_DAYS" -delete

log "Backup OK: $(du -h "$MONGO_OUT" | cut -f1) mongo + $(du -h "$UPLOADS_OUT" | cut -f1) uploads"
