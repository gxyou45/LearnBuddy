import {createHash} from 'node:crypto';
import {HTTPException} from 'hono/http-exception';
import type {Prisma} from './generated/prisma/client.js';
import type {database} from './db.js';
import {recordDeletion,deletionIntents,pendingDeletion,type DeletionIntent} from './deletion-ledger.js';
type Tx=Prisma.TransactionClient;type Db=ReturnType<typeof database>;
export const cleanupHash=(token:string)=>createHash('sha256').update(token).digest('hex');
export async function exportFamily(db:Db,accountId:string,learnerId?:string){
 return db.$transaction(async tx=>{
  const account=await tx.familyAccount.findUniqueOrThrow({where:{id:accountId},select:{id:true,name:true,email:true,createdAt:true}});
  const profiles=await tx.learner.findMany({where:{accountId,...(learnerId?{id:learnerId}:{})},orderBy:{createdAt:'asc'}});
  if(learnerId&&!profiles.length)throw new HTTPException(404,{message:'没有找到孩子档案'});
  const learners=[];
  for(const profile of profiles){const id=profile.id;learners.push({profile,
   sessions:await tx.learningSession.findMany({where:{learnerId:id},include:{lesson:{select:{lessonId:true,releaseId:true,content:true}},events:true,presentations:{include:{attempts:true,question:{select:{id:true,answer:true,options:true,ruleVersion:true}}}}},orderBy:{startedAt:'asc'}}),
   progress:await tx.learningProgress.findMany({where:{learnerId:id}}),completedLessons:await tx.learnerLesson.findMany({where:{learnerId:id}}),skills:await tx.learningSkill.findMany({where:{learnerId:id}}),mistakes:await tx.mistakeItem.findMany({where:{learnerId:id}}),imports:await tx.legacyImport.findMany({where:{learnerId:id}}),syncStreams:await tx.syncStream.findMany({where:{learnerId:id},include:{entries:{orderBy:{seq:'asc'}}}})
  });}
  return {format:'learnbuddy-family-export',version:1,exportedAt:new Date().toISOString(),account,learners,notice:'包含当前云端事实、题目版本和旧记录原文；不包含密码、会话令牌或未上传的其他设备记录。'};
 },{isolationLevel:'RepeatableRead',timeout:30000});
}
export async function purgeLearner(tx:Tx,accountId:string,id:string) {
 const learner=await tx.learner.findFirst({where:{id,accountId}});if(!learner)return;
 await tx.$queryRaw`SELECT id FROM "Learner" WHERE id=${id}::uuid FOR UPDATE`;
 await tx.mistakeItem.deleteMany({where:{learnerId:id}});
 await tx.syncEntry.deleteMany({where:{stream:{learnerId:id}}});await tx.syncStream.deleteMany({where:{learnerId:id}});
 await tx.attempt.deleteMany({where:{presentation:{session:{learnerId:id}}}});
 await tx.learningEvent.deleteMany({where:{learnerId:id}});await tx.questionPresentation.deleteMany({where:{session:{learnerId:id}}});await tx.learningSession.deleteMany({where:{learnerId:id}});
 await tx.learningProgress.deleteMany({where:{learnerId:id}});await tx.learnerLesson.deleteMany({where:{learnerId:id}});await tx.learningSkill.deleteMany({where:{learnerId:id}});await tx.progressSnapshot.deleteMany({where:{learnerId:id}});await tx.legacyImport.deleteMany({where:{learnerId:id}});
 await tx.learner.deleteMany({where:{id,accountId}});
}
export async function applyDeletion(tx:Tx,intent:DeletionIntent) {
 // Account lock orders creation, account deletion and replay; learning writes use learner locks.
 await tx.$queryRaw`SELECT id FROM "Account" WHERE id=${intent.accountId}::uuid FOR UPDATE`;
 const ids=intent.scope==='account'?(await tx.learner.findMany({where:{accountId:intent.accountId},select:{id:true}})).map(x=>x.id):intent.learnerIds;
 for(const id of ids.sort())await purgeLearner(tx,intent.accountId,id);
 if(intent.scope==='account'){
  await tx.authSession.deleteMany({where:{accountId:intent.accountId}});await tx.identity.deleteMany({where:{accountId:intent.accountId}});await tx.verification.deleteMany({where:{value:intent.accountId}});
  await tx.contentDraft.updateMany({where:{createdBy:intent.accountId},data:{createdBy:null}});await tx.contentUpload.updateMany({where:{createdBy:intent.accountId},data:{createdBy:null}});await tx.contentAudit.updateMany({where:{actorId:intent.accountId},data:{actorId:null}});
  await tx.rateLimit.deleteMany({where:{key:`privacy:${intent.accountId}`}});await tx.familyAccount.deleteMany({where:{id:intent.accountId}});
 }
 await tx.dataDeletion.upsert({where:{requestId:intent.requestId},create:{...intent,learnerId:intent.scope==='learner'?intent.learnerIds[0]:null,deletedAt:new Date(intent.deletedAt)},update:{}});
}
export async function deleteFamilyData(db:Db,accountId:string,requestId:string,confirmation:string,learnerId?:string) {
 return db.$transaction(async tx=>{
  await tx.$queryRaw`SELECT id FROM "Account" WHERE id=${accountId}::uuid FOR UPDATE`;
  const previous=await tx.dataDeletion.findUnique({where:{requestId}});
  if(previous){if(previous.accountId!==accountId||previous.learnerId!==(learnerId||null))throw new HTTPException(409,{message:'删除请求编号已用于其他目标'});return {requestId,scope:previous.scope,accountId,learnerIds:previous.learnerIds,deletedAt:previous.deletedAt.toISOString()};}
  const account=await tx.familyAccount.findUnique({where:{id:accountId}});if(!account)throw new HTTPException(401,{message:'请重新登录'});
  const learner=learnerId?await tx.learner.findFirst({where:{id:learnerId,accountId}}):null;
  if(learnerId&&!learner)throw new HTTPException(404,{message:'没有找到孩子档案'});
  if(confirmation!==(learner?.nickname??account.email))throw new HTTPException(400,{message:'确认文字与当前目标不一致，请重新输入'});
  const ids=learnerId?[learnerId]:(await tx.learner.findMany({where:{accountId},select:{id:true}})).map(x=>x.id);
  const pending=await pendingDeletion(requestId);
  if(pending&&(pending.accountId!==accountId||pending.scope!==(learnerId?'learner':'account')||(learnerId&&pending.learnerIds[0]!==learnerId)))throw new HTTPException(409,{message:'删除请求编号已用于其他目标'});
  const intent:DeletionIntent=pending??{requestId,scope:learnerId?'learner':'account',accountId,learnerIds:ids,deletedAt:new Date().toISOString(),cleanupTokenHash:learnerId?null:cleanupHash(account.cleanupToken)};
  await recordDeletion(intent);await applyDeletion(tx,intent);
  const {cleanupTokenHash,...receipt}=intent;return receipt;
 },{timeout:30000});
}
export async function replayDeletions(db:Db,dir?:string){const intents=await deletionIntents(dir);for(const intent of intents)await db.$transaction(tx=>applyDeletion(tx,intent),{timeout:30000});return intents.length;}
export async function privacyRateLimit(db:Db,accountId:string){
 await db.$transaction(async tx=>{await tx.$queryRaw`SELECT id FROM "Account" WHERE id=${accountId}::uuid FOR UPDATE`;
 const key=`privacy:${accountId}`,now=BigInt(Date.now()),old=await tx.rateLimit.findUnique({where:{key}});
 if(old&&now-old.lastRequest<300000n&&old.count>=5)throw new HTTPException(429,{message:'验证次数较多，请五分钟后重试'});
 await tx.rateLimit.upsert({where:{key},create:{key,count:1,lastRequest:now},update:!old||now-old.lastRequest>=300000n?{count:1,lastRequest:now}:{count:{increment:1}}});
 });
}
