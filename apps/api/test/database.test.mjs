import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFile, mkdtemp, writeFile, symlink, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { database } from '../dist/db.js';
const db=database();
test('database foundation',async t=>{
 try {
 const release=await db.contentRelease.findUniqueOrThrow({where:{id:'prototype-v4'}});
 await t.test('complete normalized import and stored asset checksums',async()=>{
  assert.equal(await db.lessonVersion.count(),10); assert.equal(await db.characterVersion.count(),30);
  assert.equal(await db.wordVersion.count(),30); assert.equal(await db.storyVersion.count(),10);
  assert.equal(await db.lessonStep.count(),150); assert.equal(await db.questionVersion.count(),70);
  assert.equal(await db.assetVersion.count(),100); assert.equal(await db.huntSceneVersion.count(),3);
  const {createHash}=await import('node:crypto');
  for(const a of await db.assetVersion.findMany()) assert.equal(createHash('sha256').update(await readFile(join(process.env.MEDIA_DIR,a.objectKey))).digest('hex'),a.sha256);
 });
 await t.test('Hono health, inventory and error responses',async()=>{
  const {createApp}=await import('../dist/app.js');
  const app=createApp(db);
  const health=await app.request('/api/health'); assert.equal(health.status,200); assert.equal((await health.json()).status,'ok');
  const response=await app.request('/api/v1/content/inventory'); assert.equal(response.status,200);
  assert.equal((await response.json()).counts.lessons,10);
  assert.equal((await app.request('/api/unknown')).status,404);
  const failed=createApp({$queryRaw:async()=>{throw new Error('unavailable');}});
  assert.equal((await failed.request('/api/health')).status,503);
 });
 await t.test('catalog and lesson API are versioned, complete, and conditional',async()=>{
  const {createApp}=await import('../dist/app.js');const app=createApp(db);
  const response=await app.request('/api/v1/catalog');assert.equal(response.status,200);
  const catalog=await response.json();assert.equal(catalog.lessons.length,10);assert.equal(catalog.lessons[0].story,undefined);
  const cached=await app.request('/api/v1/catalog',{headers:{'If-None-Match':response.headers.get('etag')}});assert.equal(cached.status,304);
  for(const summary of catalog.lessons){const r=await app.request(`/api/v1/releases/${catalog.releaseId}/lessons/${summary.id}`);assert.equal(r.status,200);const data=await r.json();assert.equal(data.lesson.steps.length,15);assert.ok(data.assets.length<100);assert.ok(data.assets.some(a=>a.id===`audio-${data.lesson.story.audio}`));assert.equal(data.releaseId,catalog.releaseId);}
  assert.equal((await app.request('/api/v1/catalog?releaseId=missing')).status,404);
  assert.equal((await app.request('/api/v1/releases/prototype-v4/lessons/missing')).status,404);
  assert.equal((await app.request('/api/v1/catalog?releaseId=../x')).status,400);
 });
 await t.test('seed is idempotent and does not overwrite editorial data',async()=>{
  const id='prototype-v4:family', original=await db.lessonVersion.findUniqueOrThrow({where:{id}});
  try {
   await db.lessonVersion.update({where:{id},data:{title:'integration-test-title'}});
   const {createApp}=await import('../dist/app.js');const app=createApp(db);
   assert.equal((await (await app.request('/api/v1/catalog')).json()).lessons[0].title,'integration-test-title');
   assert.equal((await (await app.request('/api/v1/releases/prototype-v4/lessons/family')).json()).lesson.title,'integration-test-title');
   for(let i=0;i<2;i++) execFileSync(process.execPath,['dist/import-content.js'],{stdio:'pipe'});
   assert.equal((await db.lessonVersion.findUniqueOrThrow({where:{id}})).title,'integration-test-title');
   assert.equal(await db.contentRelease.count(),1); assert.equal(await db.lessonVersion.count(),10);
  } finally {await db.lessonVersion.update({where:{id},data:{title:original.title}});}
 });
 await t.test('changed release refuses to overwrite database',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'learnbuddy-import-'));
  try {
   const manifest=structuredClone(release.manifest); manifest.lessons[0].title='changed source';
   await writeFile(join(dir,'manifest.json'),JSON.stringify(manifest));
   await symlink(join(process.env.CONTENT_DIR,'files'),join(dir,'files'));
   assert.throws(()=>execFileSync(process.execPath,['dist/import-content.js'],{env:{...process.env,CONTENT_DIR:dir},stdio:'pipe'}));
   assert.equal((await db.contentRelease.findUniqueOrThrow({where:{id:release.id}})).checksum,release.checksum);
  } finally {await rm(dir,{recursive:true,force:true});}
 });
 await t.test('ownership and replay constraints reject mismatched learning events',async()=>{
  const rollback=new Error('rollback test fixtures');
  try {await db.$transaction(async tx=>{
   const a=await tx.familyAccount.create({data:{email:"a@ownership.test"}}), b=await tx.familyAccount.create({data:{email:"b@ownership.test"}});
   const l1=await tx.learner.create({data:{accountId:a.id,nickname:'test-a'}}),l2=await tx.learner.create({data:{accountId:b.id,nickname:'test-b'}});
   const session=await tx.learningSession.create({data:{learnerId:l1.id,lessonVersionId:'prototype-v4:family'}});
   const event={learnerId:l1.id,sessionId:session.id,clientEventId:randomUUID(),type:'answer',payload:{},occurredAt:new Date()};
   await tx.learningEvent.create({data:event});
   await tx.$executeRawUnsafe('SAVEPOINT duplicate_event');
   await assert.rejects(tx.learningEvent.create({data:event}));
   await tx.$executeRawUnsafe('ROLLBACK TO SAVEPOINT duplicate_event');
   await tx.$executeRawUnsafe('SAVEPOINT foreign_learner');
   await assert.rejects(tx.learningEvent.create({data:{...event,learnerId:l2.id,clientEventId:randomUUID()}}));
   await tx.$executeRawUnsafe('ROLLBACK TO SAVEPOINT foreign_learner');
   throw rollback;
  });}catch(e){if(e!==rollback)throw e;}
  assert.equal(await db.familyAccount.count({where:{email:{endsWith:"@ownership.test"}}}),0);
 });
 }finally{await db.$disconnect();}
});
