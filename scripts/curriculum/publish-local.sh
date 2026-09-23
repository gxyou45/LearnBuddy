#!/bin/sh
set -eu
cd "$(dirname "$0")/../.."
if [ "$#" -ne 1 ]; then
  printf '%s\n' 'Usage: sh scripts/curriculum/publish-local.sh VERIFIED_ADMIN_EMAIL' >&2
  exit 1
fi
node --import tsx scripts/curriculum/verify.ts
docker compose up -d --no-deps api web
docker compose exec -T api mkdir -p /app/curriculum-release
docker compose cp curriculum-release/base.json api:/app/curriculum-release/base.json
docker compose cp curriculum-release/manifest.json api:/app/curriculum-release/manifest.json
docker compose cp curriculum-release/files api:/app/curriculum-release/files
docker compose exec -T api node dist/publish-curriculum.js /app/curriculum-release "$1"
