export const RULE_VERSION=2;
export type Evidence={timeTrusted?:boolean;correct:boolean;prompted:boolean;skipped:boolean;audioHeard:boolean;audioFailed:boolean;skillType:string|null;createdAt:Date};
export function dayInZone(date:Date,zone:string) {
 const parts=new Intl.DateTimeFormat('en-US',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date);
 const part=(type:string)=>parts.find(p=>p.type===type)!.value;
 return `${part('year')}-${part('month')}-${part('day')}`;
}
export function nextDay(day:string){const d=new Date(`${day}T12:00:00Z`);d.setUTCDate(d.getUTCDate()+1);return d.toISOString().slice(0,10);}
export function independent(a:Evidence){return !a.prompted&&!a.skipped&&!a.audioFailed&&(a.skillType!=='sound'||a.audioHeard);}
export function skillStatus(recent:Evidence[],zone:string) {
 const valid=recent.filter(a=>a.timeTrusted!==false&&independent(a));const good=valid.filter(a=>a.correct);
 if(!valid.length||!valid[0].correct)return 'practice';
 return good.length>=3&&new Set(good.map(a=>dayInZone(a.createdAt,zone))).size>=2?'stable':'consolidating';
}
export function characterStable(recent:Evidence[],zone:string) {
 const good=recent.filter(a=>a.correct&&a.timeTrusted!==false&&independent(a));
 return !!recent.length&&recent[0].correct&&recent[0].timeTrusted!==false&&independent(recent[0])&&good.length>=3&&new Set(good.map(a=>a.skillType)).size>=2&&new Set(good.map(a=>dayInZone(a.createdAt,zone))).size>=2;
}
