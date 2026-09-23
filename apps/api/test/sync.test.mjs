import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes,randomUUID} from 'node:crypto';
import {database} from '../dist/db.js';
import {createAuth} from '../dist/auth.js';
import {createApp} from '../dist/app.js';
const db=database(),origin='http://localhost:8080';
const auth=createAuth(db,{local:true,origins:[origin],secret:randomBytes(48).toString('base64url')},async()=>{}),app=createApp(db,auth,[origin]);
function req(path,{cookie='',body,method=body?'POST':'GET',from=origin}={}){return app.request(origin+path,{method,headers:{Host:'localhost:8080',Origin:from,Cookie:cookie,'Content-Type':'application/json','x-real-ip':'10.31.45.67'},body:body?JSON.stringify(body):undefined});}
async function json(path,opts){const r=await req(path,opts);assert.ok(r.ok,`${r.status}: ${await r.clone().text()}`);return r.json();}
async function account(email){await json('/api/auth/sign-up/email',{body:{name:'离线测试',email,password:'offline-learning-password'}});await db.familyAccount.update({where:{email},data:{emailVerified:true}});const r=await req('/api/auth/sign-in/email',{body:{email,password:'offline-learning-password'}});return r.headers.getSetCookie().map(v=>v.split(';')[0]).join('; ');}
test('ACC-03 ordered sync, conflicts, deltas and honest legacy imports',async t=>{
 try{
 const cookie=await account('offline@sync.test'),other=await account('foreign@sync.test');
 const child=(await json('/api/v1/learners',{cookie,body:{nickname:'离线'}})).id,root=`/api/v1/learners/${child}`;
 const releaseId=(await json('/api/v1/catalog')).releaseId;
 let state=await json(root+'/sessions',{cookie,body:{requestId:randomUUID(),releaseId,lessonId:'family',mode:'lesson'}});
 const streamId=randomUUID();let plan=await json(root+'/sync-streams',{cookie,body:{streamId,sessionId:state.session.id}});
 const envelope=(seq,revision,type='advance',fields={})=>({seq,occurredAt:new Date().toISOString(),timeZone:'Asia/Shanghai',command:{clientEventId:randomUUID(),sessionId:state.session.id,expectedRevision:revision,type,...fields}});
 const batch=events=>json(root+'/events:batch',{cookie,body:{streamId,events}});
 await t.test('concurrent first delta reads stay read-only and safely reset an unknown baseline',async()=>{
  const fresh=(await json('/api/v1/learners',{cookie,body:{nickname:'并发首次读取'}})).id;
  const path=`/api/v1/learners/${fresh}`;
  const reads=await Promise.all(Array.from({length:12},()=>json(path+'/changes?cursor=0',{cookie})));
  for(const result of reads){assert.equal(result.reset,true);assert.equal(result.cursor,0);assert.equal(result.progress.learnerId,fresh);assert.deepEqual(result.progress.sessions,[]);}
  assert.equal(await db.progressSnapshot.count({where:{learnerId:fresh}}),0);
  const started=await json(path+'/sessions',{cookie,body:{requestId:randomUUID(),releaseId,lessonId:'family',mode:'lesson'}});
  const snapshots=await db.progressSnapshot.count({where:{learnerId:fresh}});assert.ok(snapshots>0);
  const after=await Promise.all(Array.from({length:8},()=>json(path+`/changes?cursor=${started.progress.revision}`,{cookie})));
  for(const result of after){assert.equal(result.reset,false);assert.deepEqual(result.patch,{});}
  assert.equal(await db.progressSnapshot.count({where:{learnerId:fresh}}),snapshots);
 });
 await t.test('ownership, Origin and bounded strict protocol',async()=>{
  assert.equal((await req(root+'/sync-streams',{cookie:other,body:{streamId:randomUUID(),sessionId:state.session.id}})).status,404);
  assert.equal((await req(root+'/events:batch',{cookie,from:'https://evil.test',body:{streamId,events:[]}})).status,403);
  assert.equal((await req(root+'/events:batch',{cookie,body:{streamId,events:[{...envelope(1,0),correct:true}]}})).status,400);
  assert.equal(Object.keys(plan.presentations).length,6);
  const same=await json(root+'/sync-streams',{cookie,body:{streamId,sessionId:state.session.id}});assert.deepEqual(same.presentations,plan.presentations);
 });
 await t.test('out-of-order reception waits, duplicate retries apply only once',async()=>{
  const first=envelope(1,0),second=envelope(2,1);
  let r=await batch([second]);assert.equal(r.nextSeq,1);assert.equal(r.receipts[0].status,'buffered');assert.equal(r.session.stepIndex,0);
  r=await batch([first]);assert.equal(r.nextSeq,3);assert.equal(r.session.stepIndex,2);assert.ok(r.receipts.every(x=>x.status==='applied'));
  const duplicates=await Promise.all([batch([first,second]),batch([second,first])]);assert.ok(duplicates.every(x=>x.session.stepIndex===2));
  assert.equal(await db.learningEvent.count({where:{learnerId:child,type:'advance'}}),2);
  assert.equal((await req(root+'/events:batch',{cookie,body:{streamId,events:[{...first,timeZone:'UTC'}]}})).status,409);
 });
 await t.test('two-device stale cursor preserves conflicting raw facts without overwriting',async()=>{
  await json(root+'/events',{cookie,body:{...envelope(3,2).command}});
  const stale=envelope(3,2);const r=await batch([stale,envelope(4,3)]);assert.equal(r.session.stepIndex,3);assert.equal(r.nextSeq,3);assert.equal(r.receipts.find(x=>x.seq===3).status,'conflict');assert.equal(r.receipts.find(x=>x.seq===4).status,'buffered');
  assert.equal((await db.syncEntry.findUnique({where:{streamId_seq:{streamId,seq:3}}})).payload.command.clientEventId,stale.command.clientEventId);
 });
 await t.test('revision changes return patches, unchanged reads are empty, unknown cursor resets',async()=>{
  const p=await json(root+'/progress',{cookie});let changes=await json(root+`/changes?cursor=${p.revision}`,{cookie});assert.deepEqual(changes.patch,{});
  await json(root+'/learning-settings',{cookie,method:'PATCH',body:{openAllCourses:true}});
  changes=await json(root+`/changes?cursor=${p.revision}`,{cookie});assert.equal(changes.patch.openAllCourses,true);assert.equal(changes.patch.sessions,undefined);
  const reset=await json(root+'/changes?cursor=0',{cookie});assert.equal(reset.reset,true);
 });
 await t.test('hint-before-answer is applied in sequence even when answer arrives first',async()=>{
  state=await json(root+'/sessions',{cookie,body:{requestId:randomUUID(),releaseId,lessonId:'family',mode:'lesson'}});
  for(let i=state.session.stepIndex;i<7;i++)state=await json(root+'/events',{cookie,body:{...envelope(1,state.session.revision).command}});
  const sid=randomUUID(),p=await json(root+'/sync-streams',{cookie,body:{streamId:sid,sessionId:state.session.id}}),rev=p.session.revision,pid=p.session.presentation.id;
  const hint=envelope(1,rev,'hint',{presentationId:pid}),answer=envelope(2,rev+1,'answer',{presentationId:pid,selectedId:'ba',skipped:false});
  let r=await json(root+'/events:batch',{cookie,body:{streamId:sid,events:[answer]}});assert.equal(r.nextSeq,1);
  r=await json(root+'/events:batch',{cookie,body:{streamId:sid,events:[hint]}});assert.equal(r.session.presentation.answer.prompted,true);assert.equal(r.session.presentation.answer.independent,false);assert.equal((await json(root+'/mistakes',{cookie})).items.length,0);
 });
 await t.test('invalid command rolls back effects and is retained as rejected',async()=>{
  const sid=randomUUID();const p=await json(root+'/sync-streams',{cookie,body:{streamId:sid,sessionId:state.session.id}});
  const r=await json(root+'/events:batch',{cookie,body:{streamId:sid,events:[envelope(1,p.session.revision,'hunt',{characterId:'wo'})]}});
  assert.equal(r.receipts[0].status,'rejected');assert.equal(r.session.revision,p.session.revision);
 });
 await t.test('legacy import deduplicates, restores known positions and never invents selected answers',async()=>{
  const id=(await json('/api/v1/learners',{cookie,body:{nickname:'导入'}})).id,base=`/api/v1/learners/${id}`;
  const raw={schemaVersion:1,contentVersion:1,started:true,completed:false,step:4,session:'legacy-session',sound:true,seen:['wo'],observations:{wo:'家长陪读'},attempts:[{id:'a',session:'s',step:'sound-wo',characterId:'wo',kind:'sound',correct:false,hintUsed:false,skipped:false,date:'2026-09-21',timestamp:1}]};
  const data={source:'legacy_import',progress:raw};const first=await json(base+'/imports',{cookie,body:data});assert.equal(first.progress.sessions[0].stepIndex,7);assert.equal(first.progress.sessions[0].presentation.answer,null);assert.deepEqual(first.progress.seen.includes('wo'),true);
  const duplicate=await json(base+'/imports',{cookie,body:data});assert.equal(duplicate.accepted,'duplicate');assert.equal(duplicate.progress.revision,first.progress.revision);
  assert.equal(await db.attempt.count({where:{presentation:{session:{learnerId:id}}}}),0);assert.equal((await json(base+'/mistakes',{cookie})).items.length,0);
  assert.equal((await db.legacyImport.findFirst({where:{learnerId:id}})).source,'legacy_import');
  const before=await db.legacyImport.count();assert.equal((await req(base+'/imports',{cookie,body:{source:'legacy_import',progress:{...raw,step:99}}})).status,400);assert.equal(await db.legacyImport.count(),before);
  assert.equal((await req(base+'/imports',{cookie:other,body:data})).status,404);
 });
 await t.test('delayed wrong answers are retained without rewriting mastery from client dates',async()=>{
  let current=(await json(root+'/progress',{cookie})).sessions[0];
  current=(await json(root+'/events',{cookie,body:{clientEventId:randomUUID(),sessionId:current.id,expectedRevision:current.revision,type:'advance'}})).session;
  const sid=randomUUID(),p=await json(root+'/sync-streams',{cookie,body:{streamId:sid,sessionId:current.id}}),pid=p.session.presentation.id;
  const reported='2000-01-01T00:00:00.000Z';
  const events=[{seq:1,occurredAt:reported,timeZone:'UTC',command:{clientEventId:randomUUID(),sessionId:current.id,expectedRevision:current.revision,type:'audio',presentationId:pid,result:'played'}},{seq:2,occurredAt:reported,timeZone:'UTC',command:{clientEventId:randomUUID(),sessionId:current.id,expectedRevision:current.revision+1,type:'answer',presentationId:pid,selectedId:'wo',skipped:false}}];
  const r=await json(root+'/events:batch',{cookie,body:{streamId:sid,events}});assert.equal(r.nextSeq,3);assert.equal(r.session.presentation.answer.correct,false);
  const attempt=await db.attempt.findUnique({where:{presentationId:pid},include:{event:true}});assert.equal(attempt.timeTrusted,false);assert.equal(attempt.event.occurredAt.toISOString(),reported);assert.equal(attempt.ruleVersion,2);
  assert.equal((await json(root+'/mistakes',{cookie})).items[0].wrongCount,1);
 });
 await t.test('new replay sends a deletion marker for the replaced resume session, not its history',async()=>{
  let current=(await json(root+'/progress',{cookie})).sessions[0];
  while(!current.completed){
   if(current.presentation&&!current.presentation.answer)current=(await json(root+'/events',{cookie,body:{clientEventId:randomUUID(),sessionId:current.id,expectedRevision:current.revision,type:'answer',presentationId:current.presentation.id,selectedId:null,skipped:true}})).session;
   current=(await json(root+'/events',{cookie,body:{clientEventId:randomUUID(),sessionId:current.id,expectedRevision:current.revision,type:'advance'}})).session;
  }
  const before=await json(root+'/progress',{cookie});await json(root+'/sessions',{cookie,body:{requestId:randomUUID(),releaseId,lessonId:'family',mode:'lesson'}});
  const changes=await json(root+`/changes?cursor=${before.revision}`,{cookie});assert.deepEqual(changes.deleted.sessionIds,[current.id]);assert.ok(await db.learningSession.findUnique({where:{id:current.id}}));
 });
 }finally{await db.$disconnect();}
});
