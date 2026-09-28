import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {database} from '../dist/db.js';
import {writeRelease} from '../dist/release-writer.js';
import {startLearning,applyLearningEvent,findSession,sessionDTO} from '../dist/learning-service.js';
import {prepareSync} from '../dist/sync-service.js';
const db=database();

test('homophones are safe in new lessons, offline plans, resumed old presentations and reviews',async()=>{
 try{
  const base=await db.contentRelease.findUniqueOrThrow({where:{id:'prototype-v4'}});
  const manifest=structuredClone(base.manifest);manifest.releaseId='test-homophones';
  const lesson=manifest.lessons.find(l=>l.id==='family');
  const texts=['他','她','人'];
  lesson.characters.forEach((c,i)=>{c.text=texts[i];c.word=['他的','她的','人们'][i];});
  await db.$transaction(tx=>writeRelease(tx,manifest),{timeout:30000});
  const account=await db.familyAccount.create({data:{name:'同音测试',email:'homophones@integration.test',emailVerified:true}});
  const child=await db.learner.create({data:{accountId:account.id,nickname:'同音孩子',learningReleaseId:manifest.releaseId}});
  let state=await startLearning(db,account.id,child.id,{requestId:randomUUID(),releaseId:manifest.releaseId,lessonId:'family',mode:'lesson'});
  const send=async(type,fields={})=>{state=await applyLearningEvent(db,account.id,child.id,{clientEventId:randomUUID(),sessionId:state.session.id,expectedRevision:state.session.revision,type,...fields});return state;};
  const plan=await prepareSync(db,account.id,child.id,randomUUID(),state.session.id);
  assert.deepEqual(plan.presentations['sound-wo'].options.map(o=>o.text).sort(),['人','他'].sort());
  assert.equal(plan.presentations['meaning-wo'].options.length,3);
  while(state.session.stepIndex<7)await send('advance');
  assert.equal(state.session.presentation.options.length,2);
  assert.equal(state.session.presentation.prompted,false);
  const presentationId=state.session.presentation.id;
  const original=lesson.characters.map(c=>({id:c.id,text:c.text,word:c.word,icon:c.icon}));
  // Simulate an already prepared, unsent question from the old app.
  await db.questionPresentation.update({where:{id:presentationId},data:{renderedOptions:original}});
  const view=sessionDTO(await findSession(db,child.id,state.session.id));
  assert.deepEqual(view.presentation.options.map(o=>o.text).sort(),['人','他'].sort());
  assert.equal(view.presentation.prompted,true);
  assert.deepEqual((await db.questionPresentation.findUniqueOrThrow({where:{id:presentationId}})).renderedOptions,original);
  await send('audio',{presentationId,result:'played'});
  // An old queued ambiguous choice is retained but never adds a mistake or mastery.
  await send('answer',{presentationId,selectedId:'ba',skipped:false});
  assert.equal(state.session.presentation.answer.prompted,true);
  assert.equal(state.session.presentation.answer.independent,false);
  assert.equal((await db.attempt.findUniqueOrThrow({where:{presentationId}})).ruleVersion,3);
  assert.equal(await db.mistakeItem.count({where:{learnerId:child.id}}),0);
  assert.deepEqual(state.session.presentation.options,original); // answered history stays intact
  const review=await startLearning(db,account.id,child.id,{requestId:randomUUID(),releaseId:manifest.releaseId,lessonId:'family',mode:'review',questionVersionId:state.session.presentation.questionVersionId});
  assert.equal(review.session.presentation.options.length,2);
  assert.equal(review.session.presentation.prompted,false);
  // Model a legacy custom lesson whose only alternatives have the same sound.
  await db.questionVersion.update({where:{id:review.session.presentation.questionVersionId},data:{options:original.slice(0,2)}});
  const assisted=await startLearning(db,account.id,child.id,{requestId:randomUUID(),releaseId:manifest.releaseId,lessonId:'family',mode:'review',questionVersionId:review.session.presentation.questionVersionId});
  assert.equal(assisted.session.presentation.options.length,1);
  assert.equal(assisted.session.presentation.prompted,true);
  const heard=await applyLearningEvent(db,account.id,child.id,{clientEventId:randomUUID(),sessionId:assisted.session.id,expectedRevision:0,type:'audio',presentationId:assisted.session.presentation.id,result:'played'});
  const answer=await applyLearningEvent(db,account.id,child.id,{clientEventId:randomUUID(),sessionId:heard.session.id,expectedRevision:heard.session.revision,type:'answer',presentationId:heard.session.presentation.id,selectedId:'wo',skipped:false});
  assert.equal(answer.session.presentation.answer.correct,true);
  assert.equal(answer.session.presentation.answer.independent,false);
 }finally{await db.$disconnect();}
});
