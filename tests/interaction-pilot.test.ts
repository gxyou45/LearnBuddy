import {it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {interactionPilot,lessonInteractions,interactionFor,journeyProgress,guestSolvedSteps} from '../apps/web/src/interactionPilot';
import {strokeData} from '../apps/web/src/strokeData';
import {sampleStroke,traceForward,canResumeStroke} from '../apps/web/src/traceGeometry';
import type {Attempt} from '../apps/web/src/progress';
const manifest=JSON.parse(readFileSync('apps/web/public/static-content/manifest.json','utf8'));
const design=JSON.parse(readFileSync('课程设计/1000字课程.json','utf8'));
const fullCatalog=[...manifest.lessons.slice(0,10),...design.lessons.slice(6).map((l:any)=>({id:l.id.toLowerCase(),characters:l.targets.map((text:string)=>({id:`han-${text.codePointAt(0)!.toString(16)}`,text}))}))];
it('covers all 204 lessons with two own characters, retaining the ten original targets',()=>{
 expect(fullCatalog).toHaveLength(204);
 expect(lessonInteractions.map(l=>l.lessonId)).toEqual(fullCatalog.map(l=>l.id));
 for(const lesson of fullCatalog){
  const interaction=interactionFor(manifest.releaseId,lesson,fullCatalog)!;
  expect(interaction.characters).toHaveLength(2);
  expect(new Set(interaction.characters.map(c=>c.characterId)).size).toBe(2);
  for(const c of interaction.characters)expect(strokeData[c.text]).toBeDefined();
 }
 for(const old of interactionPilot)expect(lessonInteractions.find(l=>l.lessonId===old.lessonId)!.characters).toContainEqual({characterId:old.characterId,text:old.text});
 for(const lesson of manifest.lessons)expect(interactionFor(manifest.releaseId,lesson,manifest.lessons)).toBeDefined();
 expect(interactionFor('other-release',manifest.lessons[0],manifest.lessons)).toBeUndefined();
 expect(interactionFor(manifest.releaseId,{...manifest.lessons[0],characters:[]},manifest.lessons)).toBeUndefined();
 expect(interactionFor(manifest.releaseId,manifest.lessons[0],[...manifest.lessons].reverse())).toBeDefined();
});
it('ships 408 unmodified original records; every stroke can be traced and has a valid outline',()=>{
 expect(Object.keys(strokeData)).toHaveLength(408);
 for(const [text,data] of Object.entries(strokeData)){
  expect(data).toEqual(JSON.parse(readFileSync(`apps/web/public/strokes/${text}.json`,'utf8')));
  expect(data.strokes.length).toBe(data.medians.length);
  for(const [i,median] of data.medians.entries()){
   expect(data.strokes[i]).toMatch(/^M /);
   const path=sampleStroke(median);expect(path.length).toBeGreaterThan(2);
   expect(path.every(p=>p.every(Number.isFinite))).toBe(true);
   let cursor=0;for(const point of path)cursor=traceForward(path,cursor,point);
   expect(cursor).toBe(path.length-1);
  }
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
