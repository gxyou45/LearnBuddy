import {it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {validateManifest,isCompatibleExpansion} from '../packages/contracts/src/index';
import {validatePublication} from '../apps/api/src/content-validation';
const base=()=>validateManifest(JSON.parse(readFileSync('content/manifest.json','utf8')));
function expanded(){const m=base(),l=structuredClone(m.lessons[0]);l.id='extension';l.characters=l.characters.map((c,i)=>({...c,id:`extra-${i}`,audio:c.audio}));l.steps=l.steps.map(s=>({...s,audio:s.kind==='word'?`word-extra-${['wo','ba','ma'].indexOf(s.characterId!)}`:s.audio,characterId:s.characterId?l.characters[['wo','ba','ma'].indexOf(s.characterId)].id:undefined}));for(let i=0;i<3;i++){const a=m.assets.find(a=>a.id===`audio-word-${['wo','ba','ma'][i]}`)!;m.assets.push({...a,id:`audio-word-extra-${i}`});}m.lessons.push(l);m.releaseId='extended';return m;}
it('recognizes only strictly additive upgrades and rejects rewritten or reordered history',()=>{
 const old=base(),next=expanded();expect(isCompatibleExpansion(next,old)).toBe(true);
 next.lessons[0].story.text+='新';expect(isCompatibleExpansion(next,old)).toBe(false);
 const shuffled=expanded();shuffled.lessons.reverse();expect(isCompatibleExpansion(shuffled,old)).toBe(false);
 const asset=expanded();asset.assets[0].sha256='a'.repeat(64);expect(isCompatibleExpansion(asset,old)).toBe(false);
 expect(isCompatibleExpansion(old,expanded())).toBe(false);
});
it('allows 3–5 characters while requiring enough distinct hunt slots',()=>{
 const old=base(),next=expanded(),l=next.lessons.at(-1)!;
 l.characters.push({...l.characters[0],id:'extra-four'});next.assets.push({...next.assets.find(a=>a.id==='audio-word-extra-0')!,id:'audio-word-extra-four'});
 expect(validateManifest(next).lessons.at(-1)!.characters).toHaveLength(4);
 expect(()=>validatePublication(next,old)).toThrow('位置');
 l.characters.push({...l.characters[0],id:'extra-five'},{...l.characters[0],id:'extra-six'});
 expect(()=>validateManifest(next)).toThrow();
});
