#!/bin/sh
set -eu
umask 077
cd "$(dirname "$0")/.."
backup_dir=${1:-.backups/$(date +%Y%m%d-%H%M%S)}
mkdir -p "$backup_dir"
# Database snapshot comes first. Published and staged files are append-only;
# including later orphan files is safe, deleting/GC files requires a snapshot lock.
docker compose exec -T db pg_dump -U learnbuddy -d learnbuddy --format=custom > "$backup_dir/database.dump.partial"
docker compose exec -T api tar -C /app/media -czf - . > "$backup_dir/media.tar.gz.partial"
docker compose exec -T api tar -C /app/deletions -czf - . > "$backup_dir/deletions.tar.gz.partial"
mv "$backup_dir/deletions.tar.gz.partial" "$backup_dir/deletions.tar.gz"
mv "$backup_dir/database.dump.partial" "$backup_dir/database.dump"
mv "$backup_dir/media.tar.gz.partial" "$backup_dir/media.tar.gz"
printf '%s\n' 'Backup complete:' "$backup_dir"
