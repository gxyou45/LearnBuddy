import type {LearningProgressState,LearningSessionState,LearningCommand,SyncEnvelope,SyncPlan,StartLearning} from '@learnbuddy/contracts';
import {getSteps,lessons} from './contentRepository';
export type OfflineRecord={generation:number;confirmed:LearningProgressState;view:LearningProgressState;plan?:SyncPlan;events:SyncEnvelope[];nextSeq:number;conflict?:string;start?:StartLearning};
export const offlineKey=(accountId:string,learnerId:string)=>`learning:${accountId}:${learnerId}`;
export function localEvent(record:OfflineRecord,command:LearningCommand):OfflineRecord {
 const r:OfflineRecord={...record,confirmed:record.confirmed,view:structuredClone(record.view),plan:structuredClone(record.plan),events:[...record.events]},plan=r.plan;if(!plan||plan.session.id!==command.sessionId)throw new Error('请先联网准备此课次');
 const s=plan.session,steps=getSteps(lessons.find(l=>l.id===s.lessonId)!),step=steps[s.stepIndex];
 if(!step||s.completed||s.revision!==command.expectedRevision)throw new Error('本机课次位置已变化，请刷新');
 const p=s.presentation;
 if(command.type==='audio'&&p){if(command.result==='played')p.audioHeard=true;else p.audioFailed=true;}
 if(command.type==='hint'&&p)p.prompted=true;
 if(command.type==='answer'&&p){if(p.answer)throw new Error('本题已记录');p.answer={selectedId:command.selectedId,correct:!command.skipped&&command.selectedId===step.characterId,skipped:command.skipped,prompted:p.prompted,audioFailed:p.audioFailed,independent:false};}
 if(p)plan.presentations[step.id]=structuredClone(p);
 if(command.type==='hunt')s.huntFound=[...new Set([...s.huntFound,command.characterId])];
 if(command.type==='advance'){
  if((step.kind==='sound'||step.kind==='meaning')&&!p?.answer)throw new Error('请先作答或跳过');
  if(s.mode==='review'||s.stepIndex===steps.length-1)s.completed=true;
  else {s.stepIndex++;s.stepId=steps[s.stepIndex].id;s.presentation=structuredClone(plan.presentations[s.stepId]??null);if(['sound','meaning'].includes(steps[s.stepIndex].kind)&&!s.presentation)throw new Error('下一题尚未缓存，请联网后继续');}
 }
 s.revision++;
 if(s.mode==='lesson'){
  r.view.sessions=[s,...r.view.sessions.filter(x=>x.id!==s.id&&x.lessonId!==s.lessonId)];r.view.activeSessionId=s.id;
  if(s.completed)r.view.completedLessons=[...new Set([...r.view.completedLessons,s.lessonId])];
  const seen=steps.slice(0,s.stepIndex+1).filter(x=>x.kind==='teach').map(x=>x.characterId!).filter(Boolean);r.view.seen=[...new Set([...r.view.seen,...seen])];
 }
 return r;
}
export function sessionOf(r:OfflineRecord,review=false):LearningSessionState|undefined {return review?r.plan?.session.mode==='review'?r.plan.session:undefined:r.view.sessions.find(s=>s.id===r.view.activeSessionId);}
