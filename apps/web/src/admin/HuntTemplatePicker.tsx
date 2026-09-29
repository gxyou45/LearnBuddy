import {huntTemplates,createPlayHuntRound,resolveHuntRound,type ContentManifest,type ImportedAsset} from '@learnbuddy/contracts';
import {useState} from 'react';

export function applyHuntTemplate(manifest:ContentManifest,sceneId:string,templateId:string,asset:ImportedAsset) {
 const template=huntTemplates.find(t=>t.id===templateId),scene=manifest.huntScenes.find(s=>s.id===sceneId);
 if(!template||!scene)throw new Error('场景或模板不存在，请重新加载草稿');
 if(asset.id!==`image-hunt-${template.id}`||asset.kind!=='image'||asset.mimeType!=='image/svg+xml')throw new Error('场景素材不匹配');
 const existing=manifest.assets.find(a=>a.id===asset.id);
 if(existing&&existing.sha256!==asset.sha256)throw new Error('同名模板素材已修改，请先处理素材冲突');
 if(!existing)manifest.assets.push(asset);
 scene.imageAssetId=asset.id;scene.description=template.description;scene.slots=structuredClone(template.slots);
 // Keep the scene ID and theme assignments; never alter lesson IDs or learning records.
}

export function enableHuntPlay(manifest:ContentManifest,sceneId:string,assets:ImportedAsset[]) {
 const scene=manifest.huntScenes.find(s=>s.id===sceneId);if(!scene?.themeIds.length)throw new Error('请选择主题主场景');
 const sceneIds=huntTemplates.map(t=>`${sceneId}-${t.id}`);
 for(const [i,t] of huntTemplates.entries()){
  let variant=manifest.huntScenes.find(s=>s.id===sceneIds[i]);
  if(!variant){variant={id:sceneIds[i],imageAssetId:'image-pending',themeIds:[],description:'',slots:[]};manifest.huntScenes.push(variant);}
  if(variant.themeIds.length||variant.play)throw new Error('轮换场景标识冲突');
  const asset=assets.find(a=>a.id===`image-hunt-${t.id}`);if(!asset)throw new Error('模板素材不完整');
  applyHuntTemplate(manifest,variant.id,t.id,asset);
 }
 scene.play={sceneIds,distractorIds:manifest.lessons.flatMap(l=>l.characters).slice(0,15).map(c=>c.id)};
}

export function HuntTemplatePicker({apply}:{apply:(id:string)=>void}) {
 return <details className="hunt-template-picker"><summary>选用客厅／厨房模板</summary>
  <p className="admin-muted">原创 SVG，无文字或字框；每幅有 7 个安全位置。数字仅用于编辑预览，不会画进底图。会替换本场景的图片和位置，影响使用此场景的整个主题；保存、校验并发布前不影响学习端。素材仍待人工审校。</p>
  <div className="hunt-template-grid">{huntTemplates.map(t=><section key={t.id}><h4>{t.title}</h4>
   <div className="admin-scene hunt-template-preview"><img src={`data:image/svg+xml,${encodeURIComponent(t.svg)}`} alt={t.description}/>{t.slots.map((s,i)=><span key={s.id} title={s.clue} style={{left:`${s.x}%`,top:`${s.y}%`}}>{i+1}</span>)}</div>
   <button type="button" onClick={()=>apply(t.id)}>选用{t.title}</button>
  </section>)}</div>
 </details>;
}

export function PlayHuntPreview({manifest,lesson,primary}:{manifest:ContentManifest;lesson:ContentManifest['lessons'][number];primary:ContentManifest['huntScenes'][number]}) {
 const [choice,setChoice]=useState('');
 const scenes=manifest.huntScenes.filter(s=>primary.play!.sceneIds.includes(s.id));
 const chosen=scenes.find(s=>s.id===choice)||scenes[0];
 try{
  const pool=manifest.lessons.flatMap(l=>l.characters).filter(c=>primary.play!.distractorIds.includes(c.id));
  const round=createPlayHuntRound([chosen,...scenes.filter(s=>s.id!==chosen.id)].map(s=>({...s,sha256:manifest.assets.find(a=>a.id===s.imageAssetId)!.sha256})),lesson.characters,pool,0,0,'preview');
  const scene=scenes.find(s=>s.id===round.sceneId)!,asset=manifest.assets.find(a=>a.id===scene.imageAssetId)!;
  const places=resolveHuntRound(round,scene,asset.sha256,lesson.characters,pool),characters=[...lesson.characters,...pool];
  return <><label>预览轮换场景<select value={chosen.id} onChange={e=>setChoice(e.target.value)}>{scenes.map(s=><option key={s.id} value={s.id}>{s.description}</option>)}</select></label><p>本局目标：{places.filter(p=>p.isTarget).map(p=>characters.find(c=>c.id===p.characterId)!.text).join('、')}；其余为干扰字。</p><div className="admin-scene hunt-template-preview"><img src={`/api/v1/admin/media/${asset.sha256}`} alt={scene.description}/>{places.map(p=><span key={p.characterId} style={{left:`${p.x}%`,top:`${p.y}%`}} title={p.clue}>{characters.find(c=>c.id===p.characterId)!.text}</span>)}</div></>;
 }catch{return <p role="status">轮换场景或候选字池不完整，请先校验草稿。</p>;}
}
