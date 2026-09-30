/** Trial scheduling parameters, independent of mastery. Dates are learner-local YYYY-MM-DD. */
export type ReviewEvidence={day:string;correct:boolean;prompted:boolean;skipped:boolean;usable:boolean;trusted:boolean};
export function addReviewDays(day:string,days:number):string{
 const date=new Date(`${day}T12:00:00Z`);date.setUTCDate(date.getUTCDate()+days);
 return date.toISOString().slice(0,10);
}
export function reviewSchedule(evidence:readonly ReviewEvidence[],fallbackDay:string){
 let level=0,dueDate=addReviewDays(fallbackDay,1);
 const days=new Map<string,{good:boolean;reset:boolean}>();
 for(const a of evidence){
  if(!a.trusted||a.skipped||!a.usable)continue;
  const day=days.get(a.day)??{good:false,reset:false};
  day.reset ||= a.prompted||!a.correct;
  day.good ||= a.correct&&!a.prompted;
  days.set(a.day,day);
 }
 let practiced=false;
 for(const [day,result] of [...days].sort(([a],[b])=>a.localeCompare(b))){
  // A later same-day retry cannot erase a mistake or create another spacing step.
  if(result.reset){level=0;dueDate=addReviewDays(day,1);practiced=true;}
  else if(result.good&&(!practiced||day>=dueDate)){
   level=Math.min(level+1,3);dueDate=addReviewDays(day,[1,1,3,7][level]);practiced=true;
  }
 }
 return {level,dueDate};
}
/** Any answered review task, or a lesson error/help, rests for the local day. */
export function reviewCooling(a:{day:string;review:boolean;correct:boolean;prompted:boolean;skipped:boolean},today:string){
 return a.day===today&&(a.review||(!a.skipped&&(!a.correct||a.prompted)));
}
