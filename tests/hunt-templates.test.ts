import {it,expect} from 'vitest';
import {createHash} from 'node:crypto';
import {huntTemplates,huntTemplate,createHuntRound,resolveHuntRound,type ContentManifest,type ImportedAsset} from '@learnbuddy/contracts';
import {applyHuntTemplate} from '../apps/web/src/admin/HuntTemplatePicker';
import {validatePublication} from '../apps/api/src/content-validation';
import {inspectUpload} from '../apps/api/src/content-media';
import {manifest} from './content-fixture';
const assetFor=(t:typeof huntTemplates[number]):ImportedAsset=>{
 const sha256=createHash('sha256').update(t.svg).digest('hex');
 return {id:`image-hunt-${t.id}`,kind:'image',sha256,bytes:Buffer.byteLength(t.svg),objectKey:`assets/images/${sha256}.svg`,mimeType:'image/svg+xml',source:'test',reviewStatus:'pending'};
};
it('ships distinct, static text-free scenes with seven mobile-safe slots',()=>{
 expect(huntTemplates).toHaveLength(2);expect(new Set(huntTemplates.map(t=>t.svg)).size).toBe(2);
 expect(()=>huntTemplate('unknown')).toThrow();
 for(const t of huntTemplates){
  expect(t.svg).not.toMatch(/<text|<script|foreignObject|\son\w+=|href=|<image/i);
  expect(t.svg).toContain('preserveAspectRatio="none"');
  expect(t.slots).toHaveLength(7);expect(new Set(t.slots.map(s=>s.id)).size).toBe(7);
  // Includes the narrow editor card (220px); learning scene is wider.
  for(const width of [220,272,345])for(const [i,a] of t.slots.entries()){
   const x=a.x*width/100,y=a.y*width*.7/100;
   expect(Math.min(x,width-x,y,width*.7-y)).toBeGreaterThanOrEqual(24);
   for(const b of t.slots.slice(i+1))expect(Math.abs(a.x-b.x)*width/100>=48||Math.abs(a.y-b.y)*width*.7/100>=48).toBe(true);
  }
  expect(()=>inspectUpload(Buffer.from(t.svg))).toThrow(/仅支持/); // Public upload whitelist is unchanged.
 }
});
it('applies templates only to a draft scene, keeps lesson IDs and validates publication',()=>{
 for(const t of huntTemplates){
  const m=structuredClone(manifest) as ContentManifest,sceneId=m.huntScenes[0].id,original=structuredClone(m),asset=assetFor(t);
  applyHuntTemplate(m,sceneId,t.id,asset);applyHuntTemplate(m,sceneId,t.id,asset);
  expect(m.assets.filter(a=>a.id===asset.id)).toHaveLength(1);
  expect(m.lessons).toEqual(original.lessons);expect(m.huntScenes[0].themeIds).toEqual(original.huntScenes[0].themeIds);
  expect(m.huntScenes.slice(1)).toEqual(original.huntScenes.slice(1));expect(manifest).toEqual(original);
  expect(()=>validatePublication(m,original)).not.toThrow();
  const targets=[...m.lessons[0].characters,{id:'extra-one'},{id:'extra-two'}];
  const round=createHuntRound(m.huntScenes[0],asset.sha256,targets,0,0,'sample');
  expect(resolveHuntRound(round,m.huntScenes[0],asset.sha256,targets)).toHaveLength(5);
  expect(()=>applyHuntTemplate(m,sceneId,t.id,{...asset,sha256:'a'.repeat(64)})).toThrow(/冲突/);
 }
});
