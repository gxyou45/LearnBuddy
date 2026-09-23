import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes,randomUUID} from 'node:crypto';
import {database} from '../dist/db.js';
import {createAuth} from '../dist/auth.js';
import {createApp} from '../dist/app.js';
const db=database(),origin='http://localhost:8080';
const auth=createAuth(db,{local:true,origins:[origin],secret:randomBytes(48).toString('base64url')},async()=>{}),app=createApp(db,auth,[origin]);
function req(path,{cookie='',body,method=body?'POST':'GET',from=origin}={}){return app.request(origin+path,{method,headers:{Host:'localhost:8080',Origin:from,Cookie:cookie,'Content-Type':'application/json','x-real-ip':'10.23.45.67'},body:body?JSON.stringify(body):undefined});}
async function json(path,opts){const r=await req(path,opts);assert.ok(r.ok,`${r.status}: ${await r.clone().text()}`);return r.json();}
async function account(email){await json('/api/auth/sign-up/email',{body:{name:'云端测试',email,password:'safe-learning-password'}});await db.familyAccount.update({where:{email},data:{emailVerified:true}});const r=await req('/api/auth/sign-in/email',{body:{email,password:'safe-learning-password'}});assert.equal(r.status,200);return r.headers.getSetCookie().map(v=>v.split(';')[0]).join('; ');}
test('online learning authority, ownership, idempotence and evidence',async t=>{
 try {
 const cookie=await account('a@learning.test'),other=await account('b@learning.test');
 const child=(await json('/api/v1/learners',{cookie,body:{nickname:'在线孩子'}})).id;
 const sibling=(await json('/api/v1/learners',{cookie,body:{nickname:'另一个孩子'}})).id;
 const root=`/api/v1/learners/${child}`;
 let state;
 const start=async(extra={})=>{state=await json(root+'/sessions',{cookie,body:{requestId:randomUUID(),releaseId:'prototype-v4',lessonId:'family',mode:'lesson',...extra}});return state;};
 const command=(type,fields={})=>({clientEventId:randomUUID(),sessionId:state.session.id,expectedRevision:state.session.revision,type,...fields});
 const send=async(type,fields={})=>{state=await json(root+'/events',{cookie,body:command(type,fields)});return state;};
 const answer=async(selectedId,skipped=false)=>send('answer',{presentationId:state.session.presentation.id,selectedId,skipped});
 const seek=async(index)=>{while(state.session.stepIndex<index){if(state.session.presentation&&!state.session.presentation.answer)await answer(null,true);await send('advance');}};
 await t.test('foreign reads/writes and forged correctness are rejected; request IDs bind payload',async()=>{
  for(const path of ['/progress','/reviews','/mistakes']){assert.equal((await req(root+path,{cookie:other})).status,404);assert.equal((await req(root+path)).status,401);}
  const body={requestId:randomUUID(),releaseId:'prototype-v4',lessonId:'family',mode:'lesson'};
  assert.equal((await req(root+'/sessions',{cookie:other,body})).status,404);
  assert.equal((await req(root+'/sessions',{cookie,body,from:'https://evil.test'})).status,403);
  state=await json(root+'/sessions',{cookie,body});const original=state.session.id;
  assert.equal((await json(root+'/sessions',{cookie,body})).session.id,original);
  assert.equal((await req(root+'/sessions',{cookie,body:{...body,lessonId:'home'}})).status,409);
  assert.equal((await req(`/api/v1/learners/${sibling}/events`,{cookie,body:command('advance')})).status,404);
  assert.equal((await json(`/api/v1/learners/${sibling}/progress`,{cookie})).sessions.length,0);
 });
 await t.test('step mutations are revision guarded and event retries do not advance twice',async()=>{
  const body=command('advance');
  const results=await Promise.all([json(root+'/events',{cookie,body}),json(root+'/events',{cookie,body})]);
  assert.deepEqual(results.map(r=>r.accepted).sort(),['applied','duplicate']);state=results[0];assert.equal(state.session.stepIndex,1);
  assert.equal((await req(root+'/events',{cookie,body:{...body,clientEventId:randomUUID()}})).status,409);
  assert.equal((await req(root+'/events',{cookie,body:{...body,type:'hunt',characterId:'wo'}})).status,409);
  const count=await db.learningEvent.count({where:{learnerId:child}});
  assert.equal((await req(root+'/events',{cookie,body:command('hunt',{characterId:'wo'})})).status,400);
  assert.equal(await db.learningEvent.count({where:{learnerId:child}}),count);
  await seek(7);assert.equal(state.session.presentation.options.length,3);
  assert.equal((await req(root+'/events',{cookie,body:command('advance')})).status,400);
 });
 await t.test('real options and wrong choice are stored; semantic duplicates and conflicts are distinguished',async()=>{
  const presentation=state.session.presentation;
  await send('audio',{presentationId:presentation.id,result:'played'});
  const forged=command('answer',{presentationId:presentation.id,selectedId:'ba',skipped:false,correct:true});
  assert.equal((await req(root+'/events',{cookie,body:forged})).status,400);
  const body=command('answer',{presentationId:presentation.id,selectedId:'ba',skipped:false});
  state=await json(root+'/events',{cookie,body});assert.equal(state.session.presentation.answer.correct,false);assert.equal(state.session.presentation.answer.independent,true);
  const semantic=await json(root+'/events',{cookie,body:{...body,clientEventId:randomUUID()}});assert.equal(semantic.accepted,'duplicate');
  assert.equal((await req(root+'/events',{cookie,body:{...body,clientEventId:randomUUID(),selectedId:'wo'}})).status,409);
  assert.equal(await db.attempt.count({where:{presentationId:presentation.id}}),1);
  const wrong=await json(root+'/mistakes',{cookie});assert.equal(wrong.items[0].selectedId,'ba');assert.deepEqual(wrong.items[0].correctIds,['wo']);assert.deepEqual(wrong.items[0].options,presentation.options);assert.equal(wrong.items[0].wrongCount,1);assert.equal(wrong.items[0].releaseId,'prototype-v4');
  await send('advance');
 });
 await t.test('hinted answers, missing/failed audio and skips do not count as knowledge errors or mastery',async()=>{
  await send('hint',{presentationId:state.session.presentation.id});await answer('ba');assert.equal(state.session.presentation.answer.independent,false);
  await send('advance');await send('audio',{presentationId:state.session.presentation.id,result:'failed'});await send('audio',{presentationId:state.session.presentation.id,result:'played'});await answer('wo');assert.equal(state.session.presentation.answer.audioFailed,true);assert.equal(state.session.presentation.answer.independent,false);
  await send('advance');await answer(null,true);assert.equal(state.session.presentation.answer.skipped,true);
  assert.equal((await json(root+'/mistakes',{cookie})).items.length,1);
  assert.ok(state.progress.characters.every(c=>c.status!=='较稳定'));
 });
 await t.test('another authenticated instance resumes the exact version, choice, order and hunt state',async()=>{
  const second=createApp(db,auth,[origin]);const r=await second.request(origin+root+'/progress',{headers:{Host:'localhost:8080',Cookie:cookie}});assert.equal(r.status,200);const p=await r.json();assert.deepEqual(p.sessions[0],state.session);
  await seek(13);await send('hunt',{characterId:'wo'});await send('hunt',{characterId:'ba'});
  assert.deepEqual((await json(root+'/progress',{cookie})).sessions[0].huntFound,['wo','ba']);
  assert.equal((await req(root+'/events',{cookie,body:command('hunt',{characterId:'mao'})})).status,400);
  await send('advance');await send('advance');assert.equal(state.session.completed,true);assert.deepEqual(state.progress.completedLessons,['family']);
  await start();assert.equal(state.session.stepIndex,0);assert.deepEqual(state.progress.completedLessons,['family']);
 });
 await t.test('review evidence changes separately from the formal course cursor and retained completion',async()=>{
  const formal=state.session;
  await db.learningSkill.updateMany({where:{learnerId:child,targetId:'wo',kind:'sound'},data:{dueDate:'2000-01-01'}});
  const queue=await json(root+'/reviews',{cookie});const item=queue.items.find(q=>q.targetId==='wo'&&q.kind==='sound');assert.ok(item);assert.equal(queue.timeZone,'Asia/Shanghai');
  await start({mode:'review',questionVersionId:item.questionVersionId});await send('audio',{presentationId:state.session.presentation.id,result:'played'});await answer('wo');await send('advance');
  assert.equal(state.session.mode,'review');assert.equal(state.session.completed,true);assert.equal(state.progress.sessions[0].id,formal.id);assert.equal(state.progress.sessions[0].stepIndex,formal.stepIndex);
  const wrong=(await json(root+'/mistakes',{cookie})).items[0];assert.equal(wrong.status,'consolidating');assert.equal(wrong.wrongCount,1);assert.equal(wrong.selectedId,'ba');
  assert.ok(!(await json(root+'/reviews',{cookie})).items.some(q=>q.targetId==='wo'&&q.kind==='sound'));
 });
 await t.test('parent access setting does not manufacture course completions; failed writes roll back',async()=>{
  const p=await json(root+'/learning-settings',{cookie,method:'PATCH',body:{openAllCourses:true}});assert.equal(p.openAllCourses,true);assert.deepEqual(p.completedLessons,['family']);
  const before=await db.learningEvent.count({where:{learnerId:child}});
  assert.equal((await req(root+'/events',{cookie,body:{...command('answer',{presentationId:randomUUID(),selectedId:'not-an-option',skipped:false}),sessionId:randomUUID()}})).status,404);
  assert.equal(await db.learningEvent.count({where:{learnerId:child}}),before);
 });
 }finally{await db.$disconnect();}
});
