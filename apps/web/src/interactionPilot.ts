import type {Lesson,Step} from '@learnbuddy/contracts';
import type {Attempt} from './progress';

// Fixed against the curriculum-1000-v1 directory, not an ID sort or a rolling slice.
export const interactionPilot = [
 {lessonId:'family',characterId:'ma',text:'妈'},
 {lessonId:'home',characterId:'ren',text:'人'},
 {lessonId:'welcome',characterId:'lai',text:'来'},
 {lessonId:'pets',characterId:'xiao',text:'小'},
 {lessonId:'snack',characterId:'shui',text:'水'},
 {lessonId:'pond',characterId:'niao',text:'鸟'},
 {lessonId:'basket',characterId:'you',text:'有'},
 {lessonId:'sky',characterId:'shan',text:'山'},
 {lessonId:'plants',characterId:'mu',text:'木'},
 {lessonId:'positions',characterId:'da',text:'大'},
] as const;
export function pilotFor(releaseId:string,lesson:Lesson,catalog:readonly Lesson[]){
 if(releaseId!=='curriculum-1000-v1'||interactionPilot.some((p,i)=>catalog[i]?.id!==p.lessonId))return undefined;
 return interactionPilot.find(p=>p.lessonId===lesson.id&&lesson.characters.some(c=>c.id===p.characterId&&c.text===p.text));
}
export function guestSolvedSteps(attempts:readonly Attempt[],session:string){
 return [...new Set(attempts.filter(a=>{const last=a.retries?.at(-1)||a;return a.session===session&&last.correct&&!last.skipped;}).map(a=>a.step))];
}
export function journeyProgress(steps:readonly Step[],solvedSteps:readonly string[]){
 const ids=steps.filter(s=>s.kind==='sound'||s.kind==='meaning').map(s=>s.id);
 return {total:ids.length,solved:ids.filter(id=>solvedSteps.includes(id)).length};
}
