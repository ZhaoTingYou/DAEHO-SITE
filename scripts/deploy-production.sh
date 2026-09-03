#!/usr/bin/env bash
set -euo pipefail

repository_dir=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
compose_project=${COMPOSE_PROJECT_NAME:-daeho-prod}
backup_root=${DEPLOY_BACKUP_ROOT:-/home/ubuntu/backups}
wait_timeout=${DEPLOY_WAIT_TIMEOUT_SECONDS:-300}
timestamp=${DEPLOY_TIMESTAMP:-$(date -u +%Y%m%dT%H%M%SZ)}
if [[ ! "$timestamp" =~ ^[0-9]{8}T[0-9]{6}Z$ ]]; then
  printf 'Invalid DEPLOY_TIMESTAMP.\n' >&2
  exit 2
fi
backup_path="$backup_root/daeho-pre-deploy-$timestamp.sql.gz"
lock_dir="$backup_root/.daeho-deploy.lock"
partial_backup=""

cd "$repository_dir"
umask 077
mkdir -p "$backup_root"
if ! mkdir "$lock_dir" 2>/dev/null; then
  printf 'Another DAEHO production deployment is already running.\n' >&2
  exit 1
fi
cleanup() {
  if [[ -n "$partial_backup" ]]; then rm -f "$partial_backup"; fi
  rmdir "$lock_dir"
}
trap cleanup EXIT
partial_backup=$(mktemp "$backup_root/.daeho-pre-deploy-$timestamp.XXXXXX.sql.gz.part")

docker compose -p "$compose_project" exec -T postgres sh -lc \
  'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB"' | gzip -c > "$partial_backup"
gzip -t "$partial_backup"
test -s "$partial_backup"
ln "$partial_backup" "$backup_path"
rm "$partial_backup"
partial_backup=""
chmod 600 "$backup_path"

docker compose -p "$compose_project" up -d --build --wait --wait-timeout "$wait_timeout" cms-api customer-api next nginx
docker compose -p "$compose_project" exec -T nginx nginx -t
docker compose -p "$compose_project" exec -T nginx nginx -s reload

site_status=""
http_status=""
for _attempt in $(seq 1 30); do
  site_status=$(curl --silent --show-error --output /dev/null --write-out '%{http_code}' \
    --noproxy '*' --max-time 5 --resolve daeho.works:443:127.0.0.1 \
    https://daeho.works/ko || true)
  http_status=$(curl --silent --show-error --output /dev/null --write-out '%{http_code}' \
    --noproxy '*' --max-time 5 --resolve daeho.works:443:127.0.0.1 \
    --header 'Origin: https://daeho.works' https://daeho.works/api/live-chat/session || true)
  if [[ "$site_status" = "200" && "$http_status" = "200" ]]; then
    break
  fi
  sleep 2
done

test "$site_status" = "200"
test "$http_status" = "200"
docker compose -p "$compose_project" ps
printf 'Verified production backup: %s\n' "$backup_path"
