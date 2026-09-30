import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {database} from '../dist/db.js';
import {openReviewRound,readReviewRound,closeReviewRound} from '../dist/review-round.js';
import {applyLearningEvent,learningProgress} from '../dist/learning-service.js';
import {exportFamily,purgeLearner} from '../dist/data-management.js';
const db=database();
test('fixed rounds resume across clients, reject stale changes, preserve answers and close without deleting history',async()=>{
 try{
  const channel=await db.contentChannel.findUniqueOrThrow({where:{id:'default'}}),release=await db.contentRelease.findUniqueOrThrow({where:{id:channel.releaseId}}),m=release.manifest;
  const account=await db.familyAccount.create({data:{name:'题单测试',email:`round-${randomUUID()}@integration.test`,emailVerified:true}});
  const child=await db.learner.create({data:{accountId:account.id,nickname:'固定复习',learningReleaseId:channel.releaseId}});
  for(const lesson of m.lessons.slice(0,3))for(const c of lesson.characters)await db.learningSkill.create({data:{learnerId:child.id,targetId:c.id,kind:'meaning',status:'practice',wrongCount:c.id==='wo'?9:1,dueDate:'2000-01-01',questionVersionId:`${channel.releaseId}:${lesson.id}:meaning-${c.id}:v1`,ruleVersion:3}});
  const before=await learningProgress(db,child.id),input={requestId:randomUUID(),entry:'garden'};
  const [first,second]=await Promise.all([openReviewRound(db,account.id,child.id,input),openReviewRound(db,account.id,child.id,{requestId:randomUUID(),entry:'garden'})]);
  assert.equal(first.round.id,second.round.id);assert.equal(first.round.items.length,5);
  assert.equal(await db.learningSession.count({where:{learnerId:child.id}}),5);
  assert.equal(await db.attempt.count({where:{presentation:{session:{learnerId:child.id}}}}),0);
  assert.deepEqual((await learningProgress(db,child.id)).sessions,before.sessions);
  await assert.rejects(()=>openReviewRound(db,randomUUID(),child.id,input));
  const session=first.session,p=session.presentation,wrong=p.options.find(o=>o.id!==first.round.items[0].targetId).id;
  const answer={clientEventId:randomUUID(),sessionId:session.id,expectedRevision:session.revision,type:'answer',presentationId:p.id,selectedId:wrong,skipped:false};
  const answered=await applyLearningEvent(db,account.id,child.id,answer);
  assert.equal((await applyLearningEvent(db,account.id,child.id,answer)).accepted,'duplicate');
  const restored=await readReviewRound(db,child.id);
  assert.deepEqual(restored.round.items,first.round.items);assert.deepEqual(restored.session.presentation.options,p.options);assert.equal(restored.session.presentation.answer.selectedId,wrong);
  await assert.rejects(()=>applyLearningEvent(db,account.id,child.id,{...answer,clientEventId:randomUUID(),type:'retry-answer',selectedId:first.round.items[0].targetId}));
  const corrected=await applyLearningEvent(db,account.id,child.id,{...answer,clientEventId:randomUUID(),expectedRevision:answered.session.revision,type:'retry-answer',selectedId:first.round.items[0].targetId});
  await applyLearningEvent(db,account.id,child.id,{clientEventId:randomUUID(),sessionId:session.id,expectedRevision:corrected.session.revision,type:'advance'});
  const next=await readReviewRound(db,child.id);assert.equal(next.round.index,1);assert.equal(next.session.id,first.round.items[1].sessionId);
  const future=await db.learningSession.findUniqueOrThrow({where:{id:first.round.items[2].sessionId},include:{presentations:true}});
  await assert.rejects(()=>applyLearningEvent(db,account.id,child.id,{clientEventId:randomUUID(),sessionId:future.id,expectedRevision:0,type:'answer',presentationId:future.presentations[0].id,selectedId:null,skipped:true}));
  await assert.rejects(()=>closeReviewRound(db,account.id,child.id,randomUUID()));
  await closeReviewRound(db,account.id,child.id,first.round.id);await closeReviewRound(db,account.id,child.id,first.round.id);
  assert.equal((await readReviewRound(db,child.id)).round.closed,true);
  await assert.rejects(()=>applyLearningEvent(db,account.id,child.id,{clientEventId:randomUUID(),sessionId:next.session.id,expectedRevision:0,type:'hint',presentationId:next.session.presentation.id}));
  assert.equal(await db.attempt.count({where:{presentation:{session:{learnerId:child.id}}}}),1);
  const exported=await exportFamily(db,account.id);assert.equal(exported.learners[0].profile.reviewRound.id,first.round.id);
  await db.learnerLesson.create({data:{learnerId:child.id,lessonId:m.lessons[0].id}});
  const warmup=await openReviewRound(db,account.id,child.id,{requestId:randomUUID(),entry:'warmup',lessonId:m.lessons[1].id});
  assert.equal(warmup.round.items.length,2);assert.equal(warmup.round.entry,'warmup');assert.equal(warmup.round.lessonId,m.lessons[1].id);
  assert.ok(warmup.round.items.every(x=>x.targetId!==first.round.items[0].targetId));
  await closeReviewRound(db,account.id,child.id,(await readReviewRound(db,child.id)).round.id);
  // Either concurrent request may win; only the stored round ID is a used request.
  await assert.rejects(()=>openReviewRound(db,account.id,child.id,{...input,requestId:first.round.id}));
  await db.$transaction(tx=>purgeLearner(tx,account.id,child.id));assert.equal(await db.learner.count({where:{id:child.id}}),0);
 }finally{await db.$disconnect();}
});
