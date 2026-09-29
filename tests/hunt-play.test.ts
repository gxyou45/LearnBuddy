import {beforeEach,it,expect,vi} from 'vitest';
import {createHash} from 'node:crypto';
import {huntTemplates,createPlayHuntRound,resolveHuntRound,huntTargetIds,huntRoundSchema,legacyProgressSchema} from '@learnbuddy/contracts';
import {enableHuntPlay} from '../apps/web/src/admin/HuntTemplatePicker';
import {validateManifest} from '@learnbuddy/contracts';
import {manifest,catalogFixture,packageFixture} from './content-fixture';
import {installCatalog,installLesson} from '../apps/web/src/contentRepository';
import {fresh,startLesson,parseProgress,serializeProgress} from '../apps/web/src/progress';
import {localEvent,type OfflineRecord} from '../apps/web/src/offlineLearning';
import {loadStaticCatalog,staticLessonPackage} from '../apps/web/src/staticContent';
const scenes=huntTemplates.map(t=>({...t,sha256:createHash('sha256').update(t.svg).digest('hex')}));
const targets=manifest.lessons[0].characters,pool=manifest.lessons.slice(1).flatMap((l:any)=>l.characters);
beforeEach(()=>{installCatalog(catalogFixture);installLesson(packageFixture('family'));});
it('creates deterministic 3-target rounds, alternates scenes and never uses lesson letters as distractors',()=>{
 let previous;const five=[...targets,...pool.slice(0,2)];
 for(let n=0;n<12;n++){
  const r=createPlayHuntRound(scenes,five,[...five,...pool],0,n,`r-${n}`,previous?.sceneId,previous);
  expect(r).toEqual(createPlayHuntRound(scenes,five,[...five,...pool],0,n,`r-${n}`,previous?.sceneId,previous));
  expect(r.sceneId).not.toBe(previous?.sceneId);expect(huntTargetIds(r,five)).toHaveLength(3);
  const resolved=resolveHuntRound(r,scenes.find(s=>s.id===r.sceneId)!,r.sceneVersion,five,pool);
  expect(resolved.filter(p=>!p.isTarget)).toHaveLength(n===0?2:3);
  expect(resolved.filter(p=>!p.isTarget).every(p=>!five.some(c=>c.id===p.characterId))).toBe(true);
  expect(new Set(resolved.map(p=>p.id)).size).toBe(resolved.length);previous=r;
 }
});
it('rejects insufficient pools, repeated glyphs, bad roles, stale scenes and illegal targets',()=>{
 expect(()=>createPlayHuntRound(scenes,targets,targets,0,0,'x')).toThrow(/Insufficient/);
 expect(()=>createPlayHuntRound(scenes.slice(0,1),targets,pool,0,0,'x')).toThrow(/Two/);
 const r=createPlayHuntRound(scenes,targets,pool,0,0,'x');
 expect(()=>resolveHuntRound(r,scenes.find(s=>s.id===r.sceneId)!,'a'.repeat(64),targets,pool)).toThrow(/version/);
 expect(()=>huntRoundSchema.parse({...r,placements:r.placements.map(p=>({...p,isTarget:true}))})).toThrow();
 expect(()=>resolveHuntRound(r,scenes.find(s=>s.id===r.sceneId)!,r.sceneVersion,targets,[])).toThrow();
 const duplicatePool=pool.map(c=>({...c,text:targets[0].text}));expect(()=>createPlayHuntRound(scenes,targets,duplicatePool,0,0,'x')).toThrow();
 expect(createPlayHuntRound(scenes,targets,pool,0,0,'x',undefined,undefined,4).placements).toHaveLength(7);
 const five=[...targets,...pool.slice(0,2)],alias={id:'alias',text:five[3].text};
 const forged=createPlayHuntRound(scenes,five,pool,0,0,'forged');
 const decoy=forged.placements.find(p=>'isTarget' in p&&!p.isTarget)!;decoy.characterId=alias.id;
 expect(()=>resolveHuntRound(forged,scenes.find(s=>s.id===forged.sceneId)!,forged.sceneVersion,five,[...pool,alias])).toThrow(/Unknown/);
});
it('guest and offline persistence retain the full round and reject distractor events',()=>{
 const round=createPlayHuntRound(scenes,targets,pool,0,0,'first');
 const p={...startLesson(fresh(),'family','first'),huntRound:round,huntFound:[targets[0].id],huntRecentScenes:{0:round.sceneId}};
 const restored=parseProgress(serializeProgress(p));expect(restored.huntRound).toEqual(round);expect(restored.huntFound).toEqual(p.huntFound);expect(restored.huntRecentScenes).toEqual(p.huntRecentScenes);expect(legacyProgressSchema.parse(p).huntRound).toEqual(round);
 const distractor=round.placements.find(p=>'isTarget' in p&&!p.isTarget)!.characterId;
 expect(()=>parseProgress(serializeProgress({...p,huntFound:[distractor]}))).toThrow();
 const s={id:'s',lessonId:'family',releaseId:manifest.releaseId,mode:'lesson' as const,revision:0,stepIndex:13,stepId:'hunt',completed:false,huntFound:[],huntRound:round,presentation:null};
 const progress={learnerId:'l',revision:0,releaseId:manifest.releaseId,timeZone:'Asia/Shanghai',activeSessionId:'s',openAllCourses:false,sessions:[s],completedLessons:[],skills:[],characters:[],seen:targets.map(c=>c.id)};
 const record:OfflineRecord={generation:1,confirmed:progress,view:progress,plan:{streamId:'stream',session:s,presentations:{},progress,nextSeq:1},events:[],nextSeq:1};
 const event={type:'hunt' as const,clientEventId:'e',sessionId:'s',expectedRevision:0,characterId:distractor};
 expect(()=>localEvent(record,event)).toThrow(/本局/);
 const result=localEvent(record,{...event,characterId:targets[0].id});expect(result.plan!.session.huntRound).toEqual(round);expect(result.confirmed).toEqual(progress);expect(result.view.skills).toEqual([]);
});
it('admin enables explicit scene and candidate pools without altering base scene or lessons',()=>{
 const m=structuredClone(manifest),base=structuredClone(m.huntScenes[0]);
 const assets=scenes.map(s=>({id:`image-hunt-${s.id}`,kind:'image' as const,sha256:s.sha256,bytes:Buffer.byteLength(s.svg),objectKey:`assets/images/${s.sha256}.svg`,mimeType:'image/svg+xml' as const,source:'test',reviewStatus:'pending' as const}));
 enableHuntPlay(m,base.id,assets);expect(()=>validateManifest(m)).not.toThrow();
 expect(m.lessons).toEqual(manifest.lessons);expect(m.huntScenes[0].slots).toEqual(base.slots);
 enableHuntPlay(m,base.id,assets);expect(m.huntScenes).toHaveLength(manifest.huntScenes.length+2);
 m.huntScenes[0].play.distractorIds=targets.map(c=>c.id);expect(()=>validateManifest(m)).toThrow();
});
it('static lesson packages retain both scene assets and the configured candidate pool',async()=>{
 const m=structuredClone(manifest);
 enableHuntPlay(m,m.huntScenes[0].id,scenes.map(s=>({id:`image-hunt-${s.id}`,kind:'image' as const,sha256:s.sha256,bytes:Buffer.byteLength(s.svg),objectKey:`assets/images/${s.sha256}.svg`,mimeType:'image/svg+xml' as const,source:'test',reviewStatus:'pending' as const})));
 vi.stubGlobal('fetch',vi.fn(async()=>({ok:true,json:async()=>m})));
 try{await loadStaticCatalog();const pkg=staticLessonPackage('family');expect(pkg.scenePool).toHaveLength(2);expect(pkg.huntCandidates).toHaveLength(15);expect(pkg.scenePool!.every(s=>pkg.assets.some(a=>a.id===s.imageAssetId))).toBe(true);installLesson(pkg);}finally{vi.unstubAllGlobals();}
});
