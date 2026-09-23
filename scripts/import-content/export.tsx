import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve, dirname } from 'node:path';
import { lessons, themes, contentVersion, getSteps } from '../../apps/web/src/content';
import { readingTimings } from '../../apps/web/src/readingTimings';
import { LessonPicture } from '../../apps/web/src/LessonPicture';
import { HiddenCharacters } from './PrototypeHunt';
import { CharacterIllustration } from '../../apps/web/src/CharacterIllustration';
import { validateManifest, type ImportedAsset } from '../../packages/contracts/src/index';
const out = resolve(process.env.CONTENT_EXPORT_DIR || 'content');
const assets: ImportedAsset[] = [];
async function asset(id: string, kind: 'audio'|'image', data: Buffer, metadata = {}) {
 const sha256 = createHash('sha256').update(data).digest('hex');
 const objectKey = `assets/${kind === 'audio' ? 'audio' : 'images'}/${sha256}.${kind === 'audio' ? 'wav' : 'svg'}`;
 const path = resolve(out, 'files', objectKey); await mkdir(dirname(path), {recursive:true}); await writeFile(path,data);
 assets.push({id,kind,objectKey,sha256,bytes:data.length,mimeType:kind === 'audio'?'audio/wav':'image/svg+xml',source:'LearnBuddy prototype v4',reviewStatus:'pending',...metadata});
}
function duration(data: Buffer) {
 let rate=0, size=0;
 for(let p=12;p+8<=data.length;) {const tag=data.toString('ascii',p,p+4), n=data.readUInt32LE(p+4); if(tag==='fmt ') rate=data.readUInt32LE(p+16); if(tag==='data') size+=n; p+=8+n+(n%2);}
 if(!rate || !size) throw new Error('Invalid WAV'); return size/rate*1000;
}
const texts = JSON.parse(await readFile('scripts/audio-texts.json','utf8'));
for(const l of lessons) for(const c of l.characters) texts[`word-${c.id}`]=c.word;
for(const file of (await readdir('apps/web/public/assets/audio')).sort()) {
 if(!file.endsWith('.wav')) continue;
 const name=file.slice(0,-4), data=await readFile(`apps/web/public/assets/audio/${file}`);
 await asset(`audio-${name}`,'audio',data,{durationMs:duration(data),text:texts[name],...(readingTimings[name]?{cues:{...readingTimings[name],status:'estimated'}}:{})});
}
function svg(node: React.ReactNode) {
 const markup=renderToStaticMarkup(node).match(/<svg[\s\S]*?<\/svg>/)?.[0]; if(!markup) throw new Error('Missing SVG');
 return Buffer.from(markup.includes('xmlns=')?markup:markup.replace('<svg','<svg xmlns="http://www.w3.org/2000/svg"'));
}
for(const l of lessons) await asset(`image-lesson-${l.id}`,'image',svg(<LessonPicture lessonId={l.id}/>));
for(const c of lessons.flatMap(l=>l.characters).filter(c=>c.id==='lai')) await asset('image-character-lai','image',svg(<CharacterIllustration character={c}/>));
const huntScenes=[];
for(let i=0;i<themes.length;i++) {
 const id=`legacy-garden-${i}`, l=lessons.find(l=>l.theme===i)!;
 await asset(`image-${id}`,'image',svg(<HiddenCharacters lesson={l} found={[]} onFind={()=>{}} listen={()=>{}} next={()=>{}}/>));
 huntScenes.push({id,imageAssetId:`image-${id}`,themeIds:[`theme-${i}`],description:'原型花园场景；新场景和干扰项在后续阶段增加',slots:[{id:'kite',x:22,y:24,clue:'看看天上的小风筝。'},{id:'sign',x:72,y:51,clue:'看看小屋旁边的木牌。'},{id:'pot',x:32,y:80,clue:'看看花丛旁边的小花盆。'}]});
}
const manifest=validateManifest({schemaVersion:1,contentVersion,releaseId:`prototype-v${contentVersion}`,themes:themes.map((t,i)=>({...t,id:`theme-${i}`,order:i})),lessons:lessons.map(l=>({...l,steps:getSteps(l),imageAssetId:`image-lesson-${l.id}`})),assets,huntScenes});
await writeFile(resolve(out,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
console.log(`Exported ${manifest.lessons.length} lessons, ${assets.length} assets to ${out}`);
