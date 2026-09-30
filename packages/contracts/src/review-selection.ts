export type ReviewCandidate={targetId:string;kind:'sound'|'meaning';dueDate:string;wrongCount:number;status:'practice'|'consolidating'|'stable'};
// Pure selection shared by cloud and guest adapters. Selection never writes evidence.
export function selectReviewItems<T extends ReviewCandidate>(candidates:readonly T[],today:string,currentTargets?:readonly string[]):T[]{
 const priority={practice:0,consolidating:1,stable:2};
 const compare=(a:T,b:T)=>priority[a.status]-priority[b.status]||b.wrongCount-a.wrongCount||a.dueDate.localeCompare(b.dueDate)||a.targetId.localeCompare(b.targetId)||a.kind.localeCompare(b.kind);
 const unique=(items:readonly T[],limit:number)=>{
  const seen=new Set<string>();
  return [...items].sort(compare).filter(item=>{if(seen.has(item.targetId))return false;seen.add(item.targetId);return true;}).slice(0,limit);
 };
 if(!currentTargets)return unique(candidates.filter(item=>item.dueDate<=today),5);
 const own=new Set(currentTargets);
 return [...unique(candidates.filter(item=>own.has(item.targetId)),2),...unique(candidates.filter(item=>!own.has(item.targetId)&&(item.dueDate<=today||(item.status!=='stable'&&item.wrongCount>0))),3)];
}
