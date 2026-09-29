import {it,expect,vi} from 'vitest';
vi.mock('../apps/web/src/FamilyAccount',()=>({useFamily:()=>null}));
import {learningSettingsSchema,createPlayHuntRound,huntTemplates} from '@learnbuddy/contracts';
import {fresh,parseProgress,serializeProgress} from '../apps/web/src/progress';
import {manifest,catalogFixture,packageFixture} from './content-fixture';
import {installCatalog,installLesson} from '../apps/web/src/contentRepository';
import {projectCloud} from '../apps/web/src/CloudLearning';
it('uses each child cloud preference rather than another browser or child setting',()=>{
 installCatalog(catalogFixture);installLesson(packageFixture('family'));
 const state={learnerId:'child',revision:0,releaseId:manifest.releaseId,timeZone:'Asia/Shanghai',activeSessionId:null,openAllCourses:false,sessions:[],completedLessons:[],skills:[],characters:[],seen:[]};
 for(const count of [null,2,4] as const)expect(projectCloud({...state,huntDistractorCount:count},{...fresh(),huntDistractorCount:4}).huntDistractorCount).toBe(count);
 expect(projectCloud(state,{...fresh(),huntDistractorCount:4}).huntDistractorCount).toBeNull();
});
it('accepts partial settings and rejects unsupported difficulty values',()=>{
 for(const count of [null,2,4])expect(learningSettingsSchema.parse({huntDistractorCount:count})).toEqual({huntDistractorCount:count});
 expect(learningSettingsSchema.parse({openAllCourses:false})).toEqual({openAllCourses:false});
 for(const input of [{},{huntDistractorCount:3},{huntDistractorCount:'2'},{huntDistractorCount:0},{other:true}])expect(()=>learningSettingsSchema.parse(input)).toThrow();
});
it('keeps saved rounds intact while next rounds use the preference',()=>{
 installCatalog(catalogFixture);installLesson(packageFixture('family'));
 const scenes=huntTemplates.map(t=>({...t,sha256:'a'.repeat(64)})),targets=manifest.lessons[0].characters,pool=manifest.lessons.slice(1).flatMap(l=>l.characters);
 const round=createPlayHuntRound(scenes,targets,pool,0,0,'first');
 for(const count of [null,2,4] as const){
  const p=parseProgress(serializeProgress({...fresh(),huntRound:round,huntRoundIndex:0,huntDistractorCount:count}));
  expect(p.huntRound).toEqual(round);expect(p.huntDistractorCount).toBe(count);
  expect(createPlayHuntRound(scenes,targets,pool,0,1,'next',round.sceneId,round,p.huntDistractorCount??undefined).placements).toHaveLength(3+(count??3));
 }
 expect(parseProgress(serializeProgress(fresh())).huntDistractorCount).toBeUndefined();
 expect(()=>parseProgress(serializeProgress({...fresh(),huntDistractorCount:3} as any))).toThrow();
});
