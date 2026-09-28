import {expect,it} from 'vitest';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {readFileSync} from 'node:fs';
import {HuntBackground,isPlainGarden} from '../apps/web/src/HuntBackground';
import {manifest as baseline} from './content-fixture';

it('removes the five baked-in frames from known static curriculum scenes only',()=>{
 const manifest=JSON.parse(readFileSync('apps/web/public/static-content/manifest.json','utf8'));
 for(const scene of manifest.huntScenes.filter((s:any)=>s.id.startsWith('curriculum-scene-'))){
  const asset=manifest.assets.find((a:any)=>a.id===scene.imageAssetId);
  const original=readFileSync(`apps/web/public/static-content/files/${asset.objectKey}`,'utf8');
  expect((original.match(/<rect /g)||[]).length).toBe(6);
  const rendered=renderToStaticMarkup(createElement(HuntBackground,{id:asset.id,sha256:asset.sha256,alt:scene.description}));
  expect((rendered.match(/<rect /g)||[]).length).toBe(1);
  expect(rendered).not.toContain('#c7af83');
  expect(rendered).toContain(original.match(/rx="26" fill="[^"]+"/)![0]);
  expect((rendered.match(/<path /g)||[]).length).toBe(5);
 }
});
it('leaves authored and unknown scene assets on the original image path',()=>{
 const asset=baseline.assets.find((a:any)=>a.kind==='image');
 expect(isPlainGarden(asset.sha256)).toBe(false);
 expect(isPlainGarden('constructor')).toBe(false);
 const rendered=renderToStaticMarkup(createElement(HuntBackground,{id:asset.id,sha256:asset.sha256,alt:'原画'}));
 expect(rendered).toContain('<img');
 expect(rendered).not.toContain('<svg');
});
