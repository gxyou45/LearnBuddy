import {selectReviewItems,type ReviewCandidate} from '@learnbuddy/contracts';
import {characters,lessonForCharacter} from './contentRepository';
import {localDate,type Progress} from './progress';
export function guestReviewItems(p:Progress,today=localDate(),currentTargets?:readonly string[]){
 const candidates:ReviewCandidate[]=[];
 const known=new Set(characters.map(c=>c.id));
 for(const targetId of new Set(p.attempts.map(a=>a.characterId))){
  if(!known.has(targetId))continue;
  for(const kind of ['sound','meaning'] as const){
   const attempts=p.attempts.filter(a=>a.characterId===targetId&&a.kind===kind);
   const last=attempts.at(-1);if(!last)continue;
   const date=new Date(`${last.date}T12:00:00Z`);if(!Number.isFinite(date.getTime()))continue;
   date.setUTCDate(date.getUTCDate()+1);
   const good=attempts.slice(-6).filter(a=>a.correct&&!a.hintUsed&&!a.skipped);
   const stable=last.correct&&!last.hintUsed&&!last.skipped&&good.length>=3&&new Set(good.map(a=>a.date)).size>=2;
   candidates.push({targetId,kind,dueDate:date.toISOString().slice(0,10),wrongCount:attempts.filter(a=>!a.correct&&!a.hintUsed&&!a.skipped).length,status:stable?'stable':last.correct&&!last.hintUsed&&!last.skipped?'consolidating':'practice'});
  }
 }
 return selectReviewItems(candidates,today,currentTargets).map(item=>({...item,lessonId:lessonForCharacter(item.targetId).id}));
}
