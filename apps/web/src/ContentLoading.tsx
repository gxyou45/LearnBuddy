import {useEffect,useState} from 'react';
import {isLessonLoaded,loadCatalog,loadLesson} from './contentRepository';
import {useProgressStorage,useLearnerId,useFamily} from './FamilyAccount';
import {CloudProvider} from './CloudLearning';
import {getCloudProgress,getChanges,cloudRequest} from './cloudClient';
import {readLocal} from './offlineStore';
import {offlineKey,type OfflineRecord} from './offlineLearning';
import {learningProgressSchema,type LearningProgressState} from '@learnbuddy/contracts';
export function ContentStatus({error,retry,back}:{error?:boolean;retry:()=>void;back?:()=>void}) {
 return <div className="app-shell"><section className="content-status" role="status"><h1>{error?'课程暂时没加载出来':'正在准备课程…'}</h1><p>{error?'请检查网络后重试。原有学习进度已保留。':'马上就能继续探索啦。'}</p>{error&&<button className="primary" onClick={retry}>重新加载课程</button>}{back&&<button className="text-button" onClick={back}>回到小屋</button>}</section></div>;
}
export function ContentBootstrap({children}:{children:React.ReactNode}) {
 const STORAGE_KEY=useProgressStorage(),learnerId=useLearnerId(),family=useFamily();
 const [cloud,setCloud]=useState<LearningProgressState>();
 const [state,setState]=useState<'loading'|'ready'|'error'>('loading');
 const [attempt,setAttempt]=useState(0);
 useEffect(()=>{
  let active=true;setState('loading');
  let pinned:string|undefined;
  try {const raw=localStorage.getItem(STORAGE_KEY);const p=raw?JSON.parse(raw):null;if(typeof p?.releaseId==='string')pinned=p.releaseId;}catch{/* Original data is preserved and handled only after catalog loads. */}
  void (async()=>{const cached=learnerId&&family?await readLocal<OfflineRecord>(offlineKey(family.account.accountId,learnerId)):undefined;let snapshot=learnerId?(cached?.events.length||cached?.start||!navigator.onLine?cached?.view:cached?await getChanges(learnerId,cached.confirmed):await getCloudProgress(learnerId)):undefined;if(learnerId&&!snapshot)throw new Error('需要联网读取档案');if(learnerId&&snapshot?.releaseId&&navigator.onLine&&!cached?.events.length&&!cached?.start&&!cached?.conflict){snapshot=learningProgressSchema.parse(await cloudRequest(`/api/v1/learners/${learnerId}/curriculum-upgrade`,{expectedReleaseId:snapshot.releaseId}));}if(!learnerId&&pinned&&navigator.onLine){const response=await fetch(`/api/v1/catalog-upgrade?from=${encodeURIComponent(pinned)}`);if(response.ok){const update=await response.json();if(typeof update.releaseId==='string'&&update.releaseId!==pinned){const raw=localStorage.getItem(STORAGE_KEY);if(raw){localStorage.setItem(`${STORAGE_KEY}:before-curriculum-upgrade`,raw);const saved=JSON.parse(raw);saved.releaseId=update.releaseId;localStorage.setItem(STORAGE_KEY,JSON.stringify(saved));}pinned=update.releaseId;}}}if(!active)return;await loadCatalog(learnerId?(snapshot?.releaseId||undefined):pinned);if(active){setCloud(snapshot);setState('ready');}})().catch(()=>{if(active)setState('error');});
  return ()=>{active=false;};
 },[attempt,STORAGE_KEY]);
 return state==='ready'?(cloud?<CloudProvider initial={cloud} storage={STORAGE_KEY}>{children}</CloudProvider>:children):<ContentStatus error={state==='error'} retry={()=>setAttempt(n=>n+1)}/>;
}
export function useLessonContent(id?:string) {
 const [revision,update]=useState(0);
 const [error,setError]=useState<string>();
 useEffect(()=>{
  if(!id||isLessonLoaded(id))return;
  let active=true;setError(undefined);
  loadLesson(id).then(()=>{if(active)update(n=>n+1);}).catch(()=>{if(active)setError(id);});
  return ()=>{active=false;};
 },[id,revision]);
 return {ready:!id||isLessonLoaded(id),error:error===id&&!!id,retry:()=>{setError(undefined);update(n=>n+1);}};
}
