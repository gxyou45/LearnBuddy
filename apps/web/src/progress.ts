import { characters, contentVersion, releaseId, getSteps, steps, lessons, type CharacterId } from './contentRepository';
export const STORAGE_KEY = 'learnbuddy:v1:progress';
export type Attempt = { id: string; session: string; step: string; characterId: CharacterId; kind: 'sound' | 'meaning'; correct: boolean; hintUsed: boolean; skipped: boolean; date: string; timestamp: number };
export type LessonProgress = { stepId?: string; started: boolean; completed: boolean; step: number; session: string; huntFound: CharacterId[] };
export type Progress = { releaseId?: string; stepId?: string; activeLesson: string; lessonProgress: Record<string, LessonProgress>; unlocked: string[]; schemaVersion: 1; contentVersion: number; started: boolean; completed: boolean; step: number; session: string; sound: boolean; attempts: Attempt[]; seen: CharacterId[]; huntFound: CharacterId[]; observations: Partial<Record<CharacterId, string>> };
export const fresh = (): Progress => ({ releaseId, activeLesson: lessons[0]?.id ?? 'family', lessonProgress: {}, unlocked: [], schemaVersion: 1, contentVersion, started: false, completed: false, step: 0, session: '', sound: true, attempts: [], seen: [], huntFound: [], observations: {} });
export function localDate(d = new Date()) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }

export function parseProgress(raw: string | null): Progress {
  if (!raw) return fresh();
  const p = JSON.parse(raw) as Progress;
  const charIds=characters.map(c=>c.id);
  if(p.releaseId && p.releaseId!==releaseId) throw new Error('Content release mismatch');
  if (p.schemaVersion !== 1 || typeof p.started !== 'boolean' || typeof p.completed !== 'boolean' || typeof p.sound !== 'boolean' || typeof p.session !== 'string' || !Number.isInteger(p.step) || p.step < 0 || !Array.isArray(p.attempts) || !Array.isArray(p.seen) || !p.observations || typeof p.observations !== 'object') throw new Error('Invalid progress');
  if (!p.seen.every(x => charIds.includes(x)) || !p.attempts.every(a => a && typeof a.id === 'string' && typeof a.session === 'string' && typeof a.step === 'string' && charIds.includes(a.characterId) && ['sound','meaning'].includes(a.kind) && typeof a.correct === 'boolean' && typeof a.hintUsed === 'boolean' && typeof a.skipped === 'boolean' && /^\d{4}-\d{2}-\d{2}$/.test(a.date) && Number.isFinite(a.timestamp))) throw new Error('Invalid attempts');
  if (p.huntFound === undefined) p.huntFound = [];
  if (!Array.isArray(p.huntFound) || !p.huntFound.every(id => charIds.includes(id)) || new Set(p.huntFound).size !== p.huntFound.length) throw new Error('Invalid hunt progress');
  if (p.activeLesson === undefined) p.activeLesson = 'family';
  if (p.lessonProgress === undefined) p.lessonProgress = {};
  if (p.unlocked === undefined) p.unlocked = [];
  if (!lessons.some(l => l.id === p.activeLesson) || !p.lessonProgress || typeof p.lessonProgress !== 'object' || Array.isArray(p.lessonProgress) || !Array.isArray(p.unlocked) || !p.unlocked.every(id => lessons.some(l => l.id === id))) throw new Error('Invalid course progress');
  for (const [id, entry] of Object.entries(p.lessonProgress)) {
    if (!lessons.some(l => l.id === id) || !entry || typeof entry.started !== 'boolean' || typeof entry.completed !== 'boolean' || !Number.isInteger(entry.step) || entry.step < 0 || entry.step >= (getSteps(lessons.find(l=>l.id===id)!).length || steps.length) || typeof entry.session !== 'string' || !Array.isArray(entry.huntFound) || new Set(entry.huntFound).size !== entry.huntFound.length || !entry.huntFound.every(c => lessons.find(l => l.id === id)!.characters.some(x => x.id === c))) throw new Error('Invalid lesson state');
  }
  if (!p.huntFound.every(c => lessons.find(l => l.id === p.activeLesson)!.characters.some(x => x.id === c))) throw new Error('Invalid current hunt');
  // Resolve each legacy position to the same activity after inserting word steps.
  // v1: intro, teach x3, sound x3, meaning x3, story.
  // v2/v3: the same with hunt before story. v4 inserts word x3 at index 4.
  if ([1, 2, 3].includes(p.contentVersion)) {
    const version = p.contentVersion;
    const migrateStep = (step: number) => {
      const oldCount = version === 1 ? 11 : 12;
      if (step >= oldCount) return 0;
      if (version === 1 && step === 10) return 14;
      return step >= 4 ? step + 3 : step;
    };
    return { ...p, contentVersion, step: migrateStep(p.step), lessonProgress: Object.fromEntries(
      Object.entries(p.lessonProgress).map(([id, entry]) => [id, { ...entry, step: migrateStep(entry.step) }]),
    ) };
  }
  if (p.contentVersion !== contentVersion) throw new Error('Unsupported content version');
  if(p.releaseId && p.stepId){const index=getSteps(lessons.find(l=>l.id===p.activeLesson)!).findIndex(s=>s.id===p.stepId);if(index<0)throw new Error('Unknown step');p.step=index;}
  for(const [id,state] of Object.entries(p.lessonProgress))if(p.releaseId&&state.stepId){const index=getSteps(lessons.find(l=>l.id===id)!).findIndex(s=>s.id===state.stepId);if(index<0)throw new Error('Unknown step');state.step=index;}
  if(p.step>=getSteps(lessons.find(l=>l.id===p.activeLesson)!).length)throw new Error('Invalid step');
  return p;
}
export function record(p: Progress, a: Attempt): Progress {
  if (p.attempts.some(x => x.id === a.id || (x.session === a.session && x.step === a.step))) return p;
  const all = [...p.attempts, a];
  return { ...p, attempts: all.filter(x => all.filter(y => y.characterId === x.characterId).slice(-30).includes(x)) };
}
export function status(p: Progress, id: CharacterId) {
  const attempts = p.attempts.filter(a => a.characterId === id).slice(-6);
  const good = attempts.filter(a => a.correct && !a.hintUsed && !a.skipped);
  if (good.length >= 3 && new Set(good.map(a => a.date)).size >= 2 && new Set(good.map(a => a.kind)).size >= 2 && attempts.at(-1)?.correct && !attempts.at(-1)?.hintUsed && !attempts.at(-1)?.skipped) return '较稳定';
  return attempts.length ? '练习中' : p.seen.includes(id) ? '已接触' : '未开始';
}
export function dueCharacters(p: Progress, today = localDate()) {
  return characters.filter(c => { const last = p.attempts.filter(a => a.characterId === c.id).at(-1); return last && last.date < today; }).sort((a,b) => {
    const x = p.attempts.filter(t => t.characterId === a.id).at(-1)!; const y = p.attempts.filter(t => t.characterId === b.id).at(-1)!;
    return Number(x.correct)-Number(y.correct) || x.timestamp-y.timestamp;
  });
}

export function lessonState(p: Progress, id: string): LessonProgress {
  if (id === p.activeLesson) return { started: p.started, completed: p.completed, step: p.step, session: p.session, huntFound: p.huntFound };
  return p.lessonProgress[id] || { started: false, completed: false, step: 0, session: '', huntFound: [] };
}
export function isUnlocked(p: Progress, id: string) {
  const index = lessons.findIndex(l => l.id === id);
  return index >= 0 && (index === 0 || p.unlocked.includes(id) || lessonState(p,id).completed || lessonState(p,lessons[index-1].id).completed);
}
export function startLesson(p: Progress, id: string, session: string): Progress {
  if (!isUnlocked(p,id)) return p;
  const saved = lessonState(p,id);
  return { ...p, lessonProgress: { ...p.lessonProgress, [p.activeLesson]: lessonState(p,p.activeLesson) }, activeLesson: id,
    ...saved, started: true, step: saved.started ? saved.step : 0, session: saved.started ? saved.session : session, huntFound: saved.started ? saved.huntFound : [] };
}
export function completedCount(p: Progress) { return lessons.filter(l => lessonState(p,l.id).completed).length; }
export function recommendedLesson(p: Progress) {
  if (p.started) return lessons.find(l => l.id === p.activeLesson)!;
  return lessons.find(l => !lessonState(p,l.id).completed && isUnlocked(p,l.id)) || lessons[0];
}

/** Read-only shortcuts never advance a lesson or add recognition evidence. */
export function canReadLesson(p: Progress, id: string, kind: 'words' | 'story') {
  if (!isUnlocked(p, id)) return false;
  const state = lessonState(p, id);
  const threshold=getSteps(lessons.find(l=>l.id===id)!).findIndex(s=>s.kind===(kind==='words'?'word':'story'));
  return threshold>=0 && (state.completed || p.unlocked.includes(id) || (state.started && state.step>=threshold));
}

export function serializeProgress(p:Progress) {
 const stepId=getSteps(lessons.find(l=>l.id===p.activeLesson)!)[p.step]?.id;
 return JSON.stringify({...p,releaseId,stepId,lessonProgress:Object.fromEntries(Object.entries(p.lessonProgress).map(([id,state])=>[id,{...state,stepId:getSteps(lessons.find(l=>l.id===id)!)[state.step]?.id}]))});
}
