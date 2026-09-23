import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {database} from '../dist/db.js';
import {writeRelease} from '../dist/release-writer.js';
import {upgradeCurriculum} from '../dist/curriculum-upgrade.js';
import {startLearning,applyLearningEvent,reviewQueue} from '../dist/learning-service.js';
import {prepareSync,syncBatch} from '../dist/sync-service.js';
import {validateManifest,isCompatibleExpansion} from '@learnbuddy/contracts';
const db=database();
test('additive curriculum upgrade preserves pinned sessions, offline events and review questions',async t=>{
 let channel;
 try {
 channel=await db.contentChannel.findUniqueOrThrow({where:{id:'default'}});
 const base=validateManifest((await db.contentRelease.findUniqueOrThrow({where:{id:channel.releaseId}})).manifest);
 const next=structuredClone(base);next.releaseId='test-curriculum-expansion';
 const a=await db.familyAccount.create({data:{name:'课程测试',email:'curriculum@integration.test',emailVerified:true}});
 const child=await db.learner.create({data:{accountId:a.id,nickname:'升级保留'}});
 const id=child.id;
 let first=await startLearning(db,a.id,id,{requestId:randomUUID(),releaseId:base.releaseId,lessonId:'family',mode:'lesson'});
 first=await applyLearningEvent(db,a.id,id,{clientEventId:randomUUID(),sessionId:first.session.id,expectedRevision:0,type:'advance'});
 const stream=await prepareSync(db,a.id,id,randomUUID(),first.session.id);
 const lesson=structuredClone(base.lessons[0]);lesson.id='test-extension';lesson.theme=3;
 lesson.characters=[...base.lessons[0].characters,...base.lessons[1].characters.slice(0,2)].map(c=>({...c,id:'extra-'+c.id}));
 for(const c of lesson.characters){const original=base.assets.find(a=>a.id==='audio-word-'+c.id.replace('extra-',''));next.assets.push({...original,id:'audio-word-'+c.id});}
 // Deliberate shared word to verify both question kinds exclude ambiguous distractors.
 lesson.characters[1].word=lesson.characters[0].word;
 lesson.steps=[{...base.lessons[0].steps[0]},...['teach','word','sound','meaning'].flatMap(kind=>lesson.characters.map(c=>({id:kind+'-'+c.id,kind,characterId:c.id,title:kind,subtitle:'',audio:kind==='word'?'word-'+c.id:kind==='meaning'?'meaning':c.audio}))),{...base.lessons[0].steps.find(s=>s.kind==='hunt')},{...base.lessons[0].steps.at(-1)}];
 next.lessons.push(lesson);next.themes.push({...base.themes[0],id:'expansion-theme',order:3});next.huntScenes.push({...base.huntScenes[0],id:'expansion-scene',themeIds:['expansion-theme'],slots:[{id:'a',x:20,y:20,clue:'a'},{id:'b',x:70,y:20,clue:'b'},{id:'c',x:45,y:50,clue:'c'},{id:'d',x:20,y:80,clue:'d'},{id:'e',x:70,y:80,clue:'e'}]});
 assert.equal(isCompatibleExpansion(next,base),true);
 await db.$transaction(tx=>writeRelease(tx,validateManifest(next)),{timeout:60000});
 await db.contentChannel.update({where:{id:'default'},data:{releaseId:next.releaseId,revision:{increment:1}}});
 await t.test('upgrade is idempotent and keeps old session identity, position and question versions',async()=>{
  const upgraded=await upgradeCurriculum(db,a.id,id,base.releaseId);assert.equal(upgraded.releaseId,next.releaseId);assert.equal(upgraded.sessions[0].id,first.session.id);assert.equal(upgraded.sessions[0].stepIndex,1);assert.equal(upgraded.sessions[0].releaseId,base.releaseId);
  assert.equal((await upgradeCurriculum(db,a.id,id,base.releaseId)).revision,upgraded.revision);
  const resumed=await startLearning(db,a.id,id,{requestId:randomUUID(),releaseId:next.releaseId,lessonId:'family',mode:'lesson'});assert.equal(resumed.session.id,first.session.id);
 });
 await t.test('an already prepared offline event remains applicable after upgrade',async()=>{
  const result=await syncBatch(db,a.id,id,stream.streamId,[{seq:1,occurredAt:new Date().toISOString(),timeZone:'Asia/Shanghai',command:{type:'advance',clientEventId:randomUUID(),sessionId:first.session.id,expectedRevision:1}}]);assert.equal(result.receipts[0].status,'applied');assert.equal(result.session.stepIndex,2);assert.equal(result.progress.releaseId,next.releaseId);
 });
 await t.test('new lesson stays locked; five-character questions have unambiguous word options',async()=>{
  await assert.rejects(()=>startLearning(db,a.id,id,{requestId:randomUUID(),releaseId:next.releaseId,lessonId:lesson.id,mode:'lesson'}));
  await db.learner.update({where:{id},data:{openAllCourses:true}});
  let s=await startLearning(db,a.id,id,{requestId:randomUUID(),releaseId:next.releaseId,lessonId:lesson.id,mode:'lesson'});
  while(!s.session.completed){const p=s.session.presentation;if(p&&!p.answer){assert.equal(new Set(p.options.map(o=>o.word)).size,p.options.length);s=await applyLearningEvent(db,a.id,id,{type:'answer',clientEventId:randomUUID(),sessionId:s.session.id,expectedRevision:s.session.revision,presentationId:p.id,selectedId:null,skipped:true});}s=await applyLearningEvent(db,a.id,id,{type:'advance',clientEventId:randomUUID(),sessionId:s.session.id,expectedRevision:s.session.revision});}
  assert.ok(s.progress.completedLessons.includes(lesson.id));await db.learningSkill.create({data:{learnerId:id,targetId:'wo',kind:'sound',status:'practice',dueDate:'2099-01-01',wrongCount:1,questionVersionId:`${base.releaseId}:family:sound-wo:v1`,ruleVersion:1}});const review=await reviewQueue(db,id,lesson.id);assert.equal(review.items.length,3);assert.ok(review.items.some(q=>q.targetId==='wo'));
  const q=review.items.find(q=>q.targetId==='wo');const r=await startLearning(db,a.id,id,{requestId:randomUUID(),releaseId:q.releaseId,lessonId:q.lessonId,mode:'review',questionVersionId:q.questionVersionId});assert.equal(r.session.mode,'review');assert.equal(r.session.releaseId,base.releaseId);assert.equal(r.progress.releaseId,next.releaseId);
 });
 await t.test('a rewritten release cannot silently replace an existing learner curriculum',async()=>{
  const edited=structuredClone(next);edited.releaseId='test-curriculum-incompatible';edited.lessons[0].title='改写旧课';await db.$transaction(tx=>writeRelease(tx,edited),{timeout:60000});await db.contentChannel.update({where:{id:'default'},data:{releaseId:edited.releaseId}});
  const s=await upgradeCurriculum(db,a.id,id,next.releaseId);assert.equal(s.releaseId,next.releaseId);
 });
 } finally {if(channel)await db.contentChannel.update({where:{id:'default'},data:{releaseId:channel.releaseId,revision:{increment:1}}});await db.$disconnect();}
});
