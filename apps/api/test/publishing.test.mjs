import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes,randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {database} from '../dist/db.js';
import {createAuth} from '../dist/auth.js';
import {createApp} from '../dist/app.js';
import {huntTemplates} from '@learnbuddy/contracts';
const db=database(),origin='http://localhost:8080';
const auth=createAuth(db,{local:true,origins:[origin],secret:randomBytes(48).toString('base64url')},async()=>{});
const app=createApp(db,auth,[origin]);
async function account(email,role){
 await app.request(origin+'/api/auth/sign-up/email',{method:'POST',headers:{Host:'localhost:8080',Origin:origin,'Content-Type':'application/json','x-real-ip':'10.11.12.13'},body:JSON.stringify({name:'test',email,password:'safe-test-password-123'})});
 await db.familyAccount.update({where:{email},data:{emailVerified:true,role}});
 const r=await app.request(origin+'/api/auth/sign-in/email',{method:'POST',headers:{Host:'localhost:8080',Origin:origin,'Content-Type':'application/json','x-real-ip':'10.11.12.13'},body:JSON.stringify({email,password:'safe-test-password-123'})});
 assert.equal(r.status,200,await r.clone().text());return r.headers.getSetCookie().map(c=>c.split(';')[0]).join('; ');
}
function request(path,{cookie='',body,method=body?'POST':'GET',from=origin,raw}={}){return app.request(origin+path,{method,headers:{Host:'localhost:8080',Origin:from,Cookie:cookie,'Content-Type':raw?'application/octet-stream':'application/json'},body:raw|| (body?JSON.stringify(body):undefined)});}
async function json(path,options={}){const r=await request(path,options);assert.ok(r.ok,`${r.status}: ${await r.clone().text()}`);return r.json();}
test('content administration: drafts, publication, media and rollback',async t=>{
 try {
 const admin=await account('editor@publishing.test','admin'),parent=await account('parent@publishing.test','parent');
 const original=(await json('/api/v1/catalog')).releaseId;
 const child=await json('/api/v1/learners',{cookie:parent,body:{nickname:'旧版续学'}});
 const session=await json(`/api/v1/learners/${child.id}/sessions`,{cookie:parent,body:{requestId:randomUUID(),releaseId:original,lessonId:'family',mode:'lesson'}});
 let draft,releaseId,upload;
 let templateAsset;
 await t.test('all editorial endpoints require administrator and trusted Origin',async()=>{
  for(const cookie of ['',parent]){
   const expected=cookie?403:401;
   for(const [path,method,body] of [['/content','GET'],['/drafts','POST',{baseReleaseId:original}],['/uploads','POST',{}],['/releases','POST',{}],['/media/'+'a'.repeat(64),'GET'],['/drafts/00000000-0000-4000-8000-000000000000','GET']])assert.equal((await request('/api/v1/admin'+path,{cookie,method,body})).status,expected);
  }
  assert.equal((await request('/api/v1/admin/drafts',{cookie:admin,from:'https://evil.test',body:{baseReleaseId:original}})).status,403);
  for(const cookie of ['',parent])assert.equal((await request('/api/v1/admin/hunt-templates/living-room-v1',{cookie,body:{}})).status,cookie?403:401);
  assert.equal((await request('/api/v1/admin/hunt-templates/living-room-v1',{cookie:admin,from:'https://evil.test',body:{}})).status,403);
  assert.equal((await request('/api/v1/admin/hunt-templates/unknown',{cookie:admin,body:{}})).status,404);
 });
 await t.test('draft content stays private; concurrent saves detect a lost update',async()=>{
  draft=await json('/api/v1/admin/drafts',{cookie:admin,body:{baseReleaseId:original}});
  draft.manifest.lessons[0].title='发布测试：认识家人';
  const body={revision:draft.revision,manifest:draft.manifest};
  const results=await Promise.all([request(`/api/v1/admin/drafts/${draft.id}`,{cookie:admin,method:'PUT',body}),request(`/api/v1/admin/drafts/${draft.id}`,{cookie:admin,method:'PUT',body})]);
  assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);draft=await json(`/api/v1/admin/drafts/${draft.id}`,{cookie:admin});
  assert.notEqual((await json('/api/v1/catalog')).lessons[0].title,draft.manifest.lessons[0].title);
  assert.equal((await request(`/api/v1/catalog?releaseId=${draft.id}`)).status,404);
 });
 await t.test('upload validates bytes; preview is private; publication validates transcript and cues',async()=>{
  assert.equal((await request('/api/v1/admin/uploads',{cookie:admin,method:'POST',raw:Buffer.from('<svg onload="alert(1)">unsafe upload</svg>')})).status,400);
  const asset=draft.manifest.assets.find(a=>a.id==='audio-word-wo');
  const bytes=await readFile(join(process.env.MEDIA_DIR,asset.objectKey));bytes[bytes.length-2]^=1;
  upload=await json('/api/v1/admin/uploads',{cookie:admin,method:'POST',raw:bytes});
  assert.equal((await request(`/media/${upload.objectKey}`)).status,404);
  assert.equal((await request(`/api/v1/admin/media/${upload.sha256}`,{cookie:admin})).status,200);
  assert.equal((await request(`/api/v1/admin/media/${upload.sha256}`,{cookie:parent})).status,403);
  const preview=await app.request(origin+`/api/v1/admin/media/${upload.sha256}`,{headers:{Host:'localhost:8080',Origin:origin,Cookie:admin,Range:'bytes=2-15'}});
  assert.equal(preview.status,206);assert.equal(preview.headers.get('cache-control'),'no-store');assert.equal(preview.headers.get('content-range'),`bytes 2-15/${bytes.length}`);assert.deepEqual(Buffer.from(await preview.arrayBuffer()),bytes.subarray(2,16));
  assert.equal((await app.request(origin+`/api/v1/admin/media/${upload.sha256}`,{headers:{Host:'localhost:8080',Origin:origin,Cookie:parent,Range:'bytes=2-15'}})).status,403);
  assert.equal((await app.request(origin+`/api/v1/admin/media/${upload.sha256}`,{headers:{Host:'localhost:8080',Origin:origin,Cookie:admin,Range:`bytes=${bytes.length}-`}})).status,416);
  Object.assign(asset,{objectKey:upload.objectKey,sha256:upload.sha256,bytes:upload.bytes,durationMs:upload.durationMs});
  // Synthetic times exercise storage/version binding; this is not material review.
  asset.cues={...asset.cues,status:'reviewed',audioSha256:asset.sha256,ends:asset.cues.starts.map((start,i)=>asset.cues.starts[i+1]??asset.durationMs/1000)};
  const story=draft.manifest.lessons[0].story,storyAsset=draft.manifest.assets.find(a=>a.id===`audio-${story.audio}`);
  const storyBytes=await readFile(join(process.env.MEDIA_DIR,storyAsset.objectKey));storyBytes[storyBytes.length-2]^=1;
  const storyUpload=await json('/api/v1/admin/uploads',{cookie:admin,method:'POST',raw:storyBytes});
  story.text=story.text.replace('。','！');
  Object.assign(storyAsset,{objectKey:storyUpload.objectKey,sha256:storyUpload.sha256,bytes:storyUpload.bytes,durationMs:storyUpload.durationMs,text:story.text,cues:{...storyAsset.cues,text:story.text}});
  draft=await json(`/api/v1/admin/drafts/${draft.id}`,{cookie:admin,method:'PUT',body:{revision:draft.revision,manifest:draft.manifest}});
  assert.equal(draft.manifest.assets.find(a=>a.id===asset.id).cues.status,'reviewed');
  const invalid=structuredClone(draft.manifest);invalid.lessons[0].story.text+='呀';
  let d=await json('/api/v1/admin/drafts',{cookie:admin,body:{baseReleaseId:original}});
  d=await json(`/api/v1/admin/drafts/${d.id}`,{cookie:admin,method:'PUT',body:{revision:d.revision,manifest:invalid}});
  assert.equal((await request(`/api/v1/admin/drafts/${d.id}/validate`,{cookie:admin,body:{}})).status,422);
  const channel=(await json('/api/v1/admin/content',{cookie:admin})).channel;
  assert.equal((await request('/api/v1/admin/releases',{cookie:admin,body:{draftId:d.id,revision:d.revision,channelRevision:channel.revision}})).status,422);
 });
 await t.test('trusted scene templates stage privately, deduplicate and save with fixed positions',async()=>{
  for(const template of huntTemplates){
   const path=`/api/v1/admin/hunt-templates/${template.id}`;
   templateAsset=await json(path,{cookie:admin,body:{}});
   assert.deepEqual(await json(path,{cookie:admin,body:{}}),templateAsset);
   assert.equal((await request(`/media/${templateAsset.objectKey}`)).status,404);
   const preview=await request(`/api/v1/admin/media/${templateAsset.sha256}`,{cookie:admin});
   assert.equal(await preview.text(),template.svg);assert.equal(preview.headers.get('content-type'),'image/svg+xml');
   assert.equal((await request(`/api/v1/admin/media/${templateAsset.sha256}`,{cookie:parent})).status,403);
   assert.equal(await db.contentUpload.count({where:{sha256:templateAsset.sha256}}),1);
   draft.manifest.assets.push(templateAsset);
   Object.assign(draft.manifest.huntScenes[0],{imageAssetId:templateAsset.id,description:template.description,slots:template.slots});
   draft=await json(`/api/v1/admin/drafts/${draft.id}`,{cookie:admin,method:'PUT',body:{revision:draft.revision,manifest:draft.manifest}});
   assert.equal((await json(`/api/v1/admin/drafts/${draft.id}/validate`,{cookie:admin,body:{}})).valid,true);
  }
  const sceneIds=huntTemplates.map(t=>`play-${t.id}`);
  for(const [i,t] of huntTemplates.entries())draft.manifest.huntScenes.push({id:sceneIds[i],imageAssetId:`image-hunt-${t.id}`,themeIds:[],description:t.description,slots:t.slots});
  draft.manifest.huntScenes[0].play={sceneIds,distractorIds:draft.manifest.lessons.flatMap(l=>l.characters).slice(0,15).map(c=>c.id)};
  draft=await json(`/api/v1/admin/drafts/${draft.id}`,{cookie:admin,method:'PUT',body:{revision:draft.revision,manifest:draft.manifest}});
 });
 await t.test('publication is atomic, retry safe, preserves old versions, supports media Range',async()=>{
  const channel=(await json('/api/v1/admin/content',{cookie:admin})).channel;
  assert.equal((await json(`/api/v1/admin/drafts/${draft.id}/validate`,{cookie:admin,body:{}})).valid,true);
  const count=await db.contentRelease.count();
  assert.equal((await request('/api/v1/admin/releases',{cookie:admin,body:{draftId:draft.id,revision:draft.revision,channelRevision:channel.revision+100}})).status,409);
  assert.equal(await db.contentRelease.count(),count);assert.equal((await request(`/media/${upload.objectKey}`)).status,404);
  const body={draftId:draft.id,revision:draft.revision,channelRevision:channel.revision};
  ({releaseId}=await json('/api/v1/admin/releases',{cookie:admin,body}));
  assert.equal((await request('/api/v1/admin/releases',{cookie:admin,body})).status,409);
  assert.equal((await json('/api/v1/catalog')).releaseId,releaseId);
  assert.equal((await json('/api/v1/catalog')).lessons[0].title,'发布测试：认识家人');
  assert.equal((await json(`/api/v1/catalog?releaseId=${original}`)).lessons[0].title,'认识家人');
  assert.equal((await json(`/api/v1/releases/${original}/lessons/family`)).releaseId,original);
  assert.equal((await json(`/api/v1/releases/${releaseId}/lessons/family`)).lesson.title,'发布测试：认识家人');
  assert.equal((await json(`/api/v1/releases/${releaseId}/lessons/family`)).lesson.story.text,'爸爸妈妈和我一起看书！');
  const publishedWord=(await json(`/api/v1/releases/${releaseId}/lessons/family`)).assets.find(a=>a.id==='audio-word-wo');
  assert.equal(publishedWord.cues.status,'reviewed');assert.equal(publishedWord.cues.audioSha256,publishedWord.sha256);assert.equal(publishedWord.cues.ends.length,Array.from(publishedWord.text).length);
  assert.equal((await json(`/api/v1/releases/${original}/lessons/family`)).lesson.story.text,'爸爸妈妈和我一起看书。');
  const newScene=(await json(`/api/v1/releases/${releaseId}/lessons/family`)).scene;
  assert.equal(newScene.imageAssetId,templateAsset.id);assert.equal(newScene.slots.length,7);
  assert.notEqual((await json(`/api/v1/releases/${original}/lessons/family`)).scene.imageAssetId,templateAsset.id);
  assert.equal((await request(`/media/${templateAsset.objectKey}`)).status,200);
  assert.equal(await db.lessonVersion.count({where:{releaseId}}),10);
  const media=await app.request(origin+`/media/${upload.objectKey}`,{headers:{Range:'bytes=0-15'}});assert.equal(media.status,206);assert.equal((await media.arrayBuffer()).byteLength,16);
  assert.equal((await request('/media/.drafts/'+upload.objectKey)).status,404);
  assert.equal((await request(`/api/v1/admin/drafts/${draft.id}`,{cookie:admin,method:'PUT',body:{revision:draft.revision+1,manifest:draft.manifest}})).status,409);
 });
 await t.test('v2 hunts persist roles, rotate across theme lessons and reject distractor evidence',async()=>{
  const pkg=await json(`/api/v1/releases/${releaseId}/lessons/family`);
  assert.equal(pkg.scenePool.length,huntTemplates.length);assert.equal(pkg.huntCandidates.length,15);
  assert.ok(pkg.scenePool.every(s=>pkg.assets.some(a=>a.id===s.imageAssetId)));
  const learner=await json('/api/v1/learners',{cookie:parent,body:{nickname:'新找字'}}),path=`/api/v1/learners/${learner.id}`;
  await json(path+'/learning-settings',{cookie:parent,method:'PATCH',body:{openAllCourses:true}});
  const input={requestId:randomUUID(),releaseId,lessonId:'family',mode:'lesson',huntLayoutVersion:2};
  let state=await json(path+'/sessions',{cookie:parent,body:input});const first=state.session.huntRound;
  assert.equal(first.version,2);assert.equal(first.placements.length,5);assert.equal(first.placements.filter(p=>p.isTarget).length,3);
  assert.deepEqual((await json(path+'/sessions',{cookie:parent,body:input})).session.huntRound,first);
  for(const count of [3,0,'4'])assert.equal((await request(path+'/learning-settings',{cookie:parent,method:'PATCH',body:{huntDistractorCount:count}})).status,400);
  const harder=await json(path+'/learning-settings',{cookie:parent,method:'PATCH',body:{huntDistractorCount:4}});
  assert.equal(harder.huntDistractorCount,4);assert.equal(harder.openAllCourses,true);
  assert.deepEqual(harder.sessions.find(s=>s.id===state.session.id).huntRound,first);
  assert.deepEqual(harder.skills,state.progress.skills);assert.deepEqual(harder.seen,state.progress.seen);
  assert.deepEqual((await json(path+'/sessions',{cookie:parent,body:{...input,requestId:randomUUID()}})).session.huntRound,first);
  const event=async(type,fields={})=>{state=await json(path+'/events',{cookie:parent,body:{clientEventId:randomUUID(),sessionId:state.session.id,expectedRevision:state.session.revision,type,...fields}});};
  while(state.session.stepIndex<13){if(state.session.presentation&&!state.session.presentation.answer)await event('answer',{presentationId:state.session.presentation.id,selectedId:null,skipped:true});await event('advance');}
  const attemptCount=await db.attempt.count(),skills=state.progress.skills,seen=state.progress.seen;
  const decoy=first.placements.find(p=>!p.isTarget).characterId,target=first.placements.find(p=>p.isTarget).characterId;
  assert.equal((await request(path+'/events',{cookie:parent,body:{clientEventId:randomUUID(),sessionId:state.session.id,expectedRevision:state.session.revision,type:'hunt',characterId:decoy}})).status,400);
  const streamId=randomUUID();await json(path+'/sync-streams',{cookie:parent,body:{streamId,sessionId:state.session.id}});
  const wrong={seq:1,occurredAt:new Date().toISOString(),timeZone:'Asia/Shanghai',command:{clientEventId:randomUUID(),sessionId:state.session.id,expectedRevision:state.session.revision,type:'hunt',characterId:decoy}};
  const rejected=await json(path+'/events:batch',{cookie:parent,body:{streamId,events:[wrong]}});assert.equal(rejected.receipts[0].status,'rejected');
  await event('hunt',{characterId:target});assert.deepEqual(state.session.huntFound,[target]);assert.deepEqual(state.session.huntRound,first);
  assert.equal(await db.attempt.count(),attemptCount);assert.deepEqual(state.progress.skills,skills);assert.deepEqual(state.progress.seen,seen);
  const otherLesson=await json(path+'/sessions',{cookie:parent,body:{...input,requestId:randomUUID(),lessonId:'home'}});assert.notEqual(otherLesson.session.huntRound.sceneId,first.sceneId);
  assert.equal(otherLesson.session.huntRound.placements.length,7);
  const automatic=await json(path+'/learning-settings',{cookie:parent,method:'PATCH',body:{huntDistractorCount:null}});
  assert.equal(automatic.huntDistractorCount,null);
  await event('advance');await event('advance');
  const replay=await json(path+'/sessions',{cookie:parent,body:{...input,requestId:randomUUID()}});assert.equal(replay.session.huntRound.ordinal,1);assert.equal(replay.session.huntRound.placements.length,6);assert.notEqual(replay.session.huntRound.sceneId,otherLesson.session.huntRound.sceneId);
  const imported=await json('/api/v1/learners',{cookie:parent,body:{nickname:'导入找字'}});
  const raw={schemaVersion:1,contentVersion:4,releaseId,activeLesson:'family',lessonProgress:{},unlocked:[],started:true,completed:false,step:13,stepId:'hunt',session:'guest',sound:true,seen:[],observations:{},attempts:[],huntFound:[target],huntRound:first,huntRoundIndex:0};
  const importedProgress=await json(`/api/v1/learners/${imported.id}/imports`,{cookie:parent,body:{source:'legacy_import',progress:raw}});assert.deepEqual(importedProgress.progress.sessions[0].huntRound,first);
  const untouched=await json('/api/v1/learners',{cookie:parent,body:{nickname:'游客偏好'}});
  const guestPreference=await json(`/api/v1/learners/${untouched.id}/imports`,{cookie:parent,body:{source:'legacy_import',progress:{...raw,huntDistractorCount:4}}});
  assert.equal(guestPreference.progress.huntDistractorCount,4);
  const configured=await json('/api/v1/learners',{cookie:parent,body:{nickname:'保留家长设置'}});
  const configuredPath=`/api/v1/learners/${configured.id}`;
  await json(configuredPath+'/learning-settings',{cookie:parent,method:'PATCH',body:{huntDistractorCount:2}});
  const importedSetting=await json(configuredPath+'/imports',{cookie:parent,body:{source:'legacy_import',progress:{...raw,huntDistractorCount:4}}});
  assert.equal(importedSetting.progress.huntDistractorCount,2);
  const oldSetting=await json(configuredPath+'/learning-settings',{cookie:parent,method:'PATCH',body:{openAllCourses:true}});
  assert.equal(oldSetting.huntDistractorCount,2);
  await json(configuredPath+'/events',{cookie:parent,body:{clientEventId:randomUUID(),sessionId:importedSetting.progress.sessions[0].id,expectedRevision:0,type:'advance'}});
  const easier=await json(configuredPath+'/sessions',{cookie:parent,body:{...input,lessonId:'home',requestId:randomUUID()}});
  assert.equal(easier.session.huntRound.placements.length,5);
  const oldClient=await json('/api/v1/learners',{cookie:parent,body:{nickname:'旧版客户端'}});
  const oldRound=await json(`/api/v1/learners/${oldClient.id}/sessions`,{cookie:parent,body:{...input,requestId:randomUUID(),huntLayoutVersion:1}});assert.equal(oldRound.session.huntRound.version,1);
 });
 await t.test('existing learner continues its original question version after a new publication',async()=>{
  const root=`/api/v1/learners/${child.id}`;
  assert.equal((await json('/api/health')).releaseId,releaseId);
  const resumed=await json(root+'/progress',{cookie:parent});assert.equal(resumed.releaseId,original);assert.equal(resumed.sessions[0].id,session.session.id);
  const advanced=await json(root+'/events',{cookie:parent,body:{clientEventId:randomUUID(),sessionId:session.session.id,expectedRevision:session.session.revision,type:'advance'}});assert.equal(advanced.session.stepIndex,1);assert.equal(advanced.progress.releaseId,original);
  assert.equal((await request(root+'/sessions',{cookie:parent,body:{requestId:randomUUID(),releaseId,lessonId:'family',mode:'lesson'}})).status,409);
 });
 await t.test('rollback changes current catalog only, audit remains, stale activations conflict',async()=>{
  const overview=await json('/api/v1/admin/content',{cookie:admin});
  await json(`/api/v1/admin/releases/${original}/activate`,{cookie:admin,body:{channelRevision:overview.channel.revision}});
  assert.equal((await json('/api/v1/catalog')).releaseId,original);
  assert.equal((await json(`/api/v1/releases/${releaseId}/lessons/family`)).lesson.title,'发布测试：认识家人');
  assert.equal((await request(`/api/v1/admin/releases/${releaseId}/activate`,{cookie:admin,body:{channelRevision:overview.channel.revision}})).status,409);
  assert.ok((await json('/api/v1/admin/content',{cookie:admin})).audit.some(a=>a.action==='publish'));
 });
 }finally{await db.$disconnect();}
});
