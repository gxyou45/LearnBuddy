#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
review_test_db="learnbuddy_review_browser_$(date +%s)_$$"
review_test_container="learnbuddy-review-browser-$$"
cleanup() {
 docker stop "$review_test_container" >/dev/null 2>&1 || true
 docker compose exec -T db dropdb -U learnbuddy --if-exists "$review_test_db"
}
trap cleanup 0
trap 'exit 1' HUP INT TERM
docker compose exec -T db createdb -U learnbuddy "$review_test_db"
docker compose run -T --rm --no-deps -v "$PWD/apps/api/dist:/app/apps/api/dist:ro" -v "$PWD/apps/api/prisma:/app/apps/api/prisma:ro" -v "$PWD/packages/contracts/dist:/app/packages/contracts/dist:ro" -e TEST_DB="$review_test_db" init node --input-type=module <<'JS'
import {execFileSync} from 'node:child_process';
const url=new URL(process.env.DATABASE_URL);url.pathname='/'+process.env.TEST_DB;
const env={...process.env,DATABASE_URL:url.href,MEDIA_DIR:'/tmp/review-test-media',DELETION_LOG_DIR:'/tmp/review-test-deletions'};
for(const args of [['run','db:migrate'],['run','db:seed']])execFileSync('npm',args,{env,stdio:'inherit'});
JS
docker compose run -d --rm --no-deps --name "$review_test_container" -p 127.0.0.1:8081:3000 -v "$PWD/apps/api/dist:/app/apps/api/dist:ro" -v "$PWD/packages/contracts/dist:/app/packages/contracts/dist:ro" -e TEST_DB="$review_test_db" -e AUTH_ORIGINS=http://127.0.0.1:8081 -e AUTH_SECRET_FILE=/tmp/review-test-secret -e DELETION_LOG_DIR=/tmp/review-test-deletions api node --input-type=module -e 'const url=new URL(process.env.DATABASE_URL);url.pathname="/"+process.env.TEST_DB;process.env.DATABASE_URL=url.href;await import("./dist/main.js");'
review_wait=0
until curl -fsS http://127.0.0.1:8081/api/health >/dev/null; do
 review_wait=$((review_wait+1))
 if [ "$review_wait" -ge 30 ]; then docker logs "$review_test_container"; exit 1; fi
 sleep 1
done
TEST_BUILT_WEB=true TEST_LOCAL_NETWORK=true PLAYWRIGHT_BASE_URL=http://127.0.0.1:8081 npx playwright test '/review-resume-cloud.spec.ts$' '/warmup-cloud.spec.ts$' --workers=1 --output=/private/tmp/learnbuddy-round-isolated-browser-results
