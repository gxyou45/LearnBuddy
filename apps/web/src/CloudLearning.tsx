import {createContext,useContext,useEffect,useRef,useState,type ReactNode} from 'react';
import {learningProgressSchema,type LearningCommand,type LearningProgressState,type LearningSessionState,type ReviewQueue,type StartLearning,type SyncEnvelope} from '@learnbuddy/contracts';
import {CloudError,cloudId,cloudRequest,getCloudProgress,getReviews,prepareSync,sendBatch,getChanges,sendStart} from './cloudClient';
import {lessons,releaseId} from './contentRepository';
import {fresh,type Progress} from './progress';
import {useFamily} from './FamilyAccount';
import {readLocal,writeLocal,compareWrite} from './offlineStore';
import {offlineKey,localEvent,sessionOf,type OfflineRecord} from './offlineLearning';

type EventAction=LearningCommand extends infer T?T extends LearningCommand?Omit<T,'clientEventId'|'sessionId'|'expectedRevision'>:never:never;
type Success=(session:LearningSessionState)=>void;
type Cloud={progress:LearningProgressState;reviewSession:LearningSessionState|null;reviews:ReviewQueue['items'];pending:boolean;blocked:boolean;start:(lessonId:string,onSuccess:Success,review?:ReviewQueue['items'][number])=>Promise<boolean>;event:(action:EventAction,onSuccess?:Success,review?:boolean)=>Promise<boolean>;settings:(open:boolean)=>Promise<boolean>};
const Context=createContext<Cloud|null>(null);
export const useCloud=()=>useContext(Context);
export function projectCloud(state:LearningProgressState,preferences:Progress):Progress {
 const active=state.sessions.find(s=>s.id===state.activeSessionId),states:Progress['lessonProgress']={};
 for(const l of lessons){const s=state.sessions.find(s=>s.lessonId===l.id);states[l.id]={started:!!s&&!s.completed,completed:state.completedLessons.includes(l.id),step:s&&!s.completed?s.stepIndex:0,session:s?.id||'',huntFound:s?.huntFound||[]};}
 const activeLesson=active?.lessonId||lessons[0].id;
 return {...fresh(),sound:preferences.sound,observations:preferences.observations,releaseId:state.releaseId||releaseId,activeLesson,lessonProgress:states,...states[activeLesson],seen:state.seen,unlocked:state.openAllCourses?lessons.map(l=>l.id):[]};
}
export function CloudProvider({initial,storage,children}:{initial:LearningProgressState;storage:string;children:ReactNode}) {
 const family=useFamily()!,key=offlineKey(family.account.accountId,initial.learnerId);
 const [record,setRecord]=useState<OfflineRecord>({generation:0,confirmed:initial,view:initial,events:[],nextSeq:1});
 const ref=useRef(record),mounted=useRef(true),running=useRef(false);
 const [ready,setReady]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[online,setOnline]=useState(navigator.onLine);
 const [reviews,setReviews]=useState<ReviewQueue['items']>([]),[reviewError,setReviewError]=useState(false);
 const [message,setMessage]=useState('云端记录已读取');
 const [hasLegacy]=useState(()=>{try{return !!(localStorage.getItem(storage)||localStorage.getItem('learnbuddy:v1:progress'));}catch{return false;}});
 const persist=async(next:OfflineRecord)=>{const previous=ref.current.generation;const value={...next,generation:previous+1};await compareWrite(key,value,previous);ref.current=value;if(mounted.current)setRecord(value);};
 const prepare=async(session:LearningSessionState)=>{
  const plan=await prepareSync(initial.learnerId,cloudId(),session.id);
  await persist({...ref.current,confirmed:plan.progress,view:plan.progress,plan,nextSeq:plan.nextSeq,events:[],start:undefined,conflict:undefined});
 };
 const flush=async()=>{
  let r=ref.current;
  if(!navigator.onLine||r.conflict)return;
  if(r.start){const result=await sendStart(initial.learnerId,r.start);await prepare(result.session);r=ref.current;}
  if(r.events.length&&r.plan){
   const result=await sendBatch(initial.learnerId,r.plan.streamId,r.events.slice(0,100));
   const accepted=new Set(result.receipts.filter(x=>x.status==='applied').map(x=>x.clientEventId));
   const remaining=r.events.filter(e=>!accepted.has(e.command.clientEventId));
   const conflict=result.receipts.find(x=>x.status==='conflict'||x.status==='rejected');
   let next:OfflineRecord={...r,confirmed:result.progress,events:remaining,conflict:conflict?.message||undefined};
   if(!remaining.length){next.view=result.progress;next.plan={...r.plan,session:result.session,progress:result.progress};}
   await persist(next);
   if(conflict){setMessage('其他设备或页面已更新此课次，本机待同步记录已保留。');return;}
  }
  if(!ref.current.events.length){setMessage('已保存到云端');}
 };
 const run=async(operation:()=>Promise<void>)=>{
  if(running.current||!mounted.current)return false;running.current=true;setBusy(true);setError('');
  try{await operation();return true;}catch(e){if(e instanceof CloudError&&[400,403,404,409].includes(e.status)&&(ref.current.events.length||ref.current.start)){try{await persist({...ref.current,conflict:e.message});}catch{/* Preserve the existing durable queue if storage also fails. */}}if(mounted.current)setError(e instanceof Error?e.message:'同步未完成，记录已保留');return false;}
  finally{running.current=false;if(mounted.current)setBusy(false);}
 };
 const refresh=async()=>{
  const disk=await readLocal<OfflineRecord>(key);if(disk&&disk.generation>ref.current.generation){ref.current=disk;if(mounted.current)setRecord(disk);}
  await flush();if(ref.current.events.length||ref.current.conflict||!navigator.onLine)return;
  const p=await getChanges(initial.learnerId,ref.current.confirmed);
  if(p.releaseId&&p.releaseId!==releaseId){location.reload();return;}
  await persist({...ref.current,confirmed:p,view:p});
  const active=p.sessions.find(s=>s.id===p.activeSessionId);
  if(active&&!active.completed&&ref.current.plan?.session.mode!=='review')await prepare(active);
  setReady(true);setMessage('云端记录已读取');
 };
 useEffect(()=>{
  mounted.current=true;
  void run(async()=>{const cached=await readLocal<OfflineRecord>(key);if(!mounted.current)return;
   if(cached){ref.current=cached;setRecord(cached);}else await persist(ref.current);
   setReady(true);if(navigator.onLine)await refresh();
  });
  const focus=()=>{void run(refresh);};const net=()=>{setOnline(navigator.onLine);if(navigator.onLine)void run(refresh);};
  addEventListener('focus',focus);addEventListener('online',net);addEventListener('offline',net);
  return()=>{mounted.current=false;removeEventListener('focus',focus);removeEventListener('online',net);removeEventListener('offline',net);};
 },[]);
 useEffect(()=>{if(!ready||!online)return;let active=true;void getReviews(initial.learnerId).then(q=>{if(active){setReviews(q.items);setReviewError(false);}}).catch(()=>{if(active)setReviewError(true);});return()=>{active=false;};},[ready,record.confirmed.revision,online]);
 const value:Cloud={progress:record.view,reviewSession:record.plan?.session.mode==='review'?record.plan.session:null,reviews,pending:record.events.length>0||!!record.start,blocked:!ready||busy||!!record.conflict||!!record.start,
  start:(lessonId,onSuccess,review)=>run(async()=>{
   if(ref.current.events.length)await flush();if(ref.current.events.length||ref.current.conflict)throw new Error('请先同步或处理本机记录，再开始其他课次');
   const existing=ref.current.view.sessions.find(s=>s.lessonId===lessonId&&!s.completed);
   if(!navigator.onLine){if(existing&&ref.current.plan?.session.id===existing.id&&!review){setTimeout(()=>{if(mounted.current)onSuccess(existing);},0);return;}throw new Error('新课次需要联网，离线只能继续已准备的课次');}
   const body:StartLearning={requestId:cloudId(),releaseId:review?.releaseId||releaseId,lessonId,mode:review?'review':'lesson',...(review?{questionVersionId:review.questionVersionId}:{})};
   await persist({...ref.current,start:body});await flush();const session=ref.current.plan!.session;
   setTimeout(()=>{if(mounted.current)onSuccess(session);},0);
  }),
  event:(action,onSuccess,review=false)=>run(async()=>{
   const r=ref.current,s=sessionOf(r,review);if(!s)throw new Error('请先开始课次');
   if(r.conflict||r.start)throw new Error('请先处理待同步记录');
   if(r.plan?.session.id!==s.id)throw new Error('请联网准备课次后再继续');
   if(r.events.length>=100)throw new Error('本机已保存 100 条待同步操作，请联网后继续');
   const command={...action,clientEventId:cloudId(),sessionId:s.id,expectedRevision:s.revision} as LearningCommand;
   const envelope:SyncEnvelope={seq:r.nextSeq,occurredAt:new Date().toISOString(),timeZone:Intl.DateTimeFormat().resolvedOptions().timeZone,command};
   const next=localEvent(r,command);next.events.push(envelope);next.nextSeq++;await persist(next);
   setMessage('已保存到本机，等待云端确认');
   // Feedback/position is durable before the network request. Failed transport keeps the same IDs.
   try{await flush();}catch(e){if(mounted.current)setError(e instanceof Error?e.message:'待同步');}
   setTimeout(()=>{if(mounted.current)onSuccess?.(sessionOf(ref.current,review)!);},0);
  }),
  settings:open=>run(async()=>{await flush();if(ref.current.events.length||!navigator.onLine)throw new Error('请联网并完成同步后修改设置');const p=learningProgressSchema.parse(await cloudRequest(`/api/v1/learners/${initial.learnerId}/learning-settings`,{openAllCourses:open},'PATCH'));await persist({...ref.current,confirmed:p,view:p});}),
 };
 const resumeServer=()=>void run(async()=>{
  if(!navigator.onLine)throw new Error('请联网后读取云端位置');
  // Archive rather than delete disputed facts. Server also retains rejected stream entries.
  await writeLocal(`${key}:conflict:${Date.now()}`,ref.current);
  const p=await getCloudProgress(initial.learnerId);await persist({...ref.current,confirmed:p,view:p,events:[],plan:undefined,start:undefined,conflict:undefined,nextSeq:1});
  location.hash='home';await refresh();
 });
 return <Context.Provider value={value}><div className="cloud-learning"><div className="cloud-status" role="status">{record.events.length?`待同步 ${record.events.length} 条 · 已保存在本机`:!online?'离线模式 · 可继续已缓存课次':message}{error&&<span> · {error}</span>}{record.conflict&&<p>{record.conflict}。本机记录不会自动覆盖云端。</p>}{!busy&&(error||record.events.length>0||record.start)&&<button onClick={()=>void run(refresh)}>重试保存</button>}{record.conflict&&!busy&&<button onClick={resumeServer}>保留本机副本，继续云端位置</button>}</div>{reviewError&&<p className="notice">复习队列暂时不可用，联网刷新后重试。</p>}{hasLegacy&&<details className="legacy-notice"><summary>本机旧记录已保留</summary><p>家长中心可选择来源和孩子，查看摘要后导入旧记录。原存档不会删除。</p></details>}{children}</div></Context.Provider>;
}
