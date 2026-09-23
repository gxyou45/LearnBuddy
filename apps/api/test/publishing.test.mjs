import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes,randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {database} from '../dist/db.js';
import {createAuth} from '../dist/auth.js';
import {createApp} from '../dist/app.js';
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
 await t.test('all editorial endpoints require administrator and trusted Origin',async()=>{
  for(const cookie of ['',parent]){
   const expected=cookie?403:401;
   for(const [path,method,body] of [['/content','GET'],['/drafts','POST',{baseReleaseId:original}],['/uploads','POST',{}],['/releases','POST',{}],['/media/'+'a'.repeat(64),'GET'],['/drafts/00000000-0000-4000-8000-000000000000','GET']])assert.equal((await request('/api/v1/admin'+path,{cookie,method,body})).status,expected);
  }
  assert.equal((await request('/api/v1/admin/drafts',{cookie:admin,from:'https://evil.test',body:{baseReleaseId:original}})).status,403);
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
  Object.assign(asset,{objectKey:upload.objectKey,sha256:upload.sha256,bytes:upload.bytes,durationMs:upload.durationMs});
  const story=draft.manifest.lessons[0].story,storyAsset=draft.manifest.assets.find(a=>a.id===`audio-${story.audio}`);
  const storyBytes=await readFile(join(process.env.MEDIA_DIR,storyAsset.objectKey));storyBytes[storyBytes.length-2]^=1;
  const storyUpload=await json('/api/v1/admin/uploads',{cookie:admin,method:'POST',raw:storyBytes});
  story.text=story.text.replace('。','！');
  Object.assign(storyAsset,{objectKey:storyUpload.objectKey,sha256:storyUpload.sha256,bytes:storyUpload.bytes,durationMs:storyUpload.durationMs,text:story.text,cues:{...storyAsset.cues,text:story.text}});
  draft=await json(`/api/v1/admin/drafts/${draft.id}`,{cookie:admin,method:'PUT',body:{revision:draft.revision,manifest:draft.manifest}});
  const invalid=structuredClone(draft.manifest);invalid.lessons[0].story.text+='呀';
  let d=await json('/api/v1/admin/drafts',{cookie:admin,body:{baseReleaseId:original}});
  d=await json(`/api/v1/admin/drafts/${d.id}`,{cookie:admin,method:'PUT',body:{revision:d.revision,manifest:invalid}});
  assert.equal((await request(`/api/v1/admin/drafts/${d.id}/validate`,{cookie:admin,body:{}})).status,422);
  const channel=(await json('/api/v1/admin/content',{cookie:admin})).channel;
  assert.equal((await request('/api/v1/admin/releases',{cookie:admin,body:{draftId:d.id,revision:d.revision,channelRevision:channel.revision}})).status,422);
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
  assert.equal((await json(`/api/v1/releases/${original}/lessons/family`)).lesson.story.text,'爸爸妈妈和我一起看书。');
  assert.equal(await db.lessonVersion.count({where:{releaseId}}),10);
  const media=await app.request(origin+`/media/${upload.objectKey}`,{headers:{Range:'bytes=0-15'}});assert.equal(media.status,206);assert.equal((await media.arrayBuffer()).byteLength,16);
  assert.equal((await request('/media/.drafts/'+upload.objectKey)).status,404);
  assert.equal((await request(`/api/v1/admin/drafts/${draft.id}`,{cookie:admin,method:'PUT',body:{revision:draft.revision+1,manifest:draft.manifest}})).status,409);
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
