import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {database} from '../dist/db.js';
import {startLearning,applyLearningEvent,reviewQueue} from '../dist/learning-service.js';
import {dayInZone} from '../dist/learning-rules.js';
import {addReviewDays} from '@learnbuddy/contracts';
const db=database();
test('real answers schedule 1/3/7 independently; cooldown is shared, read-only and local-day bounded',async()=>{
 try{
  const {releaseId}=await db.contentChannel.findUniqueOrThrow({where:{id:'default'}});
  const account=await db.familyAccount.create({data:{name:'间隔测试',email:`spacing-${randomUUID()}@integration.test`,emailVerified:true}});
  const child=await db.learner.create({data:{accountId:account.id,nickname:'间隔',learningReleaseId:releaseId,learningTimeZone:'Pacific/Honolulu'}});
  const today=dayInZone(new Date(),child.learningTimeZone),key={learnerId:child.id,targetId:'wo',kind:'meaning'};
  await db.learningSkill.create({data:{...key,status:'practice',dueDate:'2000-01-01',questionVersionId:`${releaseId}:family:meaning-wo:v1`,ruleVersion:3}});
  const skill=()=>db.learningSkill.findUniqueOrThrow({where:{learnerId_targetId_kind:key}});
  const attempts={targetId:'wo',skillType:'meaning',presentation:{session:{learnerId:child.id}}};
  const answer=async({hint=false,skip=false,wrong=false}={})=>{
   let state=await startLearning(db,account.id,child.id,{requestId:randomUUID(),releaseId,lessonId:'family',mode:'review',questionVersionId:`${releaseId}:family:meaning-wo:v1`});
   const send=async(type,extra={})=>state=await applyLearningEvent(db,account.id,child.id,{clientEventId:randomUUID(),sessionId:state.session.id,expectedRevision:state.session.revision,type,...extra});
   if(hint)await send('hint',{presentationId:state.session.presentation.id});
   await send('answer',{presentationId:state.session.presentation.id,selectedId:skip?null:wrong?'ba':'wo',skipped:skip});
   return db.attempt.findUniqueOrThrow({where:{presentationId:state.session.presentation.id}});
  };
  const first=await answer();assert.equal((await skill()).dueDate,addReviewDays(today,1));
  const atDay=day=>new Date(`${day}T20:00:00Z`); // Noon in Honolulu, no DST.
  await db.attempt.update({where:{id:first.id},data:{createdAt:atDay(addReviewDays(today,-4))}});
  const second=await answer();assert.equal((await skill()).dueDate,addReviewDays(today,3));
  await db.attempt.update({where:{id:second.id},data:{createdAt:atDay(addReviewDays(today,-3))}});
  await answer();assert.equal((await skill()).dueDate,addReviewDays(today,7));
  await answer();assert.equal((await skill()).dueDate,addReviewDays(today,7));
  await answer({skip:true});assert.equal((await skill()).dueDate,addReviewDays(today,7));
  await answer({hint:true});assert.equal((await skill()).dueDate,addReviewDays(today,1));
  await answer();assert.equal((await skill()).dueDate,addReviewDays(today,1));
  // Force due only in this disposable database to prove cooldown, not due filtering.
  await db.learningSkill.update({where:{learnerId_targetId_kind:key},data:{dueDate:'2000-01-01'}});
  await db.learnerLesson.create({data:{learnerId:child.id,lessonId:'family'}});
  const before=await db.attempt.findMany({where:attempts,orderBy:{id:'asc'}});
  assert.equal((await reviewQueue(db,child.id)).items.length,0);
  assert.equal((await reviewQueue(db,child.id,'family')).items.length,0);
  assert.deepEqual(await db.attempt.findMany({where:attempts,orderBy:{id:'asc'}}),before);
  await db.attempt.updateMany({where:attempts,data:{createdAt:atDay(addReviewDays(today,-1))}});
  assert.equal((await reviewQueue(db,child.id)).items.length,1);
  assert.equal((await reviewQueue(db,child.id,'family')).items.length,1);
 }finally{await db.$disconnect();}
});
