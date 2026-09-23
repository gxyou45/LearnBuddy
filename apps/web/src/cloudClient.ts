import {syncPlanSchema,syncResultSchema,learningChangesSchema,type SyncEnvelope,learningProgressSchema,learningResultSchema,reviewQueueSchema,mistakeListSchema,type LearningProgressState,type LearningCommand,type StartLearning} from '@learnbuddy/contracts';
export class CloudError extends Error {constructor(message:string,public status=0){super(message);}}
export async function cloudRequest(path:string,body?:unknown,method=body?'POST':'GET') {
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
 try {
  const r=await fetch(path,{method,credentials:'same-origin',cache:'no-store',signal:controller.signal,headers:body?{'Content-Type':'application/json'}:undefined,body:body?JSON.stringify(body):undefined});
  const data=await r.json();if(!r.ok){if(r.status===410)window.dispatchEvent(new Event('family-data-deleted'));if(r.status===401)window.dispatchEvent(new Event('family-session-expired'));throw new CloudError(data.error?.message||'云端暂时不可用',r.status);}return data;
 }catch(e){if(e instanceof CloudError)throw e;throw new CloudError('未能确认云端保存，请检查网络后重试');}finally{clearTimeout(timer);}
}
export const getCloudProgress=async(id:string):Promise<LearningProgressState>=>learningProgressSchema.parse(await cloudRequest(`/api/v1/learners/${id}/progress`));
export const getReviews=async(id:string,lessonId?:string)=>reviewQueueSchema.parse(await cloudRequest(`/api/v1/learners/${id}/reviews${lessonId?`?lessonId=${encodeURIComponent(lessonId)}`:""}`));
export const getMistakes=async(id:string,cursor?:string)=>mistakeListSchema.parse(await cloudRequest(`/api/v1/learners/${id}/mistakes?status=all${cursor?'&cursor='+cursor:''}`));
export const sendStart=async(id:string,body:StartLearning)=>learningResultSchema.parse(await cloudRequest(`/api/v1/learners/${id}/sessions`,body));
export const sendEvent=async(id:string,body:LearningCommand)=>learningResultSchema.parse(await cloudRequest(`/api/v1/learners/${id}/events`,body));

export function cloudId(){const bytes=crypto.getRandomValues(new Uint8Array(16));bytes[6]=(bytes[6]&15)|64;bytes[8]=(bytes[8]&63)|128;const hex=Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;}

export const prepareSync=async(id:string,streamId:string,sessionId:string)=>syncPlanSchema.parse(await cloudRequest(`/api/v1/learners/${id}/sync-streams`,{streamId,sessionId}));
export const sendBatch=async(id:string,streamId:string,events:SyncEnvelope[])=>syncResultSchema.parse(await cloudRequest(`/api/v1/learners/${id}/events:batch`,{streamId,events}));
export async function getChanges(id:string,previous:LearningProgressState){const r=learningChangesSchema.parse(await cloudRequest(`/api/v1/learners/${id}/changes?cursor=${previous.revision}`));return r.reset?r.progress!:learningProgressSchema.parse({...previous,...r.patch,revision:r.cursor,sessions:(r.patch?.sessions||previous.sessions).filter(s=>!r.deleted.sessionIds.includes(s.id))});}
