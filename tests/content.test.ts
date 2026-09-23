import { expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { characters, getSteps, lessons } from '../apps/web/src/content';
it('contains ten complete lessons with thirty unique characters across three themes',()=>{
 expect(lessons).toHaveLength(10);expect(new Set(lessons.map(l=>l.id)).size).toBe(10);
 expect(characters).toHaveLength(30);expect(new Set(characters.map(c=>c.id)).size).toBe(30);expect(new Set(characters.map(c=>c.text)).size).toBe(30);
 expect([0,1,2].map(t=>lessons.filter(l=>l.theme===t).length)).toEqual([3,4,3]);
 for(const l of lessons){const steps=getSteps(l);expect(l.characters).toHaveLength(3);expect(steps).toHaveLength(15);expect(new Set(steps.map(s=>s.id)).size).toBe(15);expect(steps.slice(-2).map(s=>s.kind)).toEqual(['hunt','story']);for(const c of l.characters) expect(steps.filter(s=>s.characterId===c.id).map(s=>s.kind)).toEqual(['teach','word','sound','meaning']);}
});
it('every playable reference resolves to a nonempty WAV file',()=>{
 for(const id of new Set(lessons.flatMap(l=>getSteps(l).map(s=>s.audio)))){const path=`apps/web/public/assets/audio/${id}.wav`;expect(existsSync(path),path).toBe(true);const b=readFileSync(path);expect(b.length).toBeGreaterThan(1000);expect(b.toString('ascii',0,4)).toBe('RIFF');}
});
it('sentences match audio transcripts and unfamiliar characters are explicitly listed',()=>{
 const transcripts=JSON.parse(readFileSync('scripts/audio-texts.json','utf8'));
 const known=new Set<string>();
 for(const l of lessons){l.characters.forEach(c=>known.add(c.text));expect(getSteps(l).at(-1)?.audio).toBe(l.story.audio);expect(transcripts[l.story.audio]).toBe(l.story.text);const covered=new Set([...known,...l.story.supportCharacters]);for(const c of l.story.text.match(/\p{Script=Han}/gu)??[]) expect(covered.has(c),`${l.id}: ${c}`).toBe(true);for(const c of l.characters) expect(l.story.text.includes(c.text),`${l.id} missing ${c.text}`).toBe(true);}
});
