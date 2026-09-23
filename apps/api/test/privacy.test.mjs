import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes,randomUUID} from 'node:crypto';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {database} from '../dist/db.js';
import {createAuth,authConfig} from '../dist/auth.js';
import {createApp} from '../dist/app.js';
import {replayDeletions,cleanupHash,deleteFamilyData} from '../dist/data-management.js';
import {recordDeletion} from '../dist/deletion-ledger.js';
import {dataExportSchema,familySchema,lessonPackageSchema,learningProgressSchema} from '@learnbuddy/contracts';
const db=database(),origin='http://localhost:8080',password='privacy-test-password';
const config={local:true,origins:[origin],secret:randomBytes(48).toString('base64url')};
const app=createApp(db,createAuth(db,config,async()=>{}),[origin]);
let address=10;
function req(path,{cookie='',body,method=body?'POST':'GET',from=origin}={}){return app.request(origin+path,{method,headers:{Host:'localhost:8080',Origin:from,Cookie:cookie,'Content-Type':'application/json','x-real-ip':`10.72.2.${++address}`},body:body?JSON.stringify(body):undefined});}
async function json(path,options){const r=await req(path,options);assert.ok(r.ok,`${r.status}: ${await r.clone().text()}`);return r.json();}
async function account(email){await json('/api/auth/sign-up/email',{body:{name:'数据管理测试',email,password}});await db.familyAccount.update({where:{email},data:{emailVerified:true}});const r=await req('/api/auth/sign-in/email',{body:{email,password}});assert.equal(r.status,200);return r.headers.getSetCookie().map(v=>v.split(';')[0]).join('; ');}
test('R7 data management, durable deletion and production session policy',async t=>{
 try{
 const email='own@privacy.test',cookie=await account(email),foreign=await account('foreign@privacy.test');
 const me=await json('/api/v1/me',{cookie}),accountId=me.account.accountId;
 const child=await json('/api/v1/learners',{cookie,body:{nickname:'删除测试'}}),sibling=await json('/api/v1/learners',{cookie,body:{nickname:'保留测试'}}),root=`/api/v1/learners/${child.id}`;
 let state=await json(root+'/sessions',{cookie,body:{requestId:randomUUID(),releaseId:'prototype-v4',lessonId:'family',mode:'lesson'}});
 const send=async(type,fields={})=>state=await json(root+'/events',{cookie,body:{clientEventId:randomUUID(),sessionId:state.session.id,expectedRevision:state.session.revision,type,...fields}});
 for(let i=0;i<7;i++)await send('advance');
 await send('audio',{presentationId:state.session.presentation.id,result:'played'});await send('answer',{presentationId:state.session.presentation.id,selectedId:'ba',skipped:false});
 const streamId=randomUUID();await json(root+'/sync-streams',{cookie,body:{streamId,sessionId:state.session.id}});
 const envelope={seq:1,occurredAt:new Date().toISOString(),timeZone:'Asia/Shanghai',command:{clientEventId:randomUUID(),sessionId:state.session.id,expectedRevision:state.session.revision,type:'advance'}};
 await json(root+'/events:batch',{cookie,body:{streamId,events:[envelope]}});
 const body={requestId:randomUUID(),confirmation:child.nickname,password};
 await t.test('export ownership, actual choices/version, no credentials and additive v1 compatibility',async()=>{
  assert.equal((await req('/api/v1/account/export')).status,401);
  assert.equal((await req(root+'/export',{cookie:foreign})).status,404);
  const response=await req('/api/v1/account/export',{cookie});assert.equal(response.headers.get('cache-control'),'no-store');
  const exported=dataExportSchema.parse(await response.json());assert.equal(exported.learners.length,2);
  const history=exported.learners.find(x=>x.profile.id===child.id);assert.equal(history.sessions[0].lesson.releaseId,'prototype-v4');assert.equal(history.mistakes.length,1);assert.equal(history.syncStreams[0].entries.length,1);
  const attempt=history.sessions[0].presentations.flatMap(x=>x.attempts)[0];assert.equal(attempt.answer.selectedId,'ba');assert.equal(attempt.correct,false);
  for(const key of ['passwordHash','cleanupToken','authSession','accessToken','refreshToken'])assert.ok(!JSON.stringify(exported).includes('"'+key+'"'));
  assert.equal((await json(root+'/export',{cookie})).learners.length,1);
  familySchema.parse(me);familySchema.parse({account:{accountId,email,role:'parent'},learners:me.learners});
  learningProgressSchema.parse(await json(root+'/progress',{cookie}));
  lessonPackageSchema.parse(await json('/api/v1/releases/prototype-v4/lessons/family'));
  assert.ok((await json('/api/v1/openapi.json')).paths['/api/v1/account'].delete);
 });
 await t.test('delete requires own target, trusted Origin, exact confirmation and real password',async()=>{
  assert.equal((await req(root,{cookie:foreign,method:'DELETE',body})).status,404);
  assert.equal((await req(root,{cookie,method:'DELETE',from:'https://evil.test',body})).status,403);
  assert.equal((await req(root,{cookie,method:'DELETE',body:{...body,password:'wrong-password'}})).status,403);
  assert.equal((await req(root,{cookie,method:'DELETE',body:{...body,confirmation:'wrong child'}})).status,400);
  assert.ok(await db.learner.findUnique({where:{id:child.id}}));
 });
 await t.test('child hard delete cascades facts, preserves sibling/content, retries and stops old sync',async()=>{
  const count=await db.contentRelease.count();const receipt=await json(root,{cookie,method:'DELETE',body});assert.equal(receipt.scope,'learner');assert.deepEqual(receipt.learnerIds,[child.id]);
  assert.equal((await json(root,{cookie,method:'DELETE',body})).deletedAt,receipt.deletedAt);
  assert.equal(await db.learner.count({where:{id:child.id}}),0);assert.ok(await db.learner.findUnique({where:{id:sibling.id}}));assert.equal(await db.contentRelease.count(),count);
  for(const model of ['learningSession','learningEvent','learningProgress','learningSkill','learnerLesson','mistakeItem','syncStream','progressSnapshot','legacyImport'])assert.equal(await db[model].count({where:{learnerId:child.id}}),0,model);
  assert.equal(await db.syncEntry.count({where:{streamId}}),0);assert.equal(await db.questionPresentation.count({where:{sessionId:state.session.id}}),0);
  assert.ok((await json('/api/v1/me',{cookie})).deletedLearnerIds.includes(child.id));
  assert.equal((await req(root+'/events:batch',{cookie,body:{streamId,events:[envelope]}})).status,410);
  assert.equal((await req(root+'/sessions',{cookie,body:{requestId:randomUUID(),releaseId:'prototype-v4',lessonId:'family',mode:'lesson'}})).status,410);
  assert.equal((await req(root+'/progress',{cookie:foreign})).status,404);
 });
 await t.test('deletion rate limit is per authenticated family and survives request retry',async()=>{
  await req(`/api/v1/learners/${sibling.id}`,{cookie,method:'DELETE',body:{...body,requestId:randomUUID(),confirmation:sibling.nickname,password:'bad'}});
  assert.equal((await req(`/api/v1/learners/${sibling.id}`,{cookie,method:'DELETE',body:{...body,requestId:randomUUID(),confirmation:sibling.nickname}})).status,429);
  assert.ok(await db.learner.findUnique({where:{id:sibling.id}}));
  await db.rateLimit.deleteMany({where:{key:`privacy:${accountId}`}});
 });
 await t.test('account deletion invalidates all sessions; cleanup capability reveals only deletion',async()=>{
  const r=await req('/api/auth/sign-in/email',{body:{email,password}}),otherCookie=r.headers.getSetCookie().map(v=>v.split(';')[0]).join('; ');
  const accountBefore=await db.familyAccount.findUnique({where:{id:accountId}}),learnerBefore=await db.learner.findUnique({where:{id:sibling.id}});
  const release=await db.contentRelease.findFirst();
  const draft=await db.contentDraft.create({data:{createdBy:accountId,baseReleaseId:release.id,manifest:release.manifest}});
  await db.verification.create({data:{identifier:'reset-password:privacy-test',value:accountId,expiresAt:new Date(Date.now()+10000)}});
  const input={accountId,cleanupToken:me.account.cleanupToken};assert.deepEqual(await json('/api/v1/deletion-status',{body:input}),{deleted:false});
  await json('/api/v1/account',{cookie,method:'DELETE',body:{requestId:randomUUID(),confirmation:email,password}});
  for(const c of [cookie,otherCookie])assert.equal((await req('/api/v1/me',{cookie:c})).status,401);
  assert.equal(await db.familyAccount.count({where:{id:accountId}}),0);assert.equal(await db.learner.count({where:{accountId}}),0);assert.equal(await db.authSession.count({where:{accountId}}),0);assert.equal(await db.identity.count({where:{accountId}}),0);assert.equal(await db.verification.count({where:{value:accountId}}),0);
  assert.equal((await db.contentDraft.findUnique({where:{id:draft.id}})).createdBy,null);
  assert.deepEqual(await json('/api/v1/deletion-status',{body:input}),{deleted:true});assert.deepEqual(await json('/api/v1/deletion-status',{body:{...input,cleanupToken:randomUUID()}}),{deleted:false});
  assert.equal((await req('/api/v1/deletion-status',{body:input,from:'https://evil.test'})).status,403);
  // Simulate an old backup putting removed rows back while receipts already exist.
  await db.familyAccount.create({data:accountBefore});await db.learner.create({data:learnerBefore});await replayDeletions(db);assert.equal(await db.familyAccount.count({where:{id:accountId}}),0);assert.equal(await db.learner.count({where:{id:sibling.id}}),0);
  await replayDeletions(db);assert.ok(await db.contentDraft.findUnique({where:{id:draft.id}}));
 });
 await t.test('ledger failure blocks deletion; interrupted durable intent can be retried and replayed',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'privacy-ledger-')),previous=process.env.DELETION_LOG_DIR;
  const owner=await db.familyAccount.findUniqueOrThrow({where:{email:'foreign@privacy.test'}});
  const c=await json('/api/v1/learners',{cookie:foreign,body:{nickname:'中断测试'}}),requestId=randomUUID();
  try{
   const invalid=join(dir,'not-a-directory');await writeFile(invalid,'x');process.env.DELETION_LOG_DIR=invalid;
   await assert.rejects(deleteFamilyData(db,owner.id,requestId,c.nickname,c.id));assert.ok(await db.learner.findUnique({where:{id:c.id}}));
   process.env.DELETION_LOG_DIR=dir;
   await recordDeletion({requestId,scope:'learner',accountId:owner.id,learnerIds:[c.id],deletedAt:new Date().toISOString(),cleanupTokenHash:null});
   await deleteFamilyData(db,owner.id,requestId,c.nickname,c.id);assert.equal(await db.learner.count({where:{id:c.id}}),0);
   const pending=await json('/api/v1/learners',{cookie:foreign,body:{nickname:'启动重放'}});
   await recordDeletion({requestId:randomUUID(),scope:'learner',accountId:owner.id,learnerIds:[pending.id],deletedAt:new Date().toISOString(),cleanupTokenHash:null});
   await replayDeletions(db);assert.equal(await db.learner.count({where:{id:pending.id}}),0);
  }finally{process.env.DELETION_LOG_DIR=previous;await rm(dir,{recursive:true,force:true});}
 });
 await t.test('production policy uses Secure HttpOnly cookies and HTTPS verification links',async()=>{
  const secureOrigin='https://learnbuddy.test',messages=[],secureAuth=createAuth(db,{...config,local:false,origins:[secureOrigin]},async(to,subject,url)=>messages.push(url)),secureApp=createApp(db,secureAuth,[secureOrigin]);
  const secureReq=(path,body)=>secureApp.request(secureOrigin+path,{method:'POST',headers:{Host:'learnbuddy.test',Origin:secureOrigin,'Content-Type':'application/json','x-real-ip':'10.77.2.11'},body:JSON.stringify(body)});
  const email='secure@privacy.test';assert.equal((await secureReq('/api/auth/sign-up/email',{name:'HTTPS 策略',email,password})).status,200);assert.ok(messages[0].startsWith(secureOrigin));
  await db.familyAccount.update({where:{email},data:{emailVerified:true}});
  const login=await secureReq('/api/auth/sign-in/email',{email,password});assert.equal(login.status,200);const setCookie=login.headers.get('set-cookie');assert.match(setCookie,/__Secure-better-auth.session_token=/);assert.match(setCookie,/; Secure/i);assert.match(setCookie,/; HttpOnly/i);assert.match(setCookie,/SameSite=Lax/i);
  const env={AUTH_MODE:process.env.AUTH_MODE,AUTH_ORIGINS:process.env.AUTH_ORIGINS,AUTH_SECRET:process.env.AUTH_SECRET};
  try{process.env.AUTH_MODE='production';process.env.AUTH_ORIGINS=origin;process.env.AUTH_SECRET=config.secret;assert.throws(()=>authConfig(),/HTTPS/);}finally{for(const [key,value]of Object.entries(env))if(value===undefined)delete process.env[key];else process.env[key]=value;}
 });
 }finally{await db.$disconnect();}
});
