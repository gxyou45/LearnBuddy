import type {Lesson,Step} from '@learnbuddy/contracts';
import type {Attempt} from './progress';
import configurations from './lessonInteractions.json' with {type:'json'};
export const lessonInteractions = configurations;

// Original ten targets remain in the expanded configuration for v1 save compatibility.
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
/** Match stable lesson/character identities; catalog order does not restrict availability. */
export function interactionFor(releaseId:string,lesson:Lesson,catalog:readonly Lesson[]){
 if(releaseId!=='curriculum-1000-v1'||!catalog.some(l=>l.id===lesson.id))return undefined;
 const config=lessonInteractions.find(p=>p.lessonId===lesson.id);
 if(!config||!config.characters.every(target=>lesson.characters.some(c=>c.id===target.characterId&&c.text===target.text)))return undefined;
 return config;
}
export function guestSolvedSteps(attempts:readonly Attempt[],session:string){
 return [...new Set(attempts.filter(a=>{const last=a.retries?.at(-1)||a;return a.session===session&&last.correct&&!last.skipped;}).map(a=>a.step))];
}
export function journeyProgress(steps:readonly Step[],solvedSteps:readonly string[]){
 const ids=steps.filter(s=>s.kind==='sound'||s.kind==='meaning').map(s=>s.id);
 return {total:ids.length,solved:ids.filter(id=>solvedSteps.includes(id)).length};
}
