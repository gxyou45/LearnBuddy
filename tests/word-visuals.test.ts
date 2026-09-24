import {it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {wordVisual} from '../apps/web/src/visuals/resolveWordVisual';
import {semanticScenes} from '../apps/web/src/visuals/semanticScenes';
import {sketches} from '../apps/web/src/visuals/sketches';
import entries from '../apps/web/src/visuals/word-visuals.json';
it('distinguishes fruit and animal meanings instead of assigning broad category icons',()=>{
 expect(['香蕉','葡萄','橙子'].map(w=>wordVisual(w)?.value)).toEqual(['🍌','🍇','🍊']);
 expect(new Set(['小牛','小羊','小马','小猪','小鸡'].map(w=>wordVisual(w)?.value)).size).toBe(5);
 expect(wordVisual('香甜')?.value).not.toBe('🍌');
 expect(wordVisual('大海')?.value).not.toBe(wordVisual('海豚')?.value);
});
it('uses drawings when a specific pictogram is unavailable, never a near-lookalike',()=>{
 for(const word of ['萝卜','红枣','蜻蜓','蝉鸣','橡皮','胶水','粽子'])expect(wordVisual(word)?.kind,word).toBe('sketch');
 expect(wordVisual('红色')).toEqual({kind:'color',value:'#d65345'});
 expect(wordVisual('八个')).toEqual({kind:'count',value:'8'});
});
it('abstract and unknown words do not inherit substring or theme images',()=>{
 for(const word of ['虽然','也许','香蕉味道','眼光','不认识的词'])expect(wordVisual(word),word).toBeUndefined();
});
it('every mapped drawing exists and contains no scripts, external links or foreign objects',()=>{
 for(const [word,v] of Object.entries(entries)){
  if(v.kind==='sketch'){
   expect(sketches[v.value],word).toBeTruthy();
   expect(sketches[v.value],word).not.toMatch(/<script|foreignObject|href=|onload=|undefined|NaN/i);
  }
 }
});
it('all published curriculum words resolve to a supported drawing type or explicit context fallback',()=>{
 const source=JSON.parse(readFileSync('课程设计/1000字课程.json','utf8'));
 const words=source.lessons.flatMap((l:any)=>l.words.map((w:any)=>w.word));
 expect(words).toHaveLength(1000);
 for(const word of words){const v=wordVisual(word);if(v)expect(['emoji','sketch','scene','color','count','symbol']).toContain(v.kind);}
});

it('represents actions and relationships with explicit meaning scenes, not substring guesses',()=>{
 for(const [word,key] of [['我和你','together'],['他来','man-approach'],['吃饭','eat'],['吃东西','eat'],['跳一跳','jump-rope']]){
  expect(wordVisual(word)).toMatchObject({kind:'scene',value:key});
  expect(wordVisual(word)?.description?.length).toBeGreaterThan(5);
 }
 expect(wordVisual('力气')).toMatchObject({kind:'emoji',value:'💪'});
 expect(wordVisual('他来')?.value).not.toEqual(wordVisual('她来')?.value);
 expect(wordVisual('前面')?.value).not.toEqual(wordVisual('后面')?.value);
 expect(wordVisual('吃饭以后')).toBeUndefined();
});
it('every meaning scene has an explanation and valid self-contained SVG source',()=>{
 for(const [word,v] of Object.entries(entries))if(v.kind==='scene'){
  expect(v.description,word).toBeTruthy();
  expect(semanticScenes[v.value],word).toBeTruthy();
  expect(semanticScenes[v.value],word).not.toMatch(/<script|foreignObject|href=|on\w+=|undefined|NaN/i);
 }
});
