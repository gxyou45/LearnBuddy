import {randomUUID} from 'node:crypto';
import {HTTPException} from 'hono/http-exception';
import {reviewRoundSchema,type ReviewRoundStart} from '@learnbuddy/contracts';
import type {Prisma} from './generated/prisma/client.js';
import type {database} from './db.js';
import {lockLearner,reviewQueue,startLearningTx,findSession,sessionDTO} from './learning-service.js';
type Tx=Prisma.TransactionClient;type Db=ReturnType<typeof database>;

export async function readReviewRound(tx:Tx,learnerId:string){
 const learner=await tx.learner.findUniqueOrThrow({where:{id:learnerId}});
 if(!learner.reviewRound)return {round:null,session:null};
 const round=reviewRoundSchema.parse(learner.reviewRound);
 if(round.closed)return {round,session:null};
 // Derive the cursor from durable session completion, never from a client index.
 for(let i=0;i<round.items.length;i++){
  const session=await findSession(tx,learnerId,round.items[i].sessionId);
  if(!session)throw new HTTPException(409,{message:'复习课次暂时无法读取，原题单已保留'});
  if(!session.completedAt)return {round:{...round,index:i},session:sessionDTO(session)};
 }
 return {round:{...round,index:round.items.length,closed:true},session:null};
}
export async function openReviewRound(db:Db,accountId:string,learnerId:string,input:ReviewRoundStart){
 return db.$transaction(async tx=>{
  const learner=await lockLearner(tx,learnerId,accountId);
  const old=await readReviewRound(tx,learnerId);
  if(old.round?.id===input.requestId){
   if(old.round.entry!==input.entry||old.round.lessonId!==(input.lessonId||null))throw new HTTPException(409,{message:'复习请求编号携带了不同内容'});
   return old;
  }
  if(old.round&&!old.round.closed)return old;
  if(await tx.learningEvent.findUnique({where:{learnerId_clientEventId:{learnerId,clientEventId:input.requestId}}}))throw new HTTPException(409,{message:'这次复习请求已经结束，请读取当前题单'});
  if(input.entry==='warmup'){
   const lesson=await tx.lessonVersion.findUnique({where:{releaseId_lessonId:{releaseId:learner.learningReleaseId||'',lessonId:input.lessonId!}}});
   if(!lesson)throw new HTTPException(400,{message:'请先选择可学习的课程'});
   const earlier=await tx.lessonVersion.findFirst({where:{releaseId:lesson.releaseId,position:{lt:lesson.position}},orderBy:{position:'desc'}});
   if(earlier&&!learner.openAllCourses&&!await tx.learnerLesson.findUnique({where:{learnerId_lessonId:{learnerId,lessonId:earlier.lessonId}}}))throw new HTTPException(400,{message:'请先完成上一课'});
  }
  const queue=await reviewQueue(tx,learnerId,input.entry==='comprehensive'?input.lessonId:undefined);
  const selected=queue.items.slice(0,input.entry==='warmup'?2:5);
  if(!selected.length)return {round:null,session:null};
  const items=[];
  for(const item of selected){
   const result=await startLearningTx(tx,accountId,learnerId,{requestId:randomUUID(),releaseId:item.releaseId,lessonId:item.lessonId,mode:'review',questionVersionId:item.questionVersionId});
   items.push({...item,sessionId:result.session.id});
   await tx.learningEvent.create({data:{learnerId,sessionId:result.session.id,clientEventId:items.length===1?input.requestId:randomUUID(),type:'review-round-member',payload:{roundId:input.requestId},occurredAt:new Date()}});
  }
  const round={id:input.requestId,entry:input.entry,lessonId:input.lessonId||null,items,index:0,closed:false};
  await tx.learner.update({where:{id:learnerId},data:{reviewRound:round}});
  return readReviewRound(tx,learnerId);
 },{timeout:30000});
}
export async function closeReviewRound(db:Db,accountId:string,learnerId:string,id:string){
 return db.$transaction(async tx=>{
  await lockLearner(tx,learnerId,accountId);const current=await readReviewRound(tx,learnerId);
  if(current.round?.id!==id)throw new HTTPException(409,{message:'复习题单已变化，请刷新后继续'});
  await tx.learner.update({where:{id:learnerId},data:{reviewRound:{...current.round,closed:true}}});
  return {round:{...current.round,closed:true},session:null};
 });
}
