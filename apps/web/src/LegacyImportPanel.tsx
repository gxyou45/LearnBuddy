import {useState} from 'react';
import {legacyProgressSchema} from '@learnbuddy/contracts';
import {useFamily,useLearnerId} from './FamilyAccount';
import {STORAGE_KEY} from './progress';
import {readLocal} from './offlineStore';
import {offlineKey,type OfflineRecord} from './offlineLearning';
import {cloudRequest} from './cloudClient';
export function LegacyImportPanel({storage,disabled}:{storage:string;disabled:boolean}) {
 const family=useFamily()!,learner=useLearnerId()!;
 const [source,setSource]=useState(storage),[target,setTarget]=useState(learner),[preview,setPreview]=useState<{raw:string;attempts:number;completed:number}>(),[error,setError]=useState(''),[busy,setBusy]=useState(false),[done,setDone]=useState(false);
 const sources=[{key:storage,label:'当前孩子的旧本机记录'},{key:STORAGE_KEY,label:'本机游客记录'}].filter(x=>{try{return !!localStorage.getItem(x.key);}catch{return false;}});
 if(!sources.length)return null;
 const inspect=()=>{try{const key=sources.some(s=>s.key===source)?source:sources[0].key;setSource(key);const raw=localStorage.getItem(key)!;const data=legacyProgressSchema.parse(JSON.parse(raw));setPreview({raw,attempts:data.attempts.length,completed:Object.values({...data.lessonProgress,[data.activeLesson]:data}).filter(x=>x.completed).length});setError('');}catch{setError('旧存档格式无法识别，原始数据已保留。');}};
 return <details className="legacy-notice"><summary>本机旧记录已保留 · 导入记录</summary><p>导入完成和继续位置；旧版对错仅作为历史自报记录，不计为新的独立掌握。原存档不会删除，已有云端位置优先。</p><label>记录来源<select value={sources.some(s=>s.key===source)?source:sources[0].key} onChange={e=>{setSource(e.target.value);setPreview(undefined);setDone(false);}}>{sources.map(s=><option value={s.key} key={s.key}>{s.label}</option>)}</select></label><label>导入到哪个孩子<select value={target} onChange={e=>{setTarget(e.target.value);setDone(false);}}>{family.learners.map(l=><option key={l.id} value={l.id}>{l.nickname}</option>)}</select></label><button disabled={disabled||busy} onClick={inspect}>查看导入摘要</button>{preview&&!done&&<div><p>将导入到「{family.learners.find(l=>l.id===target)?.nickname}」：{preview.completed} 节已完成课程，{preview.attempts} 条旧版作答记录。不同课程版本不能合并，可选择未学习的新档案。</p><button disabled={disabled||busy} onClick={async()=>{setBusy(true);setError('');try{const pending=await readLocal<OfflineRecord>(offlineKey(family.account.accountId,target));if(pending?.events.length||pending?.start)throw new Error('目标孩子还有待同步记录，请先完成同步');await cloudRequest(`/api/v1/learners/${target}/imports`,{source:'legacy_import',progress:JSON.parse(preview.raw)});setDone(true);}catch(e){setError(e instanceof Error?e.message:'导入失败，原始数据已保留');}finally{setBusy(false);}}}>确认导入所选孩子</button></div>}{done&&<p>导入完成，重复导入不会重复记录。<button onClick={()=>location.reload()}>重新读取进度</button></p>}{error&&<p role="alert">{error}</p>}</details>;
}
