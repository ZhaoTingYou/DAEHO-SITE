#!/bin/sh
set -eu

interval="${BACKUP_INTERVAL_SECONDS:-86400}"

while true; do
  timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
  target="/backups/${timestamp}"
  mkdir -p "$target"

  pg_dump \
    --host=postgres \
    --username="${POSTGRES_USER}" \
    --dbname="${POSTGRES_DB}" \
    --format=custom \
    --file="${target}/daeho_cms.dump"

  tar -czf "${target}/uploads.tar.gz" -C /data uploads
  echo "Backup written to ${target}"

  sleep "$interval"
done
