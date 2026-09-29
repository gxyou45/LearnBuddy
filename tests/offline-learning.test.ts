import {it,expect,beforeEach} from 'vitest';
import {installCatalog,installLesson} from '../apps/web/src/contentRepository';
import {catalogFixture,packageFixture} from './content-fixture';
import {localEvent,offlineKey,type OfflineRecord} from '../apps/web/src/offlineLearning';
import {syncBatchSchema,legacyProgressSchema,createHuntRound} from '@learnbuddy/contracts';
beforeEach(()=>{installCatalog(catalogFixture);installLesson(packageFixture('family'));});
function record():OfflineRecord{
 const session={id:'s',lessonId:'family',releaseId:'prototype-v4',mode:'lesson' as const,revision:0,stepIndex:7,stepId:'sound-wo',completed:false,huntFound:[],presentation:{id:'p',questionVersionId:'q',options:packageFixture('family').lesson.characters.map(({id,text,word,icon})=>({id,text,word,icon})),prompted:false,audioHeard:false,audioFailed:false,answer:null}};
 const progress={learnerId:'l',revision:10,releaseId:'prototype-v4',timeZone:'Asia/Shanghai',activeSessionId:'s',openAllCourses:false,sessions:[session],completedLessons:[],skills:[],characters:[],seen:[]};
 return {generation:1,confirmed:progress,view:progress,events:[],nextSeq:1,plan:{streamId:'stream',session,presentations:{},progress,nextSeq:1}};
}
it('offline feedback preserves confirmed state and never grants mastery',()=>{
 const original=record();const next=localEvent(original,{type:'answer',clientEventId:'e',sessionId:'s',expectedRevision:0,presentationId:'p',selectedId:'wo',skipped:false});
 expect(next.plan!.session.presentation!.answer!.correct).toBe(true);expect(next.plan!.session.presentation!.answer!.independent).toBe(false);
 expect(original.plan!.session.presentation!.answer).toBeNull();expect(next.confirmed.sessions[0].presentation!.answer).toBeNull();expect(next.view.revision).toBe(10);
});
it('offline corrections preserve the first wrong answer and survive the sync plan',()=>{
 let r=localEvent(record(),{type:'answer',clientEventId:'first',sessionId:'s',expectedRevision:0,presentationId:'p',selectedId:'ba',skipped:false});
 r=localEvent(r,{type:'audio',clientEventId:'again',sessionId:'s',expectedRevision:1,presentationId:'p',result:'played'});
 r=localEvent(r,{type:'retry-answer',clientEventId:'retry',sessionId:'s',expectedRevision:2,presentationId:'p',selectedId:'wo',skipped:false});
 expect(r.plan!.session.presentation!.answer!.correct).toBe(false);
 expect(r.plan!.presentations['sound-wo'].retries).toEqual([{selectedId:'wo',correct:true,skipped:false}]);
 expect(r.view.skills).toEqual([]);expect(r.confirmed.sessions[0].presentation!.answer).toBeNull();
 expect(()=>localEvent(r,{type:'retry-answer',clientEventId:'late',sessionId:'s',expectedRevision:3,presentationId:'p',selectedId:'ma',skipped:false})).toThrow();
});
it('offline hunt events retain their saved positions and do not change recognition evidence',()=>{
 const original=record(),pkg=packageFixture('family');
 original.view.seen=pkg.lesson.characters.map(c=>c.id);
 const round=createHuntRound(pkg.scene,pkg.assets.find(a=>a.id===pkg.scene.imageAssetId)!.sha256,pkg.lesson.characters,0,1,'round');
 Object.assign(original.plan!.session,{huntRound:round,stepIndex:13,stepId:'hunt',presentation:null});
 const next=localEvent(original,{type:'hunt',characterId:'wo',clientEventId:'hunt',sessionId:'s',expectedRevision:0});
 expect(next.plan!.session.huntRound).toEqual(round);expect(next.plan!.session.huntFound).toEqual(['wo']);
 expect(next.view.skills).toEqual(original.view.skills);expect(next.view.seen).toEqual(original.view.seen);
 expect(original.confirmed.sessions[0].huntFound).toEqual([]);
});
it('cannot advance without a recorded answer or into an unprepared question',()=>{
 expect(()=>localEvent(record(),{type:'advance',clientEventId:'e',sessionId:'s',expectedRevision:0})).toThrow('作答');
 const next=localEvent(record(),{type:'answer',clientEventId:'e',sessionId:'s',expectedRevision:0,presentationId:'p',selectedId:null,skipped:true});
 expect(()=>localEvent(next,{type:'advance',clientEventId:'f',sessionId:'s',expectedRevision:1})).toThrow('尚未缓存');
});
it('storage identity includes account and child; protocol rejects unbounded or forged batches',()=>{
 expect(offlineKey('a','c')).not.toBe(offlineKey('b','c'));expect(offlineKey('a','c')).not.toBe(offlineKey('a','d'));
 expect(syncBatchSchema.safeParse({streamId:'x',events:[]}).success).toBe(false);expect(legacyProgressSchema.safeParse({schemaVersion:99}).success).toBe(false);
});
it('an old offline homophone presentation is filtered without changing the confirmed snapshot',()=>{
 const original=record();
 const p=original.plan!.session.presentation!;
 p.options=[{id:'wo',text:'他',word:'他的',icon:''},{id:'ba',text:'她',word:'她的',icon:''},{id:'ma',text:'人',word:'人们',icon:''}];
 const next=localEvent(original,{type:'audio',clientEventId:'e',sessionId:'s',expectedRevision:0,presentationId:'p',result:'played'});
 expect(next.plan!.session.presentation!.options.map(o=>o.text)).toEqual(['他','人']);
 expect(next.plan!.session.presentation!.prompted).toBe(true);
 expect(original.plan!.session.presentation!.options).toHaveLength(3);
});
