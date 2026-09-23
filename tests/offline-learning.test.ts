import {it,expect,beforeEach} from 'vitest';
import {installCatalog,installLesson} from '../apps/web/src/contentRepository';
import {catalogFixture,packageFixture} from './content-fixture';
import {localEvent,offlineKey,type OfflineRecord} from '../apps/web/src/offlineLearning';
import {syncBatchSchema,legacyProgressSchema} from '@learnbuddy/contracts';
beforeEach(()=>{installCatalog(catalogFixture);installLesson(packageFixture('family'));});
function record():OfflineRecord{
 const session={id:'s',lessonId:'family',releaseId:'prototype-v4',mode:'lesson' as const,revision:0,stepIndex:7,stepId:'sound-wo',completed:false,huntFound:[],presentation:{id:'p',questionVersionId:'q',options:[],prompted:false,audioHeard:false,audioFailed:false,answer:null}};
 const progress={learnerId:'l',revision:10,releaseId:'prototype-v4',timeZone:'Asia/Shanghai',activeSessionId:'s',openAllCourses:false,sessions:[session],completedLessons:[],skills:[],characters:[],seen:[]};
 return {generation:1,confirmed:progress,view:progress,events:[],nextSeq:1,plan:{streamId:'stream',session,presentations:{},progress,nextSeq:1}};
}
it('offline feedback preserves confirmed state and never grants mastery',()=>{
 const original=record();const next=localEvent(original,{type:'answer',clientEventId:'e',sessionId:'s',expectedRevision:0,presentationId:'p',selectedId:'wo',skipped:false});
 expect(next.plan!.session.presentation!.answer!.correct).toBe(true);expect(next.plan!.session.presentation!.answer!.independent).toBe(false);
 expect(original.plan!.session.presentation!.answer).toBeNull();expect(next.confirmed.sessions[0].presentation!.answer).toBeNull();expect(next.view.revision).toBe(10);
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
