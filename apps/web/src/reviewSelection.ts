import {selectReviewItems,reviewSchedule,reviewCooling,type ReviewCandidate} from '@learnbuddy/contracts';
import {characters,lessonForCharacter} from './contentRepository';
import {localDate,type Progress} from './progress';
export function guestReviewItems(p:Progress,today=localDate(),currentTargets?:readonly string[]){
 const candidates:ReviewCandidate[]=[];
 const known=new Set(characters.map(c=>c.id));
 const cooling=new Set(p.attempts.filter(a=>reviewCooling({day:a.date,review:a.step.startsWith('review-'),correct:a.correct,prompted:a.hintUsed,skipped:a.skipped},today)).map(a=>a.characterId));
 for(const targetId of new Set(p.attempts.map(a=>a.characterId))){
  if(!known.has(targetId)||cooling.has(targetId))continue;
  for(const kind of ['sound','meaning'] as const){
   const attempts=p.attempts.filter(a=>a.characterId===targetId&&a.kind===kind);
   const last=attempts.at(-1);if(!last)continue;
   const date=new Date(`${last.date}T12:00:00Z`);if(!Number.isFinite(date.getTime()))continue;
   const {dueDate}=reviewSchedule(attempts.map(a=>({day:a.date,correct:a.correct,prompted:a.hintUsed,skipped:a.skipped,usable:a.scheduleUsable??a.kind==='meaning',trusted:true})),attempts[0].date);
   const good=attempts.slice(-6).filter(a=>a.correct&&!a.hintUsed&&!a.skipped);
   const stable=last.correct&&!last.hintUsed&&!last.skipped&&good.length>=3&&new Set(good.map(a=>a.date)).size>=2;
   candidates.push({targetId,kind,dueDate,wrongCount:attempts.filter(a=>!a.correct&&!a.hintUsed&&!a.skipped).length,status:stable?'stable':last.correct&&!last.hintUsed&&!last.skipped?'consolidating':'practice'});
  }
 }
 return selectReviewItems(candidates,today,currentTargets).map(item=>({...item,lessonId:lessonForCharacter(item.targetId).id}));
}
