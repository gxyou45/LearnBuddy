import {useEffect,useState} from 'react';
import {manifestSchema,type ContentManifest,type ImportedAsset} from '@learnbuddy/contracts';
import './admin.css';
import {WordVisual} from '../visuals/WordVisual';
import {wordVisual} from '../visuals/resolveWordVisual';
type Draft={id:string;baseReleaseId:string;revision:number;manifest:ContentManifest;publishedReleaseId:string|null};
type Overview={channel:{releaseId:string;revision:number};releases:{id:string;createdAt:string}[];drafts:Omit<Draft,'manifest'>[];audit:{id:string;action:string;targetId:string;createdAt:string}[]};
async function request<T>(path:string,body?:unknown,method=body?'POST':'GET'):Promise<T> {
 const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),90000);
 try {
  const r=await fetch(`/api/v1/admin${path}`,{method,credentials:'same-origin',cache:'no-store',signal:controller.signal,headers:body?{'Content-Type':'application/json'}:undefined,body:body?JSON.stringify(body):undefined});
  const data=await r.json();if(!r.ok)throw new Error(data.errors?.join('；')||data.error?.message||'操作失败');return data;
 }finally{clearTimeout(timer);}
}
const url=(a:ImportedAsset)=>`/api/v1/admin/media/${a.sha256}`;
export default function Admin() {
 const [overview,setOverview]=useState<Overview>();const [draft,setDraft]=useState<Draft>();
 const [lessonId,setLessonId]=useState('');const [assetId,setAssetId]=useState('');
 const [error,setError]=useState('');const [notice,setNotice]=useState('');const [busy,setBusy]=useState(false);
 const [dirty,setDirty]=useState(false);const [validated,setValidated]=useState<number>();
 const [tab,setTab]=useState<'lesson'|'assets'|'scenes'|'preview'>('lesson');
 async function refresh(){setOverview(await request<Overview>('/content'));}
 async function run(fn:()=>Promise<void>){setBusy(true);setError('');setNotice('');try{await fn();}catch(e){setError(e instanceof Error?e.message:'连接失败，请重试');}finally{setBusy(false);}}
 useEffect(()=>{void run(refresh);},[]);
 useEffect(()=>{const before=(e:BeforeUnloadEvent)=>{if(dirty)e.preventDefault();};addEventListener('beforeunload',before);return()=>removeEventListener('beforeunload',before);},[dirty]);
 function open(d:Draft){setDraft({...d,manifest:manifestSchema.parse(d.manifest)});setLessonId(d.manifest.lessons[0].id);setAssetId(d.manifest.assets[0].id);setDirty(false);setValidated(undefined);}
 function change(fn:(m:ContentManifest)=>void){if(!draft)return;const m=structuredClone(draft.manifest);fn(m);setDraft({...draft,manifest:m});setDirty(true);setValidated(undefined);}
 const m=draft?.manifest,l=m?.lessons.find(l=>l.id===lessonId),asset=m?.assets.find(a=>a.id===assetId);
 const editable=!!draft&&!draft.publishedReleaseId;
 const canLeave=()=>!dirty||confirm('当前草稿有未保存修改，确定放弃这些修改？');
 return <main className="admin-shell"><header className="admin-header"><div><p>汉字小屋 · 内容工作台</p><h1>课程管理与发布</h1></div><a href="/">返回学习小屋</a></header>
 <p className="admin-muted">编辑草稿后先保存、校验和预览，再发布。已发布版本会保留，正在学习的档案继续使用原版本。当前素材仍待人工审校，仅供内部体验。</p>
 {error&&<p className="admin-error" role="alert">{error}</p>}{notice&&<p className="admin-notice" role="status">{notice}</p>}
 {!overview?<section><p>需要使用内容管理员账户登录。</p><a href="/#account">前往家长账户登录</a><button disabled={busy} onClick={()=>void run(refresh)}>重新检查权限</button></section>:<>
 <section className="admin-panel"><h2>当前版本</h2><code>{overview.channel.releaseId}</code><button disabled={busy} onClick={()=>{if(canLeave())void run(async()=>{open(await request<Draft>('/drafts',{baseReleaseId:overview.channel.releaseId}));await refresh();setNotice('已从当前版本创建草稿');});}}>新建草稿</button>
 <details><summary>版本历史与回滚</summary>{overview.releases.map(r=><div className="admin-row" key={r.id}><code>{r.id}</code><time>{new Date(r.createdAt).toLocaleString()}</time><button disabled={busy||r.id===overview.channel.releaseId} onClick={()=>{if(confirm(`启用版本 ${r.id}？新学习档案将读取此版本，已有学习记录保持原版本。`))void run(async()=>{await request(`/releases/${r.id}/activate`,{channelRevision:overview.channel.revision});await refresh();setNotice('当前版本已切换');});}}>{r.id===overview.channel.releaseId?'当前使用':'启用此版本'}</button></div>)}</details></section>
 <div className="admin-workspace"><aside className="admin-panel"><h2>草稿</h2>{overview.drafts.length===0&&<p>暂无草稿，请先新建。</p>}{overview.drafts.map(d=><button className="admin-draft" key={d.id} disabled={busy} aria-pressed={draft?.id===d.id} onClick={()=>{if(canLeave())void run(async()=>open(await request<Draft>(`/drafts/${d.id}`)));}}>{d.publishedReleaseId?'已发布':'待发布'} · 修订 {d.revision}<small>{d.id.slice(0,8)}</small></button>)}</aside>
 <section className="admin-panel admin-editor">{draft&&m&&l?<><h2>{draft.publishedReleaseId?'已发布草稿':'编辑草稿'}{dirty?' · 未保存':''}</h2><p className="admin-muted">草稿 {draft.id.slice(0,8)} · 修订 {draft.revision}</p>
 <div className="admin-toolbar"><button disabled={busy||!editable||!dirty} onClick={()=>void run(async()=>{const next=await request<Draft>(`/drafts/${draft.id}`,{revision:draft.revision,manifest:m},'PUT');setDraft(next);setDirty(false);setValidated(undefined);await refresh();setNotice('草稿已保存');})}>保存草稿</button><button disabled={busy||dirty||!editable} onClick={()=>void run(async()=>{const result=await request<{revision:number}>(`/drafts/${draft.id}/validate`,{});setValidated(result.revision);setNotice('技术校验通过，请预览并审听修改内容。人工审校状态仍为待审。');setTab('preview');})}>校验并预览</button><button className="primary" disabled={busy||dirty||!editable||validated!==draft.revision} onClick={()=>{if(confirm('发布此草稿并设为当前内部体验版本？已在学档案继续使用原版本。'))void run(async()=>{const result=await request<{releaseId:string}>('/releases',{draftId:draft.id,revision:draft.revision,channelRevision:overview.channel.revision});setDraft({...draft,publishedReleaseId:result.releaseId});setValidated(undefined);await refresh();setNotice(`已发布：${result.releaseId}`);});}}>发布为当前版本</button></div>
 <nav className="admin-tabs" aria-label="内容编辑栏目">{(['lesson','assets','scenes','preview'] as const).map(t=><button key={t} aria-pressed={tab===t} onClick={()=>setTab(t)}>{{lesson:'课程与故事',assets:'素材与声音',scenes:'找字场景',preview:'预览'}[t]}</button>)}</nav>
 <label>选择课程<select value={lessonId} onChange={e=>setLessonId(e.target.value)}>{m.lessons.map(l=><option key={l.id} value={l.id}>{l.title}</option>)}</select></label>
 <fieldset disabled={busy||!editable}>
 {tab==='lesson'&&<><Field label="课程名称" value={l.title} onChange={value=>change(m=>{m.lessons.find(x=>x.id===l.id)!.title=value;})}/><Field label="开场文字" value={l.intro} onChange={value=>change(m=>{const lesson=m.lessons.find(x=>x.id===l.id)!;lesson.intro=value;lesson.steps.filter(s=>s.kind==='intro').forEach(s=>s.title=value);})}/><Field label="亲子生活任务" value={l.lifeTask} onChange={value=>change(m=>{m.lessons.find(x=>x.id===l.id)!.lifeTask=value;})}/>
 <h3>词语与例句</h3>{l.characters.map(c=><div className="admin-card" key={c.id}><strong>{c.text}</strong><Field label={`${c.text}的词语`} value={c.word} onChange={value=>change(m=>{m.lessons.find(x=>x.id===l.id)!.characters.find(x=>x.id===c.id)!.word=value;})}/><Field label={`${c.text}的例句`} value={c.example} onChange={value=>change(m=>{const lesson=m.lessons.find(x=>x.id===l.id)!;lesson.characters.find(x=>x.id===c.id)!.example=value;lesson.steps.filter(s=>s.kind==='teach'&&s.characterId===c.id).forEach(s=>s.subtitle=value);})}/></div>)}
 <h3>故事</h3><Field label="故事文字" value={l.story.text} onChange={value=>change(m=>{m.lessons.find(x=>x.id===l.id)!.story.text=value;})}/><Field label="陪读提示" value={l.story.note} onChange={value=>change(m=>{m.lessons.find(x=>x.id===l.id)!.story.note=value;})}/><Field label="陪读字（用逗号分隔）" value={l.story.supportCharacters.join('、')} onChange={value=>change(m=>{m.lessons.find(x=>x.id===l.id)!.story.supportCharacters=value.split(/[,，、\s]+/).filter(Boolean);})}/><p className="admin-muted">修改开场、词语或故事后，请在“素材与声音”上传对应录音，填写录音文字和逐字时间点。</p></>}
 {tab==='assets'&&<><label>选择素材<select value={assetId} onChange={e=>setAssetId(e.target.value)}>{m.assets.map(a=><option key={a.id} value={a.id}>{a.id}</option>)}</select></label>{asset&&<AssetEditor key={asset.id+asset.sha256} asset={asset} update={next=>change(m=>{m.assets[m.assets.findIndex(a=>a.id===next.id)]=next;})} upload={file=>void run(async()=>{
 const response=await fetch('/api/v1/admin/uploads',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/octet-stream'},body:file});const result=await response.json();if(!response.ok)throw new Error(result.error?.message||'上传失败');
 const kind=result.mimeType==='audio/wav'?'audio':'image';if(kind!==asset.kind)throw new Error('上传文件类型与所选素材不一致');
 const {objectKey,sha256,bytes,mimeType,durationMs}=result;change(m=>{m.assets[m.assets.findIndex(a=>a.id===asset.id)]={...asset,objectKey,sha256,bytes,mimeType,...(durationMs?{durationMs}:{}),source:file.name};});setNotice('素材已上传，保存草稿后才能校验与发布。');
 })}/>}</>}
 {tab==='scenes'&&<><p>本轮编辑已有场景和位置；六幅新场景将在后续阶段制作。</p>{m.huntScenes.map((scene,i)=><div className="admin-card" key={scene.id}><h3>{scene.id}</h3><Field label="场景说明" value={scene.description} onChange={v=>change(m=>{m.huntScenes[i].description=v;})}/><label>场景图片<select value={scene.imageAssetId} onChange={e=>change(m=>{m.huntScenes[i].imageAssetId=e.target.value;})}>{m.assets.filter(a=>a.kind==='image').map(a=><option key={a.id}>{a.id}</option>)}</select></label>{scene.slots.map((slot,j)=><div className="admin-row" key={slot.id}><strong>{slot.id}</strong>{(['x','y'] as const).map(axis=><label key={axis}>{axis} (%)<input type="number" min="10" max="90" value={slot[axis]} onChange={e=>change(m=>{m.huntScenes[i].slots[j][axis]=Number(e.target.value);})}/></label>)}<Field label="位置提示" value={slot.clue} onChange={v=>change(m=>{m.huntScenes[i].slots[j].clue=v;})}/></div>)}</div>)}</>}
 </fieldset>
 {tab==='preview'&&<Preview key={lessonId} manifest={m} lesson={l}/>}
 </>:<p>选择一个草稿，或从当前版本新建草稿。</p>}</section></div>
 <details className="admin-panel"><summary>最近操作记录</summary>{overview.audit.map(a=><p key={a.id}>{new Date(a.createdAt).toLocaleString()} · {({ 'create-draft':'创建草稿','save-draft':'保存草稿',publish:'发布版本',activate:'切换版本','grant-admin-cli':'授予管理员权限'} as Record<string,string>)[a.action]||a.action} · <code>{a.targetId}</code></p>)}</details>
 </> }</main>;
}
function Field({label,value,onChange}:{label:string;value:string;onChange:(value:string)=>void}) {return <label>{label}<input value={value} onChange={e=>onChange(e.target.value)}/></label>;}
function AssetEditor({asset,update,upload}:{asset:ImportedAsset;update:(asset:ImportedAsset)=>void;upload:(file:File)=>void}) {
 const [starts,setStarts]=useState(asset.cues?.starts.join(', ')||'');
 return <div className="admin-card"><p>{asset.kind==='audio'?'音频':'图片'} · {(asset.bytes/1024).toFixed(1)} KB · 待人工审校</p>{asset.kind==='audio'?<audio controls src={url(asset)}/>:<img className="admin-image" src={url(asset)} alt="素材预览"/>}
 <label>替换文件（{asset.kind==='audio'?'PCM WAV，最多 3 分钟':'PNG，最大 4096×4096'}，最多 20 MB）<input type="file" accept={asset.kind==='audio'?'.wav':'.png'} onChange={e=>{const file=e.target.files?.[0];if(file)upload(file);e.target.value='';}}/></label>
 <Field label="素材来源" value={asset.source} onChange={source=>update({...asset,source})}/>
 {asset.kind==='audio'&&<><Field label="录音文字" value={asset.text||''} onChange={text=>update({...asset,text,cues:asset.cues?{...asset.cues,text}:undefined})}/><label>逐字起点（秒，用逗号分隔）<textarea value={starts} onChange={e=>{const raw=e.target.value;setStarts(raw);const values=raw.trim()?raw.split(/[,，\s]+/).filter(Boolean).map(Number):[];update({...asset,cues:{text:asset.text||'',starts:values,status:'estimated'}});}}/></label><p className="admin-muted">每个字符（含标点）对应一个起点，按顺序填写，不能超过录音时长。这里仍标记为估算时间点。</p></>}
 </div>;
}
function Preview({manifest,lesson}:{manifest:ContentManifest;lesson:ContentManifest['lessons'][number]}) {
 const [step,setStep]=useState(0),[time,setTime]=useState(-1);
 const s=lesson.steps[step],c=lesson.characters.find(c=>c.id===s.characterId),a=manifest.assets.find(a=>a.id===`audio-${s.audio}`)!;
 const text=s.kind==='story'?lesson.story.text:s.kind==='word'?c?.word:s.kind==='teach'?c?.text:undefined;
 const image=manifest.assets.find(a=>a.id===lesson.imageAssetId)!;
 const theme=manifest.themes.find(t=>t.order===lesson.theme)!;const scene=manifest.huntScenes.find(s=>s.themeIds.includes(theme.id));
 const active=a?.cues?.starts.reduce((found,start,i)=>start<=time?i:found,-1)??-1;
 return <section className="admin-preview"><h3>课程预览 · {lesson.title}</h3><label>选择步骤<select value={step} onChange={e=>{setStep(Number(e.target.value));setTime(-1);}}>{lesson.steps.map((s,i)=><option key={s.id} value={i}>{i+1}. {s.title} {s.characterId||''}</option>)}</select></label><h4>{s.title}</h4><p>{s.subtitle}</p>
 {['intro','story'].includes(s.kind)&&<img className="admin-image" src={url(image)} alt={lesson.title}/>}
 {text&&<p className="admin-reading">{Array.from(text).map((char,i)=><span key={i} className={i===active?'active':''}>{char}</span>)}</p>}
 {s.kind==='story'&&<p>{lesson.story.note}<br/>陪读字：{lesson.story.supportCharacters.join('、')}</p>}
 {['sound','meaning'].includes(s.kind)&&<div className="admin-row">{lesson.characters.map(c=><span className="admin-card" key={c.id}>{s.kind==='sound'?c.text:<>{wordVisual(c.word)||c.id.startsWith('han-')?<WordVisual word={c.word}/>:c.icon} {c.word}</>}</span>)}</div>}
 {s.kind==='hunt'&&scene&&<div className="admin-scene"><img src={url(manifest.assets.find(a=>a.id===scene.imageAssetId)!)} alt={scene.description}/>{scene.slots.slice(0,3).map((slot,i)=><span key={slot.id} style={{left:`${slot.x}%`,top:`${slot.y}%`}} title={slot.clue}>{lesson.characters[(i-manifest.lessons.indexOf(lesson)%3+3)%3].text}</span>)}</div>}
 {a&&<audio key={a.sha256+s.id} controls src={url(a)} onTimeUpdate={e=>setTime(e.currentTarget.currentTime)} onEnded={()=>setTime(-1)}/>}
 <p className="admin-muted">此预览用于检查文案、配图、音频和位置，不产生学习记录。</p></section>;
}
