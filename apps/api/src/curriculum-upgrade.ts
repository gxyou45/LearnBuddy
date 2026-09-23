import {HTTPException} from 'hono/http-exception';
import {isCompatibleExpansion,validateManifest} from '@learnbuddy/contracts';
import type {database} from './db.js';
import {lockLearner,learningProgress,saveSnapshot} from './learning-service.js';
/** Upgrade only additive catalogs. Historical sessions and question IDs remain immutable. */
export async function upgradeCurriculum(db:ReturnType<typeof database>,accountId:string,learnerId:string,expectedReleaseId:string) {
 return db.$transaction(async tx=>{
  const learner=await lockLearner(tx,learnerId,accountId);
  const channel=await tx.contentChannel.findUniqueOrThrow({where:{id:'default'}});
  if(learner.learningReleaseId===channel.releaseId || !learner.learningReleaseId)return learningProgress(tx,learnerId);
  if(learner.learningReleaseId!==expectedReleaseId)throw new HTTPException(409,{message:'课程版本已变化，请刷新后重试'});
  const before=await tx.contentRelease.findUniqueOrThrow({where:{id:learner.learningReleaseId}});
  const after=await tx.contentRelease.findUniqueOrThrow({where:{id:channel.releaseId}});
  if(!isCompatibleExpansion(validateManifest(after.manifest),validateManifest(before.manifest)))return learningProgress(tx,learnerId);
  await tx.learner.update({where:{id:learnerId},data:{learningReleaseId:channel.releaseId,learningRevision:{increment:1}}});
  const state=await learningProgress(tx,learnerId);await saveSnapshot(tx,state);return state;
 },{timeout:30000});
}
