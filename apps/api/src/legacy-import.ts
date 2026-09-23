import {createHash,randomUUID} from 'node:crypto';
import {HTTPException} from 'hono/http-exception';
import type {LegacyProgress,ContentManifest} from '@learnbuddy/contracts';
import type {database} from './db.js';
import {lockLearner,learningProgress,saveSnapshot,canonical,ensurePresentation,findSession} from './learning-service.js';
export async function importLegacy(db:ReturnType<typeof database>,accountId:string,learnerId:string,raw:LegacyProgress) {
 const fingerprint=createHash('sha256').update(canonical(raw)).digest('hex');
 return db.$transaction(async tx=>{
  const learner=await lockLearner(tx,learnerId,accountId);
  const existing=await tx.legacyImport.findUnique({where:{learnerId_fingerprint:{learnerId,fingerprint}}});
  if(existing)return {accepted:'duplicate',fingerprint,progress:await learningProgress(tx,learnerId)};
  const releaseId=raw.releaseId||'prototype-v4';
  const release=await tx.contentRelease.findUnique({where:{id:releaseId}});
  const bad=()=>new HTTPException(400,{message:'旧记录的课程、步骤或汉字不匹配，原文件已保留'});
  if(!release)throw bad();
  if(learner.learningReleaseId&&learner.learningReleaseId!==releaseId)throw new HTTPException(409,{message:'此孩子已使用另一课程版本，请选择一个尚未开始学习的新档案导入'});
  const manifest=release.manifest as ContentManifest;
  if(raw.contentVersion!==release.contentVersion&&!(raw.contentVersion<4&&releaseId==='prototype-v4'))throw bad();
  const ids=new Set(manifest.lessons.flatMap(l=>l.characters.map(c=>c.id)));
  if(raw.seen.some(id=>!ids.has(id))||Object.keys(raw.observations).some(id=>!ids.has(id))||raw.attempts.some(a=>!ids.has(a.characterId))||raw.unlocked.some(id=>!manifest.lessons.some(l=>l.id===id)))throw bad();
  // Restore only verifiable positions. Old boolean answers remain labelled reports, not Attempts.
  const states={...raw.lessonProgress,[raw.activeLesson]:raw};
  const hasCloud=!!await tx.learningSession.findFirst({where:{learnerId,requestId:{not:null}}});
  const mapped=[];
  for(const [lessonId,state] of Object.entries(states)){
   const lesson=manifest.lessons.find(l=>l.id===lessonId);if(!lesson)throw bad();
   if(new Set(state.huntFound).size!==state.huntFound.length||state.huntFound.some(id=>!lesson.characters.some(c=>c.id===id)))throw bad();
   let step=state.step;
   if(raw.contentVersion<4){if(step>=(raw.contentVersion===1?11:12))throw bad();step=raw.contentVersion===1&&step===10?14:step>=4?step+3:step;}
   else if(state.stepId){step=lesson.steps.findIndex(s=>s.id===state.stepId);}
   if(step<0||step>=lesson.steps.length)throw bad();
   mapped.push({lessonId,state,step});
  }
  await tx.legacyImport.create({data:{learnerId,fingerprint,raw}});
  // Non-active imported sessions are written first; the old active course remains the resume target.
  for(const item of mapped.sort((a,b)=>Number(a.lessonId===raw.activeLesson)-Number(b.lessonId===raw.activeLesson))){
   const {lessonId,state,step}=item;
   if(state.completed)await tx.learnerLesson.upsert({where:{learnerId_lessonId:{learnerId,lessonId}},create:{learnerId,lessonId},update:{}});
   if(!state.started&&!state.completed)continue;
   if(await tx.learningSession.findFirst({where:{learnerId,mode:'lesson',lesson:{lessonId}}}))continue;
   const lesson=await tx.lessonVersion.findUniqueOrThrow({where:{releaseId_lessonId:{releaseId,lessonId}}});
   const session=await tx.learningSession.create({data:{learnerId,lessonVersionId:lesson.id,requestId:randomUUID(),lastActiveAt:hasCloud?new Date(0):new Date(),currentStep:step,completedAt:state.completed?new Date():null,huntFound:state.huntFound}});
   await ensurePresentation(tx,(await findSession(tx,learnerId,session.id))!);
  }
  await tx.learner.update({where:{id:learnerId},data:{learningReleaseId:releaseId,learningRevision:{increment:1}}});
  const progress=await learningProgress(tx,learnerId);await saveSnapshot(tx,progress);
  return {accepted:'applied',fingerprint,progress};
 },{timeout:20000});
}
