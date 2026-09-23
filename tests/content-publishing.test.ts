import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {validatePublication} from '../apps/api/src/content-validation';
import {inspectUpload} from '../apps/api/src/content-media';
const fixture=()=>JSON.parse(readFileSync('content/manifest.json','utf8'));
describe('publication validation',()=>{
 it('accepts existing internal-preview material and editorial changes',()=>{const base=fixture(),m=fixture();m.lessons[0].title='一起认识家人';expect(validatePublication(m,base).lessons[0].title).toBe('一起认识家人');});
 it('ignores JSONB object key ordering',()=>{const m=fixture();const reorder=(value:any):any=>Array.isArray(value)?value.map(reorder):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).reverse().map(k=>[k,reorder(value[k])])):value;expect(()=>validatePublication(m,reorder(m))).not.toThrow();});
 it('requires new audio bytes, transcript and cues when story changes',()=>{
  const base=fixture(),m=fixture(),l=m.lessons[0],a=m.assets.find((a:any)=>a.id===`audio-${l.story.audio}`);
  l.story.text='爸爸妈妈和我一起看书呀。';expect(()=>validatePublication(m,base)).toThrow();
  a.text=l.story.text;a.cues.text=l.story.text;a.cues.starts=Array.from(l.story.text).map((_,i)=>i*.05);l.story.supportCharacters.push('呀');
  expect(()=>validatePublication(m,base)).toThrow('新录音');
 });
 it('rejects word transcript drift, lost cues, foreign steps and unsafe scene positions',()=>{
  let m=fixture();m.lessons[0].characters[0].word='我的家';expect(()=>validatePublication(m,fixture())).toThrow('音频文字');
  m=fixture();delete m.assets.find((a:any)=>a.id==='audio-word-wo').cues;expect(()=>validatePublication(m,fixture())).toThrow('时间点');
  m=fixture();m.lessons[0].steps[0].id='changed';expect(()=>validatePublication(m,fixture())).toThrow('步骤标识');
  m=fixture();m.huntScenes[0].slots[1].x=m.huntScenes[0].slots[0].x;m.huntScenes[0].slots[1].y=m.huntScenes[0].slots[0].y;expect(()=>validatePublication(m,fixture())).toThrow('过近');
 });
 it('rejects active image formats and truncated audio; derives duration from bytes',()=>{
  expect(()=>inspectUpload(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'))).toThrow();
  const bytes=readFileSync('apps/web/public/assets/audio/word-wo.wav');expect(inspectUpload(bytes).durationMs).toBeGreaterThan(0);expect(()=>inspectUpload(bytes.subarray(0,40))).toThrow();
 });
});
