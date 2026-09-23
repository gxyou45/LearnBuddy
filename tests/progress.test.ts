import { describe, expect, it } from 'vitest';
import { dueCharacters, canReadLesson, isUnlocked, startLesson, completedCount, fresh, localDate, parseProgress, record, status, type Attempt } from '../apps/web/src/progress';
const attempt = (patch: Partial<Attempt> = {}): Attempt => ({ id: 'a', session: 's', step: 'q', characterId: 'wo', kind: 'sound', correct: true, hintUsed: false, skipped: false, date: '2026-09-18', timestamp: 1, ...patch });
describe('learning evidence', () => {
  it('does not confuse a finished lesson with mastery', () => { expect(status({ ...fresh(), completed: true, seen: ['wo'] }, 'wo')).toBe('已接触'); });
  it('requires multiple days and task types, with an independently correct latest attempt', () => {
    const p = { ...fresh(), attempts: [attempt(), attempt({ id: 'b', step: 'q2', kind: 'meaning' }), attempt({ id: 'c', session: 's2', date: '2026-09-19' })] };
    expect(status(p,'wo')).toBe('较稳定');
    expect(status({ ...p, attempts: p.attempts.map(a => ({ ...a,date: '2026-09-18' })) },'wo')).toBe('练习中');
    expect(status({ ...p, attempts: p.attempts.map(a => ({ ...a,kind: 'sound' })) },'wo')).toBe('练习中');
    expect(status({ ...p, attempts: [...p.attempts,attempt({ id: 'd',hintUsed: true })] },'wo')).toBe('练习中');
  });
  it('does not count hints or skipped questions as independent success', () => { const p={...fresh(),attempts:[attempt(),attempt({id:'b',kind:'meaning',date:'2026-09-19',hintUsed:true}),attempt({id:'c',skipped:true})]};expect(status(p,'wo')).toBe('练习中'); });
  it('deduplicates repeated submissions to a task within a session', () => { const p = record(fresh(),attempt()); expect(record(p,attempt({id:'new'})).attempts).toHaveLength(1); });
  it('keeps only the last 30 records per character', () => { let p=fresh();for(let i=0;i<40;i++) p=record(p,attempt({id:`${i}`,session:`${i}`}));expect(p.attempts).toHaveLength(30); });
  it('schedules previous-day attempts, errors before correct answers', () => { const p={...fresh(),attempts:[attempt({characterId:'ba',correct:false}),attempt({id:'b'}),attempt({id:'c',characterId:'ma',date:'2026-09-19'})]};expect(dueCharacters(p,'2026-09-19').map(c=>c.id)).toEqual(['ba','wo']); });
});
describe('storage', () => {
  it('restores valid progress and preserves unsupported content for recovery', () => { expect(parseProgress(JSON.stringify({...fresh(),step:4})).step).toBe(4); expect(()=>parseProgress(JSON.stringify({...fresh(),contentVersion:0,step:4}))).toThrow(); });
  it('rejects corrupted or unsupported records without silently migrating them', () => { for(const raw of ['{', '{}', JSON.stringify({...fresh(),schemaVersion:2}),JSON.stringify({...fresh(),seen:['unknown']}),JSON.stringify({...fresh(),attempts:[{}]})]) expect(()=>parseProgress(raw)).toThrow(); });
  it('formats local calendar dates', () => { expect(localDate(new Date(2026,0,2,23,59))).toBe('2026-01-02'); });
});

it('migrates previous course progress without losing learning evidence',()=>{
  const old = {...fresh(),contentVersion:1,step:10,seen:['wo'],attempts:[attempt()],huntFound:undefined};
  const restored=parseProgress(JSON.stringify(old));
  expect(restored.step).toBe(14);expect(restored.huntFound).toEqual([]);expect(restored.attempts).toHaveLength(1);
  expect(parseProgress(JSON.stringify({...old,step:4})).step).toBe(7);
});
it('restores hunt discoveries and rejects invalid or repeated targets',()=>{
  expect(parseProgress(JSON.stringify({...fresh(),huntFound:['wo']})).huntFound).toEqual(['wo']);
  for(const huntFound of [['wo','wo'],['invalid'],null]) expect(()=>parseProgress(JSON.stringify({...fresh(),huntFound}))).toThrow();
});

describe('multiple lessons',()=>{
 it('unlocks sequentially without treating parent access as completion',()=>{
  let p=fresh();expect(isUnlocked(p,'home')).toBe(false);expect(startLesson(p,'home','s')).toEqual(p);
  p={...p,completed:true};expect(isUnlocked(p,'home')).toBe(true);expect(isUnlocked(p,'welcome')).toBe(false);
  expect(completedCount({...p,unlocked:['welcome']})).toBe(1);expect(isUnlocked({...p,unlocked:['welcome']},'welcome')).toBe(true);
 });
 it('keeps each lesson position, hunt and session separate across switching and reload',()=>{
  let p={...startLesson(fresh(),'family','first'),step:10,huntFound:['wo'],unlocked:['home']};
  p=startLesson(p,'home','second');expect(p.step).toBe(0);expect(p.huntFound).toEqual([]);
  p={...p,step:4};p=parseProgress(JSON.stringify(p));p=startLesson(p,'family','unused');
  expect(p.step).toBe(10);expect(p.huntFound).toEqual(['wo']);expect(p.session).toBe('first');
  p=startLesson(p,'home','unused');expect(p.step).toBe(4);expect(p.session).toBe('second');
 });
 it('replays a completed lesson without locking previously opened lessons or losing counts',()=>{
  let p={...fresh(),completed:true};p=startLesson(p,'home','second');p={...p,completed:true,started:false};
  p=startLesson(p,'family','replay');expect(completedCount(p)).toBe(2);expect(p.huntFound).toEqual([]);expect(isUnlocked(p,'welcome')).toBe(true);
 });
 it('migrates a real version-two single-lesson save and preserves completion and discoveries',()=>{
  const {activeLesson,lessonProgress,unlocked,...old}=fresh();
  const p=parseProgress(JSON.stringify({...old,contentVersion:2,completed:true,step:10,huntFound:['wo']}));
  expect(p.activeLesson).toBe('family');expect(completedCount(p)).toBe(1);expect(isUnlocked(p,'home')).toBe(true);expect(p.huntFound).toEqual(['wo']);
 });
});

it('migrates all v3 step positions and other lesson snapshots without losing evidence', () => {
 for (let step = 0; step < 12; step++) {
  const old = { ...fresh(), contentVersion: 3, started: true, step, session: 'keep', huntFound: ['wo'], attempts: [attempt()],
   lessonProgress: { home: { started: true, completed: false, step, session: 'home-keep', huntFound: ['jia'] } } };
  const p = parseProgress(JSON.stringify(old));
  expect(p.step).toBe(step >= 4 ? step + 3 : step);
  expect(p.lessonProgress.home.step).toBe(p.step);
  expect(p.lessonProgress.home.huntFound).toEqual(['jia']);
  expect(p.huntFound).toEqual(['wo']);
  expect(p.session).toBe('keep');
  expect(p.attempts).toEqual(old.attempts);
  expect(parseProgress(JSON.stringify(p))).toEqual(p);
 }
});
it('read-only access requires reaching that stage, completion, or explicit parent access', () => {
 const p = { ...fresh(), started: true, step: 3 };
 expect(canReadLesson(p, 'family', 'words')).toBe(false);
 expect(canReadLesson({ ...p, step: 4 }, 'family', 'words')).toBe(true);
 expect(canReadLesson({ ...p, step: 13 }, 'family', 'story')).toBe(false);
 expect(canReadLesson({ ...p, step: 14 }, 'family', 'story')).toBe(true);
 expect(canReadLesson({ ...p, completed: true }, 'family', 'words')).toBe(true);
 expect(canReadLesson({ ...p, completed: true }, 'home', 'words')).toBe(false);
 expect(canReadLesson({ ...p, unlocked: ['home'] }, 'home', 'words')).toBe(true);
 expect(canReadLesson(p, 'unknown', 'words')).toBe(false);
});
