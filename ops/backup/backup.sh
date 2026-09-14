#!/usr/bin/env bash
# Nightly backup: MongoDB (gzipped archive) + product uploads (tarball).
# Runs ON the VPS as site user `etherstar` via cron (see install note below).
# Nothing secret in this file — the DB credential lives in
# /home/etherstar/ops/.mongo-backup-env (mode 600, created once, never committed):
#   MONGO_BACKUP_URI='mongodb://etherapp:<APP_PW_URLENCODED>@127.0.0.1:27017/etherstar-jewels?authSource=etherstar-jewels&directConnection=true'
#
# Install (VPS, as etherstar):
#   mkdir -p /home/etherstar/ops /home/etherstar/backups
#   printf '%s\n' "MONGO_BACKUP_URI='...'" > /home/etherstar/ops/.mongo-backup-env
#   chmod 600 /home/etherstar/ops/.mongo-backup-env
#   (crontab -l 2>/dev/null; echo '0 3 * * * /home/etherstar/ops/backup.sh >> /home/etherstar/ops/backup.log 2>&1') | crontab -
#
# Retention: 7 daily copies of each. Restore drill:
#   mongorestore --uri="$MONGO_BACKUP_URI" --gzip --archive=/home/etherstar/backups/mongo-YYYY-MM-DD.gz
#   tar -xzf /home/etherstar/backups/uploads-YYYY-MM-DD.tar.gz -C /
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/home/etherstar/backups}"
UPLOADS_DIR="${UPLOADS_DIR:-/var/www/etherstar/uploads}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"
ENV_FILE="${ENV_FILE:-/home/etherstar/ops/.mongo-backup-env}"

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
tar -czf "$UPLOADS_OUT" -C / var/www/etherstar/uploads
chmod 600 "$UPLOADS_OUT"

log "Pruning backups older than $RETENTION_DAYS days"
find "$BACKUP_DIR" -maxdepth 1 -name 'mongo-*.gz' -mtime +"$RETENTION_DAYS" -delete
find "$BACKUP_DIR" -maxdepth 1 -name 'uploads-*.tar.gz' -mtime +"$RETENTION_DAYS" -delete

log "Backup OK: $(du -h "$MONGO_OUT" | cut -f1) mongo + $(du -h "$UPLOADS_OUT" | cut -f1) uploads"
