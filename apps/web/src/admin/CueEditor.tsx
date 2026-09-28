import {useRef,useState} from 'react';
import {readingPosition,validateReadingCues,type ImportedAsset,type ReadingCues} from '@learnbuddy/contracts';

export function CueEditor({asset,update,src}:{asset:ImportedAsset;update:(asset:ImportedAsset)=>void;src:string}) {
 const audio=useRef<HTMLAudioElement>(null);
 const [time,setTime]=useState(0),[error,setError]=useState('');
 const cues:ReadingCues=asset.cues??{text:asset.text??'',starts:Array.from(asset.text??'',()=>0),status:'estimated'};
 const active=readingPosition(cues,time).current;
 function edit(index:number,field:'starts'|'ends',value:number) {
  const next={...cues,status:'estimated' as const,audioSha256:undefined};
  next[field]=[...(cues[field]??cues.starts.map((_,i)=>cues.starts[i+1]??(asset.durationMs??0)/1000))];
  next[field][index]=value;update({...asset,cues:next});setError('');
 }
 return <section aria-label="逐字时间校准"><audio ref={audio} controls src={src} onTimeUpdate={e=>setTime(e.currentTarget.currentTime)} onEnded={()=>setTime(0)} onError={()=>{setTime(0);setError('录音加载失败，请检查录音后重试。');}}/>
 <p>时间点：{cues.status==='reviewed'?'已审听校准':'估算／待审听'} · 当前 {time.toFixed(3)} 秒</p>
 <p className="admin-muted">先听录音，暂停后可记录当前时间。每个字符含标点各占一行；标点可用相同起止时间表示静音。结束点不得晚于下一个字的起点。改字或换录音后需重新审听。</p>
 {Array.from(cues.text).map((char,i)=><div className="admin-row" key={i}>
 <strong aria-current={i===active?'true':undefined}>{i+1}. {char}</strong>
 {(['starts','ends'] as const).map(field=><label key={field}>{char}第{i+1}位{field==='starts'?'起点':'终点'}
 <input aria-label={`${char}第${i+1}位${field==='starts'?'起点':'终点'}`} type="number" min="0" step="0.001" value={cues[field]?.[i]??''} onChange={e=>edit(i,field,e.currentTarget.valueAsNumber)}/>
 <button type="button" onClick={()=>edit(i,field,Math.round((audio.current?.currentTime??0)*1000)/1000)}>记录当前{field==='starts'?'起点':'终点'}</button></label>)}
 <button type="button" onClick={()=>{if(audio.current){audio.current.currentTime=cues.starts[i];setTime(cues.starts[i]);void audio.current.play().catch(()=>setError('播放失败，请点录音播放按钮重试。'));}}}>从此字试听</button>
 </div>)}
 <button type="button" onClick={()=>{try{const reviewed:ReadingCues={...cues,status:'reviewed',audioSha256:asset.sha256};validateReadingCues(reviewed,asset.text,asset.sha256,asset.durationMs);update({...asset,cues:reviewed});setError('');}catch(e){setError(`暂不能确认：请检查所有起止时间、文字和录音版本（${e instanceof Error?e.message:'格式错误'}）。`);}}}>我已逐字审听，确认时间点</button>
 {error&&<p role="alert" className="admin-error">{error}</p>}
 </section>;
}
