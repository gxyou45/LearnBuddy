import {isCompatibleExpansion,validateManifest} from '@learnbuddy/contracts';
import {randomInt} from 'node:crypto';
import {HTTPException} from 'hono/http-exception';
import type {ContentManifest,LearningCommand,StartLearning,LearningSessionState,LearningProgressState} from '@learnbuddy/contracts';
import type {Prisma} from './generated/prisma/client.js';
import type {database} from './db.js';
import {RULE_VERSION,dayInZone,nextDay,independent,skillStatus,characterStable} from './learning-rules.js';
type Tx=Prisma.TransactionClient;
type Db=ReturnType<typeof database>;
const conflict=(message='这节课已在其他页面更新，请读取最新进度后继续')=>new HTTPException(409,{message});
const missing=()=>new HTTPException(404,{message:'没有找到该孩子的学习记录'});
const invalid=(message:string)=>new HTTPException(400,{message});
const includes={lesson:{include:{steps:{include:{question:true},orderBy:{position:'asc' as const}}}},presentations:{include:{attempts:true}}};
type Session=NonNullable<Awaited<ReturnType<typeof findSession>>>;
export async function findSession(tx:Tx,learnerId:string,id:string){return tx.learningSession.findFirst({where:{id,learnerId},include:includes});}
export async function lockLearner(tx:Tx,learnerId:string,accountId:string) {
 await tx.$queryRaw`SELECT id FROM "Learner" WHERE id=${learnerId}::uuid FOR UPDATE`;
 const learner=await tx.learner.findFirst({where:{id:learnerId,accountId}});if(!learner)throw missing();return learner;
}
export function canonical(value:unknown):string {if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';if(value&&typeof value==='object')return '{'+Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>JSON.stringify(k)+':'+canonical(v)).join(',')+'}';return JSON.stringify(value);}
function currentPresentation(s:Session){return s.presentations.find(p=>p.questionVersionId===s.lesson.steps[s.currentStep]?.question?.id);}
export function sessionDTO(s:Session):LearningSessionState {
 const p=currentPresentation(s),a=p?.attempts[0],step=s.lesson.steps[s.currentStep];
 return {id:s.id,lessonId:s.lesson.lessonId,releaseId:s.lesson.releaseId,mode:s.mode as 'lesson'|'review',revision:s.revision,stepIndex:s.currentStep,stepId:(step.config as {id:string}).id,completed:!!s.completedAt,huntFound:s.huntFound as string[],presentation:p?{id:p.id,questionVersionId:p.questionVersionId,options:p.renderedOptions as {id:string;text:string;word:string;icon:string}[],prompted:p.prompted,audioHeard:p.audioHeard,audioFailed:p.audioFailed,answer:a?{selectedId:(a.answer as {selectedId:string|null}).selectedId,correct:a.correct,skipped:a.skipped,prompted:a.prompted,audioFailed:a.audioFailed,independent:independent(a)}:null}:null};
}
export async function ensurePresentation(tx:Tx,s:Session) {
 const step=s.lesson.steps[s.currentStep];if(!['sound','meaning'].includes(step.kind)||!step.question||currentPresentation(s))return;
 const options=structuredClone(step.question.options) as {id:string;text:string;word:string;icon:string}[];
 for(let i=options.length-1;i>0;i--){const j=randomInt(i+1);[options[i],options[j]]=[options[j],options[i]];}
 await tx.questionPresentation.create({data:{sessionId:s.id,questionVersionId:step.question.id,renderedOptions:options}});
}
export async function learningProgress(tx:Tx,learnerId:string):Promise<LearningProgressState> {
 const learner=await tx.learner.findUniqueOrThrow({where:{id:learnerId}});
 // Only the newest formal session per lesson is used for continuing. Completion is separate.
 const rows=await tx.learningSession.findMany({where:{learnerId,mode:'lesson',requestId:{not:null}},orderBy:[{lastActiveAt:'desc'},{id:'desc'}],include:includes});
 const latest=rows.filter((s,i)=>rows.findIndex(x=>x.lesson.lessonId===s.lesson.lessonId)===i);
 const completion=await tx.learnerLesson.findMany({where:{learnerId}});
 const skills=await tx.learningSkill.findMany({where:{learnerId}});
 const progress=await tx.learningProgress.findMany({where:{learnerId}});
 const imported=await tx.legacyImport.findMany({where:{learnerId},select:{raw:true}});
 const seen=new Set<string>(imported.flatMap(i=>(i.raw as {seen?:string[]}).seen||[]));
 for(const s of rows){const l=s.lesson.content as ContentManifest['lessons'][number];for(let i=0;i<=s.currentStep;i++){const step=l.steps[i];if(step?.kind==='teach'&&step.characterId)seen.add(step.characterId);}}
 return {learnerId,revision:learner.learningRevision,releaseId:learner.learningReleaseId,timeZone:learner.learningTimeZone,activeSessionId:latest[0]?.id??null,openAllCourses:learner.openAllCourses,sessions:latest.map(sessionDTO),completedLessons:completion.map(l=>l.lessonId),seen:[...seen],skills:skills.map(s=>({targetId:s.targetId,wrongCount:s.wrongCount,dueDate:s.dueDate,ruleVersion:s.ruleVersion,kind:s.kind as 'sound'|'meaning',status:s.status as 'practice'|'consolidating'|'stable'})),characters:[...seen].map(id=>({id,status:progress.find(p=>p.characterId===id)?.mastery===1?'较稳定':skills.some(s=>s.targetId===id)?'练习中':'已接触'}))};
}
async function result(tx:Tx,learnerId:string,sessionId:string,accepted:'applied'|'duplicate') {
 const session=await findSession(tx,learnerId,sessionId);if(!session)throw missing();
 const progress=await learningProgress(tx,learnerId);await saveSnapshot(tx,progress);
 return {accepted,session:sessionDTO(session),progress};
}
export async function startLearning(db:Db,accountId:string,learnerId:string,input:StartLearning) {
 return db.$transaction(async tx=>{
  const learner=await lockLearner(tx,learnerId,accountId);
  const replay=await tx.learningEvent.findUnique({where:{learnerId_clientEventId:{learnerId,clientEventId:input.requestId}}});
  if(replay){if(replay.type!=='session-start'||canonical(replay.payload)!==canonical(input))throw conflict('相同请求编号携带了不同内容');return result(tx,learnerId,replay.sessionId,'duplicate');}
  if(learner.learningReleaseId&&learner.learningReleaseId!==input.releaseId){
   const current=await tx.contentRelease.findUniqueOrThrow({where:{id:learner.learningReleaseId}});
   const requested=await tx.contentRelease.findUnique({where:{id:input.releaseId}});
   if(!requested||!isCompatibleExpansion(validateManifest(current.manifest),validateManifest(requested.manifest)))throw conflict('此档案已经绑定原课程版本，请重新加载');
  }
  const lesson=await tx.lessonVersion.findUnique({where:{releaseId_lessonId:{releaseId:input.releaseId,lessonId:input.lessonId}},include:{steps:{orderBy:{position:'asc'},include:{question:true}}}});
  if(!lesson)throw missing();
  // Fresh profiles start from the active release, not a caller-supplied obsolete snapshot.
  if(!learner.learningReleaseId&&(await tx.contentChannel.findUniqueOrThrow({where:{id:'default'}})).releaseId!==input.releaseId)throw conflict('课程已更新，请重新加载');
  let currentStep=0;
  if(input.mode==='review') {
   currentStep=lesson.steps.findIndex(s=>s.question?.id===input.questionVersionId&&['sound','meaning'].includes(s.kind));
   if(currentStep<0)throw invalid('复习题目无效');
   const config=lesson.steps[currentStep].config as {characterId:string};
   if(!await tx.learningSkill.findUnique({where:{learnerId_targetId_kind:{learnerId,targetId:config.characterId,kind:lesson.steps[currentStep].kind}}}))throw invalid('请先学习这个字');
  }else{
   if(input.questionVersionId)throw invalid('正式课程不能指定复习题目');
   const earlier=await tx.lessonVersion.findFirst({where:{releaseId:input.releaseId,position:{lt:lesson.position}},orderBy:{position:'desc'}});
   if(earlier&&!learner.openAllCourses&&!await tx.learnerLesson.findUnique({where:{learnerId_lessonId:{learnerId,lessonId:earlier.lessonId}}}))throw invalid('请先完成上一课');
  }
  let session=input.mode==='lesson'?await tx.learningSession.findFirst({where:{learnerId,lesson:{lessonId:input.lessonId},mode:'lesson',completedAt:null,requestId:{not:null}},orderBy:{lastActiveAt:'desc'},include:includes}):null;
  if(!session)session=await tx.learningSession.create({data:{learnerId,lessonVersionId:lesson.id,mode:input.mode,requestId:input.requestId,currentStep,reviewStepId:input.mode==='review'?(lesson.steps[currentStep].config as {id:string}).id:null},include:includes});
  await ensurePresentation(tx,session);
  await tx.learningSession.update({where:{id:session.id},data:{lastActiveAt:new Date()}});
  await tx.learner.update({where:{id:learnerId},data:{learningReleaseId:learner.learningReleaseId||input.releaseId,learningRevision:{increment:1}}});
  await tx.learningEvent.create({data:{learnerId,sessionId:session.id,clientEventId:input.requestId,type:'session-start',payload:input,occurredAt:new Date()}});
  return result(tx,learnerId,session.id,'applied');
 },{timeout:20000});
}
export async function applyLearningEvent(db:Db,accountId:string,learnerId:string,input:LearningCommand) {
 return db.$transaction(tx=>applyLearningEventTx(tx,accountId,learnerId,input),{timeout:20000});
}
export async function applyLearningEventTx(tx:Tx,accountId:string,learnerId:string,input:LearningCommand,reportedAt?:Date) {
  const learner=await lockLearner(tx,learnerId,accountId);
  const replay=await tx.learningEvent.findUnique({where:{learnerId_clientEventId:{learnerId,clientEventId:input.clientEventId}}});
  if(replay){if(canonical(replay.payload)!==canonical(input))throw conflict('相同事件编号携带了不同内容');return result(tx,learnerId,replay.sessionId,'duplicate');}
  const session=await findSession(tx,learnerId,input.sessionId);if(!session)throw missing();
  const step=session.lesson.steps[session.currentStep],p=currentPresentation(session);
  if(input.type==='answer') {
   const presented=session.presentations.find(p=>p.id===input.presentationId);if(!presented)throw missing();
   const old=presented.attempts[0];
   if(old){const answer=old.answer as {selectedId:string|null};if(answer.selectedId!==input.selectedId||old.skipped!==input.skipped)throw conflict('这道题已经提交，不能覆盖原答案');return result(tx,learnerId,session.id,'duplicate');}
  }
  if(session.completedAt||session.revision!==input.expectedRevision)throw conflict();
  if(['answer','hint','audio'].includes(input.type)&&(!p||!('presentationId' in input)||p.id!==input.presentationId))throw invalid('请先显示当前题目');
  if((input.type==='hint'||input.type==='audio')&&p!.attempts.length)throw conflict('答案已保存，请继续下一步');
  const now=new Date();
  const event=await tx.learningEvent.create({data:{learnerId,sessionId:session.id,clientEventId:input.clientEventId,type:input.type,payload:input,occurredAt:reportedAt||now}});
  if(input.type==='hint')await tx.questionPresentation.update({where:{id:p!.id},data:{prompted:true}});
  if(input.type==='audio')await tx.questionPresentation.update({where:{id:p!.id},data:input.result==='played'?{audioHeard:true}:{audioFailed:true}});
  if(input.type==='answer') {
   if(input.skipped?input.selectedId!==null:input.selectedId===null)throw invalid('跳过和实际选择不一致');
   const options=p!.renderedOptions as {id:string}[];
   if(input.selectedId!==null&&!options.some(o=>o.id===input.selectedId))throw invalid('答案不在本次选项中');
   const correct=!input.skipped&&(step.question!.answer as string[]).includes(input.selectedId!);
   const targetId=(step.config as {characterId:string}).characterId;
   const attempt=await tx.attempt.create({data:{eventId:event.id,sessionId:session.id,presentationId:p!.id,answer:{selectedId:input.selectedId},correct,prompted:p!.prompted,skipped:input.skipped,audioHeard:p!.audioHeard,audioFailed:p!.audioFailed,targetId,skillType:step.kind,timeTrusted:!reportedAt||(Math.abs(now.getTime()-reportedAt.getTime())<120000),ruleVersion:RULE_VERSION}});
   const valid=independent(attempt),wrong=valid&&!correct;
   const prior=await tx.learningSkill.findUnique({where:{learnerId_targetId_kind:{learnerId,targetId,kind:step.kind}}});
   const recent=await tx.attempt.findMany({where:{targetId,skillType:step.kind,timeTrusted:true,prompted:false,skipped:false,audioFailed:false,OR:[{skillType:'meaning'},{audioHeard:true}],presentation:{session:{learnerId}}},orderBy:[{createdAt:'desc'},{id:'desc'}],take:6});
   const status=valid&&attempt.timeTrusted?skillStatus(recent,learner.learningTimeZone):prior?.status??'practice';
   const dueDate=valid&&attempt.timeTrusted||!prior?nextDay(dayInZone(now,learner.learningTimeZone)):prior.dueDate;
   await tx.learningSkill.upsert({where:{learnerId_targetId_kind:{learnerId,targetId,kind:step.kind}},create:{learnerId,targetId,kind:step.kind,status,dueDate,wrongCount:wrong?1:0,questionVersionId:p!.questionVersionId,ruleVersion:RULE_VERSION},update:{status,dueDate,wrongCount:{increment:wrong?1:0},questionVersionId:p!.questionVersionId,ruleVersion:RULE_VERSION}});
   if(wrong)await tx.mistakeItem.upsert({where:{learnerId_questionVersionId:{learnerId,questionVersionId:p!.questionVersionId}},create:{learnerId,questionVersionId:p!.questionVersionId,targetId,kind:step.kind,latestWrongAttemptId:attempt.id},update:{wrongCount:{increment:1},status,lastWrongAt:now,latestWrongAttemptId:attempt.id}});
   if(valid&&attempt.timeTrusted)await tx.mistakeItem.updateMany({where:{learnerId,targetId,kind:step.kind},data:{status}});
   const allRecent=await tx.attempt.findMany({where:{targetId,timeTrusted:true,prompted:false,skipped:false,audioFailed:false,OR:[{skillType:'meaning'},{audioHeard:true}],presentation:{session:{learnerId}}},orderBy:[{createdAt:'desc'},{id:'desc'}],take:6});
   const mastery=characterStable(allRecent,learner.learningTimeZone)?1:0;
   const oldProgress=await tx.learningProgress.findUnique({where:{learnerId_characterId:{learnerId,characterId:targetId}}});
   await tx.learningProgress.upsert({where:{learnerId_characterId:{learnerId,characterId:targetId}},create:{learnerId,characterId:targetId,mastery,wrongCount:wrong?1:0},update:{mastery:valid&&attempt.timeTrusted?mastery:oldProgress?.mastery??0,wrongCount:{increment:wrong?1:0}}});
  }
  if(input.type==='hunt') {
   const lesson=session.lesson.content as ContentManifest['lessons'][number];
   if(step.kind!=='hunt'||!lesson.characters.some(c=>c.id===input.characterId))throw invalid('找字目标不属于本课');
   await tx.learningSession.update({where:{id:session.id},data:{huntFound:[...new Set([...(session.huntFound as string[]),input.characterId])]}});
  }
  if(input.type==='advance') {
   if(['sound','meaning'].includes(step.kind)&&!p?.attempts.length)throw invalid('请先作答或跳过');
   const completed=session.mode==='review'||session.currentStep===session.lesson.steps.length-1;
   await tx.learningSession.update({where:{id:session.id},data:completed?{completedAt:now}:{currentStep:{increment:1}}});
   if(completed&&session.mode==='lesson')await tx.learnerLesson.upsert({where:{learnerId_lessonId:{learnerId,lessonId:session.lesson.lessonId}},create:{learnerId,lessonId:session.lesson.lessonId},update:{lastCompletedAt:now}});
   if(!completed)await ensurePresentation(tx,(await findSession(tx,learnerId,session.id))!);
  }
  await tx.learningSession.update({where:{id:session.id},data:{revision:{increment:1},lastActiveAt:now}});
  await tx.learner.update({where:{id:learnerId},data:{learningRevision:{increment:1}}});
  return result(tx,learnerId,session.id,'applied');
}
export async function reviewQueue(tx:Tx,learnerId:string,lessonId?:string) {
 const learner=await tx.learner.findUniqueOrThrow({where:{id:learnerId}}),today=dayInZone(new Date(),learner.learningTimeZone);
 let rows=await tx.learningSkill.findMany({where:{learnerId,...(lessonId?{}:{dueDate:{lte:today}})},orderBy:[{wrongCount:'desc'},{dueDate:'asc'},{targetId:'asc'},{kind:'asc'}],take:lessonId?2000:30});
 if(lessonId){
  if(!await tx.learnerLesson.findUnique({where:{learnerId_lessonId:{learnerId,lessonId}}}))throw invalid('请先完成本课再综合练习');
  const lesson=await tx.lessonVersion.findUnique({where:{releaseId_lessonId:{releaseId:learner.learningReleaseId!,lessonId}}});
  if(!lesson)throw missing();const targets=new Set((lesson.content as ContentManifest['lessons'][number]).characters.map(c=>c.id));
  const unique=(list:typeof rows)=>list.filter((s,i,all)=>all.findIndex(x=>x.targetId===s.targetId)===i);
  const current=unique(rows.filter(s=>targets.has(s.targetId))).slice(0,2);
  const history=unique(rows.filter(s=>!targets.has(s.targetId)&&(s.status!=='stable'&&s.wrongCount>0||s.dueDate<=today))).slice(0,3);
  rows=[...current,...history];
 }
 const items=[];
 for(const s of rows){const question=await tx.questionVersion.findUniqueOrThrow({where:{id:s.questionVersionId},include:{step:{include:{lesson:true}}}});items.push({targetId:s.targetId,kind:s.kind,dueDate:s.dueDate,questionVersionId:s.questionVersionId,lessonId:question.step.lesson.lessonId,releaseId:question.step.lesson.releaseId,ruleVersion:s.ruleVersion});}
 return {today,timeZone:learner.learningTimeZone,items};
}
export async function mistakes(tx:Tx,learnerId:string,cursor?:string,status='active') {
 const rows=await tx.mistakeItem.findMany({where:{learnerId,...(cursor?{id:{gt:cursor}}:{}),...(status==='active'?{status:{not:'stable'}}:{})},orderBy:{id:'asc'},take:21,include:{latestWrongAttempt:{include:{presentation:{include:{question:{include:{step:{include:{lesson:true}}}}}}}}}});
 const items=rows.slice(0,20).map(m=>{const p=m.latestWrongAttempt.presentation,q=p.question;return {id:m.id,questionVersionId:m.questionVersionId,targetId:m.targetId,kind:m.kind,status:m.status,wrongCount:m.wrongCount,lastWrongAt:m.lastWrongAt.toISOString(),releaseId:q.step.lesson.releaseId,lessonId:q.step.lesson.lessonId,selectedId:(m.latestWrongAttempt.answer as {selectedId:string|null}).selectedId,correctIds:q.answer,options:p.renderedOptions};});
 return {items,nextCursor:rows.length>20?items.at(-1)!.id:null};
}
export async function setLearningSettings(db:Db,accountId:string,learnerId:string,openAllCourses:boolean) {
 return db.$transaction(async tx=>{await lockLearner(tx,learnerId,accountId);await tx.learner.update({where:{id:learnerId},data:{openAllCourses,learningRevision:{increment:1}}});const state=await learningProgress(tx,learnerId);await saveSnapshot(tx,state);return state;});
}

export async function saveSnapshot(tx:Tx,state:LearningProgressState) {
 await tx.progressSnapshot.upsert({where:{learnerId_revision:{learnerId:state.learnerId,revision:state.revision}},create:{learnerId:state.learnerId,revision:state.revision,state:JSON.parse(JSON.stringify(state))},update:{}});
}
