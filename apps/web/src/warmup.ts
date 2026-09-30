import type {LessonProgress} from './progress';

// Input is the shared, already-due review queue. Do not manufacture extra work.
export function warmupItems<T extends {targetId:string}>(items:readonly T[]):T[]{
 return items.filter((item,index)=>items.findIndex(other=>other.targetId===item.targetId)===index).slice(0,2);
}
export function shouldOfferWarmup(state:Pick<LessonProgress,'started'|'completed'>,count:number){
 return !state.started&&!state.completed&&count>0;
}
