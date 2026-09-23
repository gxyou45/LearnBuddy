#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
backup_dir=${1:?Usage: sh scripts/verify-restore.sh BACKUP_DIR}
[ -s "$backup_dir/database.dump" ]
[ -s "$backup_dir/media.tar.gz" ]
restore_db="learnbuddy_restore_$(date +%s)_$$"
cleanup() {
 docker compose exec -T db dropdb -U learnbuddy --if-exists "$restore_db"
 docker compose exec -T api rm -rf "/tmp/$restore_db"
}
trap cleanup 0
trap 'exit 1' HUP INT TERM
docker compose exec -T db createdb -U learnbuddy "$restore_db"
docker compose exec -T db pg_restore -U learnbuddy -d "$restore_db" --exit-on-error < "$backup_dir/database.dump"
docker compose exec -T api mkdir -p "/tmp/$restore_db"
docker compose exec -T api tar -C "/tmp/$restore_db" -xzf - < "$backup_dir/media.tar.gz"
# Old snapshots must first gain the current schema; never start a serving API here.
docker compose exec -T api mkdir -p "/tmp/$restore_db/deletions"
if [ -s "$backup_dir/deletions.tar.gz" ]; then
 docker compose exec -T api tar -C "/tmp/$restore_db/deletions" -xzf - < "$backup_dir/deletions.tar.gz"
fi
docker compose exec -T -e RESTORE_DB="$restore_db" -e RESTORE_MEDIA="/tmp/$restore_db" api node --input-type=module <<'JS'
import assert from 'node:assert/strict';
import {isCompatibleExpansion,validateManifest} from '@learnbuddy/contracts';
import {execFileSync} from 'node:child_process';
import {replayDeletions} from './dist/data-management.js';
import {deletionIntents} from './dist/deletion-ledger.js';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { database } from './dist/db.js';
const url=new URL(process.env.DATABASE_URL); url.pathname='/'+process.env.RESTORE_DB; process.env.DATABASE_URL=url.href;
execFileSync('npm',['run','db:migrate'],{env:process.env,stdio:'inherit'});
const db=database();
try {
 const archived=await replayDeletions(db,process.env.RESTORE_MEDIA+'/deletions');
 const latest=await replayDeletions(db); // Mandatory latest external ledger, beyond the snapshot.
 const revoked=await db.authSession.deleteMany(); // Never resurrect sessions revoked after the backup.
 for(const intent of [...await deletionIntents(process.env.RESTORE_MEDIA+'/deletions'),...await deletionIntents()]) {
  if(intent.scope==='account')assert.equal(await db.familyAccount.count({where:{id:intent.accountId}}),0);
  else assert.equal(await db.learner.count({where:{id:{in:intent.learnerIds},accountId:intent.accountId}}),0);
 }
 console.log(`Deletion replay: ${archived} archived + ${latest} latest intents; ${revoked.count} restored sessions revoked.`);
 const releases=await db.contentRelease.findMany(); assert.ok(releases.length);
 for(const release of releases) {
  const m=release.manifest; assert.equal(await db.lessonVersion.count({where:{releaseId:release.id}}),m.lessons.length);
  assert.equal(await db.assetVersion.count({where:{releaseId:release.id}}),m.assets.length);
  for(const a of m.assets) {
   const data=await readFile(process.env.RESTORE_MEDIA+'/'+a.objectKey);
   assert.equal(createHash('sha256').update(data).digest('hex'),a.sha256);
  }
 }
 const channel=await db.contentChannel.findUniqueOrThrow({where:{id:'default'}});
 assert.ok(releases.some(r=>r.id===channel.releaseId));
 for(const upload of await db.contentUpload.findMany()) {
  const data=await readFile(process.env.RESTORE_MEDIA+'/.drafts/'+upload.objectKey);
  assert.equal(createHash('sha256').update(data).digest('hex'),upload.sha256);
 }
 const draftCount=await db.contentDraft.count();
 console.log(`Restored drafts: ${draftCount}; active release: ${channel.releaseId}.`);
 const learningSessions=await db.learningSession.findMany({where:{requestId:{not:null}},include:{learner:true,lesson:true}});
 for(const session of learningSessions) {
  if(session.learner.learningReleaseId!==session.lesson.releaseId){
   const current=releases.find(r=>r.id===session.learner.learningReleaseId);
   const original=releases.find(r=>r.id===session.lesson.releaseId);
   assert.ok(current&&original&&isCompatibleExpansion(validateManifest(current.manifest),validateManifest(original.manifest)),'Session may differ only by a strictly additive curriculum upgrade');
  }
  assert.ok(session.currentStep>=0&&session.currentStep<session.lesson.content.steps.length);
 }
 const attempts=await db.attempt.findMany({where:{targetId:{not:null}},include:{event:true,presentation:{include:{session:true,question:true}}}});
 for(const a of attempts) {
  assert.equal(a.sessionId,a.presentation.sessionId);assert.equal(a.event.learnerId,a.presentation.session.learnerId);
  assert.equal(a.correct,!a.skipped&&a.presentation.question.answer.includes(a.answer.selectedId));
 }
 const mistakes=await db.mistakeItem.findMany({include:{latestWrongAttempt:true}});
 for(const mistake of mistakes) {assert.equal(mistake.latestWrongAttempt.correct,false);assert.equal(mistake.latestWrongAttempt.skipped,false);}
 console.log(`Restored online sessions: ${learningSessions.length}; attempts: ${attempts.length}; mistake items: ${mistakes.length}.`);
 const streams=await db.syncStream.findMany({include:{session:true,entries:{orderBy:{seq:'asc'}}}});
 for(const stream of streams){
  assert.equal(stream.learnerId,stream.session.learnerId);
  for(let seq=1;seq<stream.nextSeq;seq++)assert.equal(stream.entries.find(e=>e.seq===seq)?.status,'applied');
  for(const entry of stream.entries)assert.equal(entry.payload.command.sessionId,stream.sessionId);
 }
 const imports=await db.legacyImport.findMany();for(const item of imports){assert.equal(item.source,'legacy_import');assert.equal(item.fingerprint.length,64);assert.equal(item.raw.schemaVersion,1);}
 for(const snapshot of await db.progressSnapshot.findMany()){assert.equal(snapshot.state.learnerId,snapshot.learnerId);assert.equal(snapshot.state.revision,snapshot.revision);}
 console.log(`Restored sync streams: ${streams.length}; legacy imports: ${imports.length}; incremental snapshots: ${await db.progressSnapshot.count()}.`);
 const accountCount=await db.familyAccount.count();
 const learnerCount=await db.learner.count();
 console.log(`Restored family accounts: ${accountCount}; learner profiles: ${learnerCount}.`);
 console.log('Restore verified in isolated database and media directory; live data unchanged.');
}finally{await db.$disconnect();}
JS
