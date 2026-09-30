import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {database} from '../dist/db.js';
import {reviewQueue} from '../dist/learning-service.js';
const db=database();
test('review selection is bounded, unique, task-specific and read-only across both entry points',async()=>{
 try{
  const channel=await db.contentChannel.findUniqueOrThrow({where:{id:'default'}});
  const release=await db.contentRelease.findUniqueOrThrow({where:{id:channel.releaseId}}),m=release.manifest;
  const account=await db.familyAccount.create({data:{name:'选题测试',email:`review-${randomUUID()}@integration.test`,emailVerified:true}});
  const child=await db.learner.create({data:{accountId:account.id,nickname:'少量复习',learningReleaseId:channel.releaseId}});
  const rows=m.lessons.slice(0,3).flatMap(lesson=>lesson.characters.map(character=>({lesson,character})));
  for(const [i,{lesson,character}] of rows.entries())for(const kind of ['sound','meaning']){
   await db.learningSkill.create({data:{learnerId:child.id,targetId:character.id,kind,status:i===0?'practice':'consolidating',wrongCount:i===0&&kind==='meaning'?2:0,dueDate:'2000-01-01',questionVersionId:`${channel.releaseId}:${lesson.id}:${kind}-${character.id}:v1`,ruleVersion:3}});
  }
  const before=await db.learningSkill.findMany({where:{learnerId:child.id},orderBy:[{targetId:'asc'},{kind:'asc'}]});
  const garden=await reviewQueue(db,child.id);
  assert.equal(garden.items.length,5);assert.equal(new Set(garden.items.map(x=>x.targetId)).size,5);
  assert.equal(garden.items[0].targetId,rows[0].character.id);assert.equal(garden.items[0].kind,'meaning');
  assert.deepEqual(await db.learningSkill.findMany({where:{learnerId:child.id},orderBy:[{targetId:'asc'},{kind:'asc'}]}),before);
  await assert.rejects(()=>reviewQueue(db,child.id,m.lessons[0].id));
  await db.learnerLesson.create({data:{learnerId:child.id,lessonId:m.lessons[0].id}});
  const mixed=await reviewQueue(db,child.id,m.lessons[0].id),own=new Set(m.lessons[0].characters.map(c=>c.id));
  assert.equal(mixed.items.length,5);assert.equal(mixed.items.filter(x=>own.has(x.targetId)).length,2);
  assert.equal(mixed.items.filter(x=>!own.has(x.targetId)).length,3);
  assert.equal(new Set(mixed.items.map(x=>x.targetId)).size,5);
  assert.equal(await db.learningSession.count({where:{learnerId:child.id}}),0);
  assert.equal(await db.learningEvent.count({where:{learnerId:child.id}}),0);
 }finally{await db.$disconnect();}
});
