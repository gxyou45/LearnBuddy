import {validateManifest, type ContentManifest} from '@learnbuddy/contracts';

/** Publication is stricter than saving an incomplete editorial draft. */
export function validatePublication(input:unknown, base:ContentManifest):ContentManifest {
 const m=validateManifest(input);
 base=validateManifest(base); // PostgreSQL JSONB reorders object keys; compare parsed canonical shapes.
 if(m.contentVersion!==base.contentVersion) throw new Error('本阶段不能变更学习存档格式');
 const same=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b);
 if(!same(m.lessons.slice(0,base.lessons.length).map(l=>l.id),base.lessons.map(l=>l.id)) || !same(m.themes.slice(0,base.themes.length),base.themes)) throw new Error('扩容必须保留已有课程目录和主题结构');
 const assets=new Map(m.assets.map(a=>[a.id,a]));
 const transcript=(key:string,text:string,cues=false)=>{
  const a=assets.get(`audio-${key}`);
  if(a?.text!==text) throw new Error(`音频文字不一致：${key}`);
  if(cues && (!a.cues || a.cues.text!==text)) throw new Error(`请补齐逐字时间点：${key}`);
 };
 for(const l of m.lessons) {
  const original=base.lessons.find(b=>b.id===l.id);
  if(original && (l.theme!==original.theme || !same(l.characters.map(c=>({id:c.id,text:c.text,audio:c.audio})),original.characters.map(c=>({id:c.id,text:c.text,audio:c.audio}))) || !same(l.steps.map(s=>({id:s.id,kind:s.kind,characterId:s.characterId})),original.steps.map(s=>({id:s.id,kind:s.kind,characterId:s.characterId}))))) throw new Error(`保留课程、汉字与步骤标识：${l.id}`);
  transcript(l.introAudio,l.intro);
  transcript(l.story.audio,l.story.text,true);
  for(const c of l.characters) {transcript(c.audio,c.audioText||c.text,true);transcript(`word-${c.id}`,c.word,true);}
  for(const s of l.steps) {
   const c=l.characters.find(c=>c.id===s.characterId);
   const expected=s.kind==='intro'?l.introAudio:s.kind==='story'?l.story.audio:s.kind==='word'?`word-${c?.id}`:['teach','sound'].includes(s.kind)?c?.audio:undefined;
   if(expected && s.audio!==expected) throw new Error(`步骤音频未同步：${l.id}/${s.id}`);
  }
  const taught=new Set(m.lessons.slice(0,m.lessons.indexOf(l)+1).flatMap(l=>l.characters.map(c=>c.text)));
  const support=[...new Set(Array.from(l.story.text).filter(c=>/\p{Script=Han}/u.test(c)&&!taught.has(c)))];
  if(support.some(c=>!l.story.supportCharacters.includes(c)) || l.story.supportCharacters.some(c=>!l.story.text.includes(c))) throw new Error(`请检查故事陪读字：${l.id}`);
  const theme=m.themes.find(t=>t.order===l.theme)!;
  const scene=m.huntScenes.find(s=>s.themeIds.includes(theme.id));
  if(m.huntScenes.filter(s=>s.themeIds.includes(theme.id)).length!==1 || !scene || scene.slots.length<l.characters.length) throw new Error(`找字场景缺少位置：${l.id}`);
 }
 for(const a of m.assets) {
  const old=base.assets.find(b=>b.id===a.id);
  // A new transcript must not relabel old audio bytes, even under another asset ID.
  if(a.kind==='audio' && base.assets.some(b=>b.sha256===a.sha256 && b.text!==a.text)) throw new Error(`文字改变后请上传对应的新录音：${a.id}`);
  if(old && old.kind!==a.kind) throw new Error(`素材类型不能改变：${a.id}`);
  const ext=a.mimeType==='audio/wav'?'wav':a.mimeType==='image/png'?'png':'svg';
  if(a.objectKey!==`assets/${a.kind==='audio'?'audio':'images'}/${a.sha256}.${ext}`) throw new Error(`素材路径与类型不一致：${a.id}`);
 }
 for(const s of m.huntScenes) {
  for(const p of s.slots) if(p.x<10||p.x>90||p.y<10||p.y>90) throw new Error(`找字位置过于靠近边缘：${s.id}`);
  for(let i=0;i<s.slots.length;i++)for(let j=0;j<i;j++)if(Math.abs(s.slots[i].x-s.slots[j].x)<20 && Math.abs(s.slots[i].y-s.slots[j].y)<20) throw new Error(`找字位置过近：${s.id}`);
 }
 return m;
}
