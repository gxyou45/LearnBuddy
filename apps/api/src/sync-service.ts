import {HTTPException} from 'hono/http-exception';
import type {Prisma} from './generated/prisma/client.js';
import type {database} from './db.js';
import type {SyncEnvelope,LearningProgressState} from '@learnbuddy/contracts';
import {lockLearner,findSession,sessionDTO,ensurePresentation,learningProgress,saveSnapshot,canonical,applyLearningEventTx} from './learning-service.js';
type Db=ReturnType<typeof database>;type Tx=Prisma.TransactionClient;
const fail=(message:string)=>new HTTPException(409,{message});
export async function prepareSync(db:Db,accountId:string,learnerId:string,streamId:string,sessionId:string) {
 return db.$transaction(async tx=>{
  await lockLearner(tx,learnerId,accountId);const session=await findSession(tx,learnerId,sessionId);if(!session||!session.requestId)throw new HTTPException(404,{message:'课次不存在'});
  const existing=await tx.syncStream.findUnique({where:{id:streamId}});
  if(existing&&(existing.learnerId!==learnerId||existing.sessionId!==sessionId))throw fail('同步编号已用于其他课次');
  const stream=existing||await tx.syncStream.create({data:{id:streamId,learnerId,sessionId}});
  for(let i=0;i<session.lesson.steps.length;i++)await ensurePresentation(tx,{...session,currentStep:i});
  const fresh=(await findSession(tx,learnerId,sessionId))!;
  const presentations:Record<string,unknown>={};for(let i=0;i<fresh.lesson.steps.length;i++){const s=sessionDTO({...fresh,currentStep:i});if(s.presentation)presentations[s.stepId]=s.presentation;}
  const progress=await learningProgress(tx,learnerId);await saveSnapshot(tx,progress);
  return {streamId,nextSeq:stream.nextSeq,session:sessionDTO(fresh),presentations,progress};
 },{timeout:20000});
}
export async function syncBatch(db:Db,accountId:string,learnerId:string,streamId:string,events:SyncEnvelope[]) {
 return db.$transaction(async tx=>{
  await lockLearner(tx,learnerId,accountId);const stream=await tx.syncStream.findFirst({where:{id:streamId,learnerId}});if(!stream)throw new HTTPException(404,{message:'同步课次不存在，请先联网建立课次'});
  for(const input of events){
   if(input.command.sessionId!==stream.sessionId)throw fail('同步课次不一致');
   if(input.seq>stream.nextSeq+100)throw fail('缺少较早的同步记录，请先补齐');
   const old=await tx.syncEntry.findUnique({where:{streamId_seq:{streamId,seq:input.seq}}});
   if(old){if(canonical(old.payload)!==canonical(input))throw fail('相同序号携带了不同内容');continue;}
   await tx.syncEntry.create({data:{streamId,seq:input.seq,payload:input}});
  }
  let nextSeq=stream.nextSeq;
  // Savepoints keep rejected facts without committing a partially applied learning event.
  for(let count=0;count<100;count++){
   const row=await tx.syncEntry.findUnique({where:{streamId_seq:{streamId,seq:nextSeq}}});if(!row||row.status!=='buffered')break;
   const input=row.payload as unknown as SyncEnvelope;
   await tx.$executeRawUnsafe('SAVEPOINT learning_sync');
   try{
    const occurred=new Date(input.occurredAt);
    // Client time is retained as a report. It is not allowed to create cross-day mastery.
    await applyLearningEventTx(tx,accountId,learnerId,input.command,occurred);
    await tx.$executeRawUnsafe('RELEASE SAVEPOINT learning_sync');
    await tx.syncEntry.update({where:{streamId_seq:{streamId,seq:nextSeq}},data:{status:'applied'}});nextSeq++;
   }catch(e){
    await tx.$executeRawUnsafe('ROLLBACK TO SAVEPOINT learning_sync');await tx.$executeRawUnsafe('RELEASE SAVEPOINT learning_sync');
    if(!(e instanceof HTTPException))throw e;
    await tx.syncEntry.update({where:{streamId_seq:{streamId,seq:nextSeq}},data:{status:e.status===409?'conflict':'rejected',message:e.message}});break;
   }
  }
  await tx.syncStream.update({where:{id:streamId},data:{nextSeq}});
  const rows=await tx.syncEntry.findMany({where:{streamId,OR:[{seq:{gte:Math.max(1,nextSeq-100)}},{seq:{in:events.map(e=>e.seq)}}]},orderBy:{seq:'asc'},take:201});
  return {nextSeq,receipts:rows.map(r=>({seq:r.seq,clientEventId:(r.payload as unknown as SyncEnvelope).command.clientEventId,status:r.status,message:r.message})),session:sessionDTO((await findSession(tx,learnerId,stream.sessionId))!),progress:await learningProgress(tx,learnerId)};
 },{timeout:30000});
}
export async function learningChanges(tx:Tx,learnerId:string,cursor:number) {
 // Reads must not create snapshots: concurrent first reads otherwise race on the same key.
 // Mutations save their revision under the learner lock; missing baselines return a full reset.
 const state=await learningProgress(tx,learnerId);
 if(cursor>state.revision)throw fail('同步游标超出服务端版本，请重新读取');
 const old=await tx.progressSnapshot.findUnique({where:{learnerId_revision:{learnerId,revision:cursor}}});
 if(!old)return {cursor:state.revision,reset:true,progress:state,deleted:{sessionIds:[]}};
 const before=old.state as unknown as LearningProgressState,patch:Record<string,unknown>={};
 for(const [key,value] of Object.entries(state))if(canonical(value)!==canonical(before[key as keyof LearningProgressState]))patch[key]=value;
 return {cursor:state.revision,reset:false,patch,deleted:{sessionIds:before.sessions.filter(s=>!state.sessions.some(n=>n.id===s.id)).map(s=>s.id)}};
}
