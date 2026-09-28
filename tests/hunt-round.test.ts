import {beforeEach,expect,it} from 'vitest';
import {createHuntRound,resolveHuntRound,legacyProgressSchema} from '@learnbuddy/contracts';
import {fresh,startLesson,parseProgress,serializeProgress} from '../apps/web/src/progress';
import {installCatalog,installLesson} from '../apps/web/src/contentRepository';
import {catalogFixture,packageFixture} from './content-fixture';
const pkg=packageFixture('family'),scene=pkg.scene,targets=pkg.lesson.characters;
const sha=pkg.assets.find(a=>a.id===scene.imageAssetId)!.sha256;
beforeEach(()=>{installCatalog(catalogFixture);installLesson(packageFixture('family'));});
it('replays deterministically move all targets with no overlap or missing targets',()=>{
 for(let n=0;n<20;n++){
  const a=createHuntRound(scene,sha,targets,2,n,`round-${n}`),b=createHuntRound(scene,sha,targets,2,n+1,`round-${n+1}`);
  expect(a).toEqual(createHuntRound(scene,sha,targets,2,n,`round-${n}`));
  expect(new Set(a.placements.map(p=>p.slotId)).size).toBe(targets.length);
  expect(a.placements.every((p,i)=>p.slotId!==b.placements[i].slotId)).toBe(true);
  const places=resolveHuntRound(a,scene,sha,targets);expect(places.every(p=>p.clue===scene.slots.find(s=>s.id===p.id)?.clue)).toBe(true);
 }
});
it('rejects stale images, foreign targets, duplicate slots and insufficient space',()=>{
 const round=createHuntRound(scene,sha,targets,0,0,'one');
 expect(()=>resolveHuntRound(round,scene,'a'.repeat(64),targets)).toThrow(/version/);
 expect(()=>resolveHuntRound({...round,placements:round.placements.map(p=>({...p,slotId:round.placements[0].slotId}))},scene,sha,targets)).toThrow();
 expect(()=>resolveHuntRound({...round,placements:[{...round.placements[0],characterId:'unknown'},...round.placements.slice(1)]},scene,sha,targets)).toThrow();
 expect(()=>createHuntRound({...scene,slots:scene.slots.slice(0,2)},sha,targets,0,0,'one')).toThrow();
});
it('even a changed lesson order cannot accidentally repeat the previous layout',()=>{
 const old=createHuntRound(scene,sha,targets,1,0,'old');
 const next=createHuntRound(scene,sha,targets,0,1,'next',old);
 expect(next.placements.every((p,i)=>p.slotId!==old.placements[i].slotId)).toBe(true);
});
it('guest refresh, lesson switching, replay and import preserve the complete round',()=>{
 let p=startLesson(fresh(),'family','first');
 expect(p.huntRoundIndex).toBe(0);
 p={...p,huntRound:createHuntRound(scene,sha,targets,0,p.huntRoundIndex!,'first'),huntFound:['wo'],unlocked:['home']};
 const original=p.huntRound;
 p=parseProgress(serializeProgress(p));expect(p.huntRound).toEqual(original);expect(legacyProgressSchema.parse(p).huntRound).toEqual(original);
 p=startLesson(p,'home','second');expect(p.huntRound).toBeUndefined();
 p=startLesson(p,'family','unused');expect(p.huntRound).toEqual(original);expect(p.huntFound).toEqual(['wo']);
 const replay=startLesson({...p,started:false,completed:true},'family','third');
 expect(replay.huntRoundIndex).toBe(1);expect(replay.huntRound).toBeUndefined();expect(replay.huntFound).toEqual([]);expect(replay.attempts).toEqual(p.attempts);expect(replay.seen).toEqual(p.seen);
});
it('old in-progress saves keep the legacy layout; their next round moves positions',()=>{
 const legacy={...fresh(),started:true,session:'old',huntFound:['wo']};
 const restored=startLesson(parseProgress(JSON.stringify(legacy)),'family','ignored');
 expect(restored.huntRoundIndex).toBeUndefined();expect(restored.huntRound).toBeUndefined();expect(restored.huntFound).toEqual(['wo']);
 expect(startLesson({...restored,started:false,completed:true},'family','new').huntRoundIndex).toBe(1);
});
