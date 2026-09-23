#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
test_db="learnbuddy_test_$(date +%s)_$$"
cleanup() { docker compose exec -T db dropdb -U learnbuddy --if-exists "$test_db"; }
trap cleanup 0
trap 'exit 1' HUP INT TERM
docker compose exec -T db createdb -U learnbuddy "$test_db"
docker compose run -T --rm --no-deps -v "$PWD/apps/api/package.json:/app/apps/api/package.json:ro" -v "$PWD/apps/api/test:/app/apps/api/test:ro" -v "$PWD/apps/api/prisma:/app/apps/api/prisma:ro" -v "$PWD/apps/api/dist:/app/apps/api/dist:ro" -v "$PWD/packages/contracts/dist:/app/packages/contracts/dist:ro" -e TEST_DB="$test_db" init node --input-type=module <<'JS'
import {execFileSync} from 'node:child_process';
const url=new URL(process.env.DATABASE_URL);url.pathname='/'+process.env.TEST_DB;
const env={...process.env,DATABASE_URL:url.href,MEDIA_DIR:'/tmp/learnbuddy-test-media',DELETION_LOG_DIR:'/tmp/learnbuddy-test-deletions'};
for(const args of [['run','db:migrate'],['run','db:seed'],['run','test:integration']]) execFileSync('npm',args,{env,stdio:'inherit'});
JS
