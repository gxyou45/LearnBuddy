import {it,expect,beforeEach} from 'vitest';
import {fresh,record,recordRetry,parseProgress,serializeProgress,status,type Attempt} from '../apps/web/src/progress';
import {installCatalog,installLesson} from '../apps/web/src/contentRepository';
import {catalogFixture,packageFixture} from './content-fixture';
import {legacyProgressSchema} from '@learnbuddy/contracts';
beforeEach(()=>{installCatalog(catalogFixture);installLesson(packageFixture('family'));});
const first:Attempt={id:'first',session:'session',step:'sound-wo',characterId:'wo',kind:'sound',correct:false,hintUsed:false,skipped:false,date:'2026-09-29',timestamp:1,selectedId:'ba'};
it('preserves first evidence, stores corrections and survives refresh/import parsing',()=>{
 let p=record(fresh(),first);
 p=recordRetry(p,{...first,id:'second',selectedId:'ma',timestamp:2});
 p=recordRetry(p,{...first,id:'third',selectedId:'wo',correct:true,timestamp:3});
 expect(p.attempts).toHaveLength(1);expect(p.attempts[0].correct).toBe(false);
 expect(p.attempts[0].selectedId).toBe('ba');expect(p.attempts[0].retries?.map(r=>r.correct)).toEqual([false,true]);
 expect(status(p,'wo')).toBe('练习中');
 expect(parseProgress(serializeProgress(p)).attempts).toEqual(p.attempts);
 expect(legacyProgressSchema.parse(JSON.parse(serializeProgress(p))).attempts).toEqual(p.attempts);
 expect(recordRetry(p,{...first,id:'late',correct:true,selectedId:'wo'})).toBe(p);
});
it('ignores duplicate retry IDs and cannot retry without a wrong initial answer',()=>{
 const empty=fresh();expect(recordRetry(empty,first)).toBe(empty);
 let p=record(empty,first);const retry={...first,id:'retry',selectedId:'ma'};p=recordRetry(p,retry);
 expect(recordRetry(p,retry)).toBe(p);
 expect(()=>parseProgress(JSON.stringify({...p,attempts:[{...p.attempts[0],correct:true}]}))).toThrow();
});
