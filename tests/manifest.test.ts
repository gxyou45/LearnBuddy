import { describe,it,expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { validateManifest } from '../packages/contracts/src/index';
const fixture=()=>JSON.parse(readFileSync('content/manifest.json','utf8'));
describe('database content manifest',()=>{
 it('preserves every lesson, word, story and reading cue',()=>{
  const m=validateManifest(fixture());
  expect(m.lessons).toHaveLength(10); expect(m.lessons.flatMap(l=>l.characters)).toHaveLength(30);
  expect(m.lessons.flatMap(l=>l.steps)).toHaveLength(150);
  expect(m.assets.filter(a=>a.cues)).toHaveLength(70);
 });
 it('rejects missing audio, foreign target and duplicate IDs',()=>{
  const a=fixture();a.assets=a.assets.filter((a:any)=>a.id!=='audio-word-wo');expect(()=>validateManifest(a)).toThrow('Missing audio');
  const b=fixture();b.lessons[0].steps[1].characterId='cat';expect(()=>validateManifest(b)).toThrow('Foreign character');
  const c=fixture();c.assets.push(c.assets[0]);expect(()=>validateManifest(c)).toThrow('Duplicate');
 });
 it('rejects invalid timing and unsafe storage paths',()=>{
  const a=fixture();a.assets.find((a:any)=>a.cues).cues.starts=[999];expect(()=>validateManifest(a)).toThrow();
  const b=fixture();b.assets[0].objectKey='../private.wav';expect(()=>validateManifest(b)).toThrow();
 });
});
