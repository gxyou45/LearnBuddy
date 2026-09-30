import {it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {interactionPilot,pilotFor,journeyProgress,guestSolvedSteps} from '../apps/web/src/interactionPilot';
import {strokeData} from '../apps/web/src/strokeData';
import {sampleStroke,traceForward,canResumeStroke} from '../apps/web/src/traceGeometry';
import type {Attempt} from '../apps/web/src/progress';
const manifest=JSON.parse(readFileSync('apps/web/public/static-content/manifest.json','utf8'));
it('pins both interactions to the actual first ten lessons of this release',()=>{
 expect(interactionPilot.map(p=>p.lessonId)).toEqual(manifest.lessons.slice(0,10).map((l:any)=>l.id));
 for(const [i,lesson]of manifest.lessons.entries()){
  const pilot=pilotFor(manifest.releaseId,lesson,manifest.lessons);
  expect(!!pilot).toBe(i<10);
  if(pilot){expect(lesson.characters.some((c:any)=>c.id===pilot.characterId&&c.text===pilot.text)).toBe(true);expect(strokeData[pilot.text]).toBeDefined();}
 }
 expect(pilotFor('other-release',manifest.lessons[0],manifest.lessons)).toBeUndefined();
 expect(pilotFor(manifest.releaseId,manifest.lessons[0],[...manifest.lessons].reverse())).toBeUndefined();
});
it('bundles all ten original data records, with matching ordered medians and license',()=>{
 for(const p of interactionPilot){
  const data=strokeData[p.text];
  expect(data).toEqual(JSON.parse(readFileSync(`apps/web/public/strokes/${p.text}.json`,'utf8')));
  expect(data.strokes.length).toBe(data.medians.length);
  for(const median of data.medians){const path=sampleStroke(median);expect(path.length).toBeGreaterThan(2);expect(path.every(p=>p.every(Number.isFinite))).toBe(true);}
 }
 expect(readFileSync('apps/web/public/strokes/ARPHICPL.TXT','utf8')).toContain('ARPHIC PUBLIC LICENSE');
});
it('tolerates small deviations but rejects endpoint jumps, reverse starts and distant scribbles',()=>{
 const points=sampleStroke([[100,800],[500,400],[900,200]]);
 expect(canResumeStroke(points,0,points.at(-1)!)).toBe(false);
 expect(traceForward(points,0,points.at(-1)!)).toBe(0);
 expect(traceForward(points,0,[900,900])).toBe(0);
 let index=0;
 for(const [x,y]of points)index=traceForward(points,index,[x+8,y+8]);
 expect(index).toBe(points.length-1);
 expect(traceForward(points,index,points[0])).toBe(index);
 expect(canResumeStroke(points,10,points[10])).toBe(true);
});
it('derives journey steps from unique successful answers, not clicks, skips or other sessions',()=>{
 const steps=manifest.lessons[0].steps,ids=steps.filter((s:any)=>s.kind==='sound'||s.kind==='meaning').map((s:any)=>s.id);
 const base={session:'s',step:ids[0],correct:false,skipped:false} as Attempt;
 const attempts=[base,{...base,step:ids[1],correct:true},{...base,step:ids[1],correct:true},{...base,step:ids[2],retries:[{correct:true,skipped:false,selectedId:'ma',id:'r',timestamp:1}]},{...base,step:ids[3],skipped:true},{...base,session:'other',step:ids[4],correct:true}];
 const solved=guestSolvedSteps(attempts,'s');
 expect(guestSolvedSteps([...attempts,{...base,step:ids[5],correct:true,skipped:true}],'s')).toEqual(solved);
 expect(journeyProgress(steps,solved)).toEqual({total:6,solved:2});
 expect(journeyProgress(steps,[...ids,...ids,'unknown'])).toEqual({total:6,solved:6});
 expect(guestSolvedSteps(attempts,'new-replay')).toEqual([]);
 expect(base.correct).toBe(false);
});
